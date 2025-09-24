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

export interface UpdateBankAccountRequest {
  accountName?: string;
}

export interface BankAccountResponse {
  id: string;
  plaidAccountId: string;
  institutionName: string;
  accountName: string;
  accountType: string;
  accountNumber: string;
  currentBalance: number;
  availableBalance: number | null;
  lastSyncAt: string | null;
  syncStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBankAccountResponse {
  message: string;
  account: BankAccountResponse;
}

export async function updateBankAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: accountId } = req.params;
    const { accountName }: UpdateBankAccountRequest = req.body;

    // Validate required parameters
    if (!accountId) {
      return res.status(400).json({
        error: 'Missing account ID',
        message: 'Bank account ID is required.',
      });
    }

    // Validate request data
    if (!accountName || typeof accountName !== 'string') {
      return res.status(400).json({
        error: 'Invalid request data',
        message: 'Account name must be a non-empty string.',
      });
    }

    if (accountName.length < 1 || accountName.length > 255) {
      return res.status(400).json({
        error: 'Invalid account name',
        message: 'Account name must be between 1 and 255 characters.',
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
      // Update bank account
      const updatedAccount = await BankService.updateBankAccount(
        familyId,
        accountId,
        { accountName }
      );

      // Format response
      const accountData: BankAccountResponse = {
        id: updatedAccount.id,
        plaidAccountId: updatedAccount.plaidAccountId,
        institutionName: updatedAccount.institutionName,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        accountNumber: updatedAccount.accountNumber,
        currentBalance: updatedAccount.currentBalance.toNumber(),
        availableBalance: updatedAccount.availableBalance?.toNumber() || null,
        lastSyncAt: updatedAccount.lastSyncAt?.toISOString() || null,
        syncStatus: updatedAccount.syncStatus,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString(),
      };

      const response: UpdateBankAccountResponse = {
        message: 'Bank account updated successfully.',
        account: accountData,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update bank account error:', serviceError);

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
            message: 'You do not have permission to update this bank account.',
          });
        }

        if (serviceError.message.includes('Invalid')) {
          return res.status(400).json({
            error: 'Invalid request data',
            message: serviceError.message,
          });
        }
      }

      res.status(500).json({
        error: 'Failed to update bank account',
        message: 'Failed to update bank account. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update bank account endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update bank account. Please try again.',
    });
  }
}