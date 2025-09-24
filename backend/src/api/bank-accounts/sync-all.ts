import { Request, Response } from 'express';
import { BankService } from '../../services/bank.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface AccountSync {
  accountId: string;
  accountName: string;
  syncId: string;
  status: 'initiated' | 'skipped' | 'failed';
}

export interface BulkSyncResponse {
  message: string;
  accountSyncs: AccountSync[];
}

export async function syncAllBankAccounts(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7);

    let familyId: string;
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId || !decoded.id) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Sync all bank accounts for the family
      const syncResult = await BankService.syncAllBankAccounts(familyId);

      // Format the response to match the API contract
      const accountSyncs: AccountSync[] = syncResult.results.map((result) => ({
        accountId: result.accountId,
        accountName: `Account ${result.accountId.slice(-4)}`, // Mock account name
        syncId: 'sync-' + Math.random().toString(36).substr(2, 9),
        status: result.status === 'success' ? 'initiated' : result.status === 'error' ? 'failed' : 'skipped',
      }));

      const response: BulkSyncResponse = {
        message: `Sync initiated for ${syncResult.successCount} of ${syncResult.totalAccounts} accounts.`,
        accountSyncs,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Sync all bank accounts error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not authorized') || serviceError.message.includes('permissions')) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to sync bank accounts.',
          });
        }

        if (serviceError.message.includes('rate limit') || serviceError.message.includes('too many')) {
          return res.status(429).json({
            error: 'Sync rate limit exceeded',
            message: 'Too many sync requests. Please wait before trying again.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to sync bank accounts',
        message: 'Failed to sync bank accounts. Please try again.',
      });
    }
  } catch (error) {
    console.error('Sync all bank accounts endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to sync bank accounts. Please try again.',
    });
  }
}