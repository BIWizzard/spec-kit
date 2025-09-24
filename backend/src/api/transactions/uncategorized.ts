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

export interface CategorySuggestion {
  transactionId: string;
  suggestedCategory: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  confidence: number;
}

export interface UncategorizedTransactionsResponse {
  message: string;
  transactions: Array<{
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
  }>;
  total: number;
  suggestedCategories: CategorySuggestion[];
}

export async function getUncategorizedTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const confidenceThreshold = Math.min(Math.max(parseFloat(req.query.confidenceThreshold as string) || 0.8, 0), 1);

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
      // Get uncategorized transactions
      const result = await TransactionService.getUncategorizedTransactions(
        familyId,
        confidenceThreshold,
        limit,
        0
      );

      // Format transactions
      const transactionData = result.transactions.map((transaction) => ({
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

      // Format suggested categories
      const suggestedCategories: CategorySuggestion[] = result.suggestedCategories.map((suggestion) => ({
        transactionId: suggestion.categoryId, // This would be mapped properly in real implementation
        suggestedCategory: {
          id: suggestion.categoryId,
          name: suggestion.categoryName,
          color: '#3B82F6',
          icon: 'default',
        },
        confidence: suggestion.confidence,
      }));

      const response: UncategorizedTransactionsResponse = {
        message: 'Uncategorized transactions retrieved successfully.',
        transactions: transactionData,
        total: result.total,
        suggestedCategories,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get uncategorized transactions error:', serviceError);

      res.status(500).json({
        error: 'Failed to get uncategorized transactions',
        message: 'Failed to retrieve uncategorized transactions. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get uncategorized transactions endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve uncategorized transactions. Please try again.',
    });
  }
}