import { Request, Response } from 'express';
import { BankService } from '../../../services/bank.service';
import { TransactionService } from '../../../services/transaction.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface TransactionSummary {
  id: string;
  plaidTransactionId: string;
  amount: number;
  date: string;
  description: string;
  merchantName: string | null;
  pending: boolean;
  spendingCategory: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
  categoryConfidence: number;
  userCategorized: boolean;
}

export interface SyncHistoryEntry {
  syncId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  transactionsSynced: number | null;
  error: string | null;
}

export interface BankAccountDetailResponse {
  message: string;
  account: {
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
    transactionCount: number;
    createdAt: string;
    updatedAt: string;
    recentTransactions: TransactionSummary[];
    syncHistory: SyncHistoryEntry[];
  };
}

export async function getBankAccountDetails(req: AuthenticatedRequest, res: Response) {
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
      // Get bank account details
      const bankAccount = await BankService.getBankAccountById(familyId, accountId);

      if (!bankAccount) {
        return res.status(404).json({
          error: 'Bank account not found',
          message: 'The specified bank account was not found.',
        });
      }

      // Get recent transactions (last 10)
      const { transactions } = await TransactionService.getTransactions(
        familyId,
        { bankAccountIds: [accountId] },
        10,
        0
      );

      const recentTransactions: TransactionSummary[] = transactions.map((transaction) => ({
        id: transaction.id,
        plaidTransactionId: transaction.plaidTransactionId,
        amount: transaction.amount.toNumber(),
        date: transaction.date.toISOString().split('T')[0],
        description: transaction.description,
        merchantName: transaction.merchantName,
        pending: transaction.pending,
        spendingCategory: (transaction as any).spendingCategory ? {
          id: (transaction as any).spendingCategory.id,
          name: (transaction as any).spendingCategory.name,
          color: (transaction as any).spendingCategory.color,
          icon: (transaction as any).spendingCategory.icon,
        } : null,
        categoryConfidence: transaction.categoryConfidence.toNumber(),
        userCategorized: transaction.userCategorized,
      }));

      // Get transaction count for this account
      const { total: transactionCount } = await TransactionService.getTransactions(
        familyId,
        { bankAccountIds: [accountId] },
        1,
        0
      );

      // Mock sync history - in a real implementation, you'd have a sync history table
      const syncHistory: SyncHistoryEntry[] = bankAccount.lastSyncAt ? [{
        syncId: 'sync-' + Math.random().toString(36).substr(2, 9),
        status: bankAccount.syncStatus === 'active' ? 'completed' : 'failed',
        startedAt: bankAccount.lastSyncAt.toISOString(),
        completedAt: bankAccount.syncStatus === 'active' ? bankAccount.lastSyncAt.toISOString() : null,
        transactionsSynced: bankAccount.syncStatus === 'active' ? transactionCount : null,
        error: bankAccount.syncStatus === 'error' ? 'Sync failed - please reconnect account' : null,
      }] : [];

      const response: BankAccountDetailResponse = {
        message: 'Bank account details retrieved successfully.',
        account: {
          id: bankAccount.id,
          plaidAccountId: bankAccount.plaidAccountId,
          institutionName: bankAccount.institutionName,
          accountName: bankAccount.accountName,
          accountType: bankAccount.accountType,
          accountNumber: bankAccount.accountNumber,
          currentBalance: bankAccount.currentBalance.toNumber(),
          availableBalance: bankAccount.availableBalance?.toNumber() || null,
          lastSyncAt: bankAccount.lastSyncAt?.toISOString() || null,
          syncStatus: bankAccount.syncStatus,
          transactionCount,
          createdAt: bankAccount.createdAt.toISOString(),
          updatedAt: bankAccount.updatedAt.toISOString(),
          recentTransactions,
          syncHistory,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get bank account details error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not found')) {
          return res.status(404).json({
            error: 'Bank account not found',
            message: 'The specified bank account was not found.',
          });
        }

        if (serviceError.message.includes('not authorized')) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to view this bank account.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get bank account details',
        message: 'Failed to retrieve bank account details. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get bank account details endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve bank account details. Please try again.',
    });
  }
}