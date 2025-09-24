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

export interface ReconnectBankAccountRequest {
  publicToken: string;
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

export interface ReconnectBankAccountResponse {
  message: string;
  account: BankAccountResponse;
}

export async function reconnectBankAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: accountId } = req.params;
    const { publicToken }: ReconnectBankAccountRequest = req.body;

    // Validate required parameters
    if (!accountId) {
      return res.status(400).json({
        error: 'Missing account ID',
        message: 'Bank account ID is required.',
      });
    }

    if (!publicToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Public token is required for reconnection.',
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

      // Reconnect bank account
      const reconnectedAccount = await BankService.reconnectBankAccount(
        familyId,
        accountId,
        publicToken
      );

      // Format response
      const accountData: BankAccountResponse = {
        id: reconnectedAccount.id,
        plaidAccountId: reconnectedAccount.plaidAccountId,
        institutionName: reconnectedAccount.institutionName,
        accountName: reconnectedAccount.accountName,
        accountType: reconnectedAccount.accountType,
        accountNumber: reconnectedAccount.accountNumber,
        currentBalance: reconnectedAccount.currentBalance.toNumber(),
        availableBalance: reconnectedAccount.availableBalance?.toNumber() || null,
        lastSyncAt: reconnectedAccount.lastSyncAt?.toISOString() || null,
        syncStatus: reconnectedAccount.syncStatus,
        createdAt: reconnectedAccount.createdAt.toISOString(),
        updatedAt: reconnectedAccount.updatedAt.toISOString(),
      };

      const response: ReconnectBankAccountResponse = {
        message: 'Bank account reconnected successfully.',
        account: accountData,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Reconnect bank account error:', serviceError);

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
            message: 'You do not have permission to reconnect this bank account.',
          });
        }

        if (serviceError.message.includes('Plaid') || serviceError.message.includes('public_token')) {
          return res.status(400).json({
            error: 'Bank reconnection failed',
            message: 'Failed to reconnect to your bank. Please try again with a new Link token.',
          });
        }

        if (serviceError.message.includes('Invalid')) {
          return res.status(400).json({
            error: 'Invalid request data',
            message: 'The provided public token is invalid or expired.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to reconnect bank account',
        message: 'Failed to reconnect bank account. Please try again.',
      });
    }
  } catch (error) {
    console.error('Reconnect bank account endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reconnect bank account. Please try again.',
    });
  }
}