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

export interface BatchCategorizeRequest {
  transactionIds: string[];
  spendingCategoryId: string;
}

export interface BatchCategorizeResponse {
  message: string;
  updated: string[];
  errors: Array<{
    transactionId: string;
    error: string;
  }>;
  summary: {
    totalRequested: number;
    totalUpdated: number;
    totalErrors: number;
  };
}

export async function categorizeBatchTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    const { transactionIds, spendingCategoryId }: BatchCategorizeRequest = req.body;

    // Validate request data
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid transaction IDs',
        message: 'Transaction IDs must be a non-empty array.',
      });
    }

    if (transactionIds.length > 100) {
      return res.status(400).json({
        error: 'Too many transactions',
        message: 'Cannot process more than 100 transactions at once.',
      });
    }

    if (!spendingCategoryId) {
      return res.status(400).json({
        error: 'Missing spending category ID',
        message: 'Spending category ID is required.',
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
      // Perform batch categorization
      const result = await TransactionService.batchCategorizeTransactions(familyId, {
        transactionIds,
        spendingCategoryId,
        userCategorized: true,
      });

      // Get list of successfully updated transaction IDs
      const updated: string[] = [];
      const validIds = new Set(transactionIds.filter(id =>
        !result.errors.some(error => error.transactionId === id)
      ));

      for (const id of transactionIds) {
        if (validIds.has(id)) {
          updated.push(id);
        }
      }

      const response: BatchCategorizeResponse = {
        message: 'Batch categorization completed.',
        updated,
        errors: result.errors,
        summary: {
          totalRequested: transactionIds.length,
          totalUpdated: result.updatedCount,
          totalErrors: result.errors.length,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Batch categorize transactions error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not found') || serviceError.message.includes('not authorized')) {
          return res.status(400).json({
            error: 'Invalid request data',
            message: 'Some transactions or the spending category were not found or not authorized.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to categorize transactions',
        message: 'Failed to categorize transactions. Please try again.',
      });
    }
  } catch (error) {
    console.error('Batch categorize transactions endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to categorize transactions. Please try again.',
    });
  }
}