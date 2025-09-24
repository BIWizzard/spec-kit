import { Request, Response } from 'express';
import { BankService } from '../../../services/bank.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface SyncResponse {
  message: string;
  syncId: string;
  status: string;
  estimatedCompletionTime: string;
}

export async function syncBankAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: accountId } = req.params;

    // Validate required parameters
    if (!accountId) {
      return res.status(400).json({
        error: 'Missing account ID',
        message: 'Bank account ID is required.',
      });
    }

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
      // Check if account exists
      const existingAccount = await BankService.getBankAccountById(familyId, accountId);
      if (!existingAccount) {
        return res.status(404).json({
          error: 'Bank account not found',
          message: 'The specified bank account was not found.',
        });
      }

      // Perform sync
      const syncResult = await BankService.syncTransactions(familyId, accountId);

      // Generate mock sync ID and estimated completion time
      const syncId = 'sync-' + Math.random().toString(36).substr(2, 9);
      const estimatedCompletionTime = new Date(Date.now() + 30000).toISOString(); // 30 seconds from now

      const response: SyncResponse = {
        message: 'Transaction sync initiated successfully.',
        syncId,
        status: 'completed',
        estimatedCompletionTime,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Sync bank account error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not found')) {
          return res.status(404).json({
            error: 'Bank account not found',
            message: 'The specified bank account was not found.',
          });
        }

        if (serviceError.message.includes('not authorized') || serviceError.message.includes('permissions')) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to sync this bank account.',
          });
        }

        if (serviceError.message.includes('rate limit') || serviceError.message.includes('too many')) {
          return res.status(429).json({
            error: 'Sync rate limit exceeded',
            message: 'Too many sync requests. Please wait before trying again.',
          });
        }

        if (serviceError.message.includes('not properly connected') || serviceError.message.includes('access_token')) {
          return res.status(400).json({
            error: 'Bank account connection issue',
            message: 'Bank account needs to be reconnected. Please use the reconnect endpoint.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to sync bank account',
        message: 'Failed to sync bank account transactions. Please try again.',
      });
    }
  } catch (error) {
    console.error('Sync bank account endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to sync bank account. Please try again.',
    });
  }
}