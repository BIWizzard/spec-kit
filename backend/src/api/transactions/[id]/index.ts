import { Request, Response } from 'express';
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

export interface TransactionResponse {
  message: string;
  transaction: {
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
    notes: string | null;
    bankAccount: {
      id: string;
      institutionName: string;
      accountName: string;
    };
    createdAt: string;
    updatedAt: string;
  };
}

export async function getTransactionDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        error: 'Missing transaction ID',
        message: 'Transaction ID is required.',
      });
    }

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
      const transaction = await TransactionService.getTransactionById(familyId, transactionId);

      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'The specified transaction was not found.',
        });
      }

      const response: TransactionResponse = {
        message: 'Transaction details retrieved successfully.',
        transaction: {
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
          notes: transaction.notes,
          bankAccount: {
            id: (transaction as any).bankAccount.id,
            institutionName: (transaction as any).bankAccount.institutionName,
            accountName: (transaction as any).bankAccount.accountName,
          },
          createdAt: transaction.createdAt.toISOString(),
          updatedAt: transaction.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get transaction details error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not found')) {
          return res.status(404).json({
            error: 'Transaction not found',
            message: 'The specified transaction was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get transaction details',
        message: 'Failed to retrieve transaction details. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get transaction details endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve transaction details. Please try again.',
    });
  }
}