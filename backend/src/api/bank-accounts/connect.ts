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

export interface ConnectBankAccountRequest {
  publicToken: string;
  accountIds?: string[];
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

export interface ConnectBankAccountResponse {
  message: string;
  accounts: BankAccountResponse[];
}

export async function connectBankAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const { publicToken, accountIds }: ConnectBankAccountRequest = req.body;

    // Validate required fields
    if (!publicToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Public token is required.',
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
      // Connect bank account using the service
      const connectionData = {
        publicToken,
        metadata: {
          institution: {
            name: 'Bank Institution', // This would come from Plaid metadata
            institution_id: 'temp_id',
          },
          accounts: [], // This would come from Plaid metadata
        },
      };

      const bankAccounts = await BankService.connectBankAccount(
        familyId,
        userId,
        connectionData
      );

      // Format response
      const accountData: BankAccountResponse[] = bankAccounts.map((account) => ({
        id: account.id,
        plaidAccountId: account.plaidAccountId,
        institutionName: account.institutionName,
        accountName: account.accountName,
        accountType: account.accountType,
        accountNumber: account.accountNumber,
        currentBalance: account.currentBalance.toNumber(),
        availableBalance: account.availableBalance?.toNumber() || null,
        lastSyncAt: account.lastSyncAt?.toISOString() || null,
        syncStatus: account.syncStatus,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      }));

      const response: ConnectBankAccountResponse = {
        message: 'Bank account connected successfully.',
        accounts: accountData,
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Connect bank account error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not authorized') || serviceError.message.includes('not found')) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to connect bank accounts.',
          });
        }

        if (serviceError.message.includes('Plaid')) {
          return res.status(400).json({
            error: 'Bank connection failed',
            message: 'Failed to connect to your bank. Please try again or contact support.',
          });
        }

        if (serviceError.message.includes('Invalid') || serviceError.message.includes('public_token')) {
          return res.status(400).json({
            error: 'Invalid request data',
            message: 'The provided public token is invalid or expired.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to connect bank account',
        message: 'Failed to connect bank account. Please try again.',
      });
    }
  } catch (error) {
    console.error('Connect bank account endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to connect bank account. Please try again.',
    });
  }
}