import { Request, Response } from 'express';
import { TransactionService } from '../../services/transaction.service';
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
  bankAccount: {
    id: string;
    institutionName: string;
    accountName: string;
  };
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface TransactionListResponse {
  message: string;
  transactions: TransactionSummary[];
  pagination: PaginationInfo;
  summary: {
    totalAmount: number;
    incomeAmount: number;
    expenseAmount: number;
  };
}

export async function getTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract pagination and filter parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const accountId = req.query.accountId as string;
    const spendingCategoryId = req.query.spendingCategoryId as string;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    const minAmount = req.query.minAmount as string;
    const maxAmount = req.query.maxAmount as string;
    const pending = req.query.pending as string;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'date';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

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
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Build filters
      const filters: any = {};

      if (accountId) {
        filters.bankAccountIds = [accountId];
      }

      if (spendingCategoryId) {
        filters.categoryId = spendingCategoryId;
      }

      if (fromDate) {
        try {
          filters.startDate = new Date(fromDate);
        } catch (err) {
          return res.status(400).json({
            error: 'Invalid from date',
            message: 'Please provide from date in YYYY-MM-DD format.',
          });
        }
      }

      if (toDate) {
        try {
          filters.endDate = new Date(toDate);
        } catch (err) {
          return res.status(400).json({
            error: 'Invalid to date',
            message: 'Please provide to date in YYYY-MM-DD format.',
          });
        }
      }

      if (minAmount || maxAmount) {
        filters.amountRange = {};
        if (minAmount) {
          const min = parseFloat(minAmount);
          if (isNaN(min)) {
            return res.status(400).json({
              error: 'Invalid minimum amount',
              message: 'Minimum amount must be a valid number.',
            });
          }
          filters.amountRange.min = min;
        }
        if (maxAmount) {
          const max = parseFloat(maxAmount);
          if (isNaN(max)) {
            return res.status(400).json({
              error: 'Invalid maximum amount',
              message: 'Maximum amount must be a valid number.',
            });
          }
          filters.amountRange.max = max;
        }
      }

      if (pending) {
        if (pending !== 'true' && pending !== 'false') {
          return res.status(400).json({
            error: 'Invalid pending filter',
            message: 'Pending filter must be true or false.',
          });
        }
        filters.pending = pending === 'true';
      }

      if (search) {
        if (search.length > 255) {
          return res.status(400).json({
            error: 'Search term too long',
            message: 'Search term must be 255 characters or less.',
          });
        }
        filters.searchTerm = search;
      }

      // Validate sort parameters
      if (!['date', 'amount', 'description', 'merchant'].includes(sortBy)) {
        return res.status(400).json({
          error: 'Invalid sort field',
          message: 'Sort field must be one of: date, amount, description, merchant.',
        });
      }

      if (!['asc', 'desc'].includes(sortOrder)) {
        return res.status(400).json({
          error: 'Invalid sort order',
          message: 'Sort order must be asc or desc.',
        });
      }

      // Get transactions
      const { transactions, total } = await TransactionService.getTransactions(
        familyId,
        filters,
        limit,
        offset
      );

      // Calculate summary statistics
      let totalAmount = 0;
      let incomeAmount = 0;
      let expenseAmount = 0;

      for (const transaction of transactions) {
        const amount = transaction.amount.toNumber();
        totalAmount += amount;
        if (amount > 0) {
          incomeAmount += amount;
        } else {
          expenseAmount += Math.abs(amount);
        }
      }

      // Format transactions
      const transactionData: TransactionSummary[] = transactions.map((transaction) => ({
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
        bankAccount: {
          id: (transaction as any).bankAccount.id,
          institutionName: (transaction as any).bankAccount.institutionName,
          accountName: (transaction as any).bankAccount.accountName,
        },
      }));

      const response: TransactionListResponse = {
        message: 'Transactions retrieved successfully.',
        transactions: transactionData,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        summary: {
          totalAmount,
          incomeAmount,
          expenseAmount,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get transactions error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }

        if (serviceError.message.includes('Invalid date')) {
          return res.status(400).json({
            error: 'Invalid date format',
            message: 'Please provide dates in YYYY-MM-DD format.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get transactions',
        message: 'Failed to retrieve transactions. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get transactions endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve transactions. Please try again.',
    });
  }
}