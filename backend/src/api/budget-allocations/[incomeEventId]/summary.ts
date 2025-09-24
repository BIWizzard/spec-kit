import { Request, Response } from 'express';
import { BudgetService } from '../../../services/budget.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getBudgetAllocationSummary(req: AuthenticatedRequest, res: Response) {
  try {
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

    const { incomeEventId } = req.params;

    if (!incomeEventId) {
      return res.status(400).json({
        error: 'Missing parameter',
        message: 'Income event ID is required.',
      });
    }

    try {
      // Get budget allocation summary
      const summary = await BudgetService.getBudgetAllocationSummary(familyId, incomeEventId);

      if (!summary) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Budget allocation summary not found.',
        });
      }

      res.status(200).json({
        incomeEventId,
        totalIncome: summary.totalIncome,
        totalAllocated: summary.totalAllocated,
        totalRemaining: summary.totalRemaining,
        allocationPercentage: summary.allocationPercentage,
        categories: summary.categories.map(category => ({
          id: category.id,
          name: category.name,
          type: category.type,
          targetPercentage: category.targetPercentage,
          allocatedAmount: category.allocatedAmount,
          actualPercentage: category.actualPercentage,
          remainingAmount: category.remainingAmount,
          status: category.status, // 'under_allocated', 'fully_allocated', 'over_allocated'
        })),
        recommendations: summary.recommendations || [],
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get budget allocation summary error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The specified income event was not found.',
          });
        }

        if (serviceError.message === 'Budget allocations not found') {
          return res.status(404).json({
            error: 'Budget allocations not found',
            message: 'No budget allocations found for this income event.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get budget allocation summary',
        message: 'Failed to retrieve budget allocation summary. Please try again.',
      });
    }
  } catch (error) {
    console.error('Budget allocation summary endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve budget allocation summary. Please try again.',
    });
  }
}