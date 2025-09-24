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

export interface BankAccountSummary {
  id: string;
  institutionName: string;
  accountName: string;
  accountType: string;
  accountNumber: string;
  currentBalance: number;
  availableBalance: number | null;
  lastSyncAt: string | null;
  syncStatus: string;
  transactionCount: number;
  createdAt: string;
}

export interface BankAccountListResponse {
  message: string;
  accounts: BankAccountSummary[];
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    totalBalance: number;
    lastSyncAt: string | null;
  };
}

export async function getBankAccounts(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract query parameters
    const includeDisconnected = req.query.includeDisconnected === 'true';

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
      // Build filters
      const filters = {
        includeDisconnected,
      };

      // Get bank accounts
      const bankAccounts = await BankService.getBankAccounts(familyId, filters);

      // Calculate summary statistics
      const activeAccounts = bankAccounts.filter(account => account.syncStatus === 'active');
      const totalBalance = bankAccounts
        .filter(account => account.syncStatus === 'active')
        .reduce((sum, account) => sum + account.currentBalance.toNumber(), 0);

      const lastSyncDates = bankAccounts
        .filter(account => account.lastSyncAt)
        .map(account => account.lastSyncAt!);
      const lastSyncAt = lastSyncDates.length > 0
        ? new Date(Math.max(...lastSyncDates.map(date => date.getTime()))).toISOString()
        : null;

      // Get transaction counts for each account
      const accountsWithTransactionCounts = await Promise.all(
        bankAccounts.map(async (account) => {
          // For now, we'll set transaction count to 0
          // In a real implementation, you'd query the transaction count
          const transactionCount = 0;

          return {
            id: account.id,
            institutionName: account.institutionName,
            accountName: account.accountName,
            accountType: account.accountType,
            accountNumber: account.accountNumber,
            currentBalance: account.currentBalance.toNumber(),
            availableBalance: account.availableBalance?.toNumber() || null,
            lastSyncAt: account.lastSyncAt?.toISOString() || null,
            syncStatus: account.syncStatus,
            transactionCount,
            createdAt: account.createdAt.toISOString(),
          };
        })
      );

      const response: BankAccountListResponse = {
        message: 'Bank accounts retrieved successfully.',
        accounts: accountsWithTransactionCounts,
        summary: {
          totalAccounts: bankAccounts.length,
          activeAccounts: activeAccounts.length,
          totalBalance,
          lastSyncAt,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get bank accounts error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }

        if (serviceError.message.includes('Insufficient permissions')) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to view bank accounts.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get bank accounts',
        message: 'Failed to retrieve bank accounts. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get bank accounts endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve bank accounts. Please try again.',
    });
  }
}