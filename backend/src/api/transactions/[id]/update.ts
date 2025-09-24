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

export interface UpdateTransactionRequest {
  spendingCategoryId?: string;
  notes?: string;
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
    createdAt: string;
    updatedAt: string;
  };
}

export async function updateTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: transactionId } = req.params;
    const { spendingCategoryId, notes }: UpdateTransactionRequest = req.body;

    if (!transactionId) {
      return res.status(400).json({
        error: 'Missing transaction ID',
        message: 'Transaction ID is required.',
      });
    }

    if (notes && notes.length > 1000) {
      return res.status(400).json({
        error: 'Notes too long',
        message: 'Notes must be 1000 characters or less.',
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
      const updatedTransaction = await TransactionService.updateTransaction(familyId, transactionId, {
        spendingCategoryId: spendingCategoryId || undefined,
        notes: notes || undefined,
        userCategorized: true,
        categoryConfidence: spendingCategoryId ? 1.0 : undefined,
      });

      const response: TransactionResponse = {
        message: 'Transaction updated successfully.',
        transaction: {
          id: updatedTransaction.id,
          plaidTransactionId: updatedTransaction.plaidTransactionId,
          amount: updatedTransaction.amount.toNumber(),
          date: updatedTransaction.date.toISOString().split('T')[0],
          description: updatedTransaction.description,
          merchantName: updatedTransaction.merchantName,
          pending: updatedTransaction.pending,
          spendingCategory: (updatedTransaction as any).spendingCategory ? {
            id: (updatedTransaction as any).spendingCategory.id,
            name: (updatedTransaction as any).spendingCategory.name,
            color: (updatedTransaction as any).spendingCategory.color,
            icon: (updatedTransaction as any).spendingCategory.icon,
          } : null,
          categoryConfidence: updatedTransaction.categoryConfidence.toNumber(),
          userCategorized: updatedTransaction.userCategorized,
          notes: updatedTransaction.notes,
          createdAt: updatedTransaction.createdAt.toISOString(),
          updatedAt: updatedTransaction.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update transaction error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not found')) {
          return res.status(404).json({
            error: 'Transaction not found',
            message: 'The specified transaction was not found.',
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
        error: 'Failed to update transaction',
        message: 'Failed to update transaction. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update transaction endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update transaction. Please try again.',
    });
  }
}