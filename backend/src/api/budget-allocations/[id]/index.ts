import { Request, Response } from 'express';
import { BudgetService } from '../../../services/budget.service';
import { prisma } from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface BudgetAllocationResponse {
  id: string;
  incomeEvent: {
    id: string;
    name: string;
    amount: number;
    scheduledDate: string;
  };
  budgetCategory: {
    id: string;
    name: string;
    color: string;
  };
  amount: number;
  percentage: number;
  spentAmount: number;
  remainingAmount: number;
  createdAt: string;
}

export async function getBudgetAllocationDetails(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract allocation ID from path
    const allocationId = req.params.id;

    if (!allocationId || typeof allocationId !== 'string') {
      return res.status(400).json({
        error: 'Invalid allocation ID',
        message: 'Valid allocation ID is required.',
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
      // Get allocation with related data, ensuring it belongs to the family
      const allocation = await prisma.budgetAllocation.findFirst({
        where: {
          id: allocationId,
          incomeEvent: {
            familyId,
          },
        },
        include: {
          incomeEvent: {
            select: {
              id: true,
              name: true,
              amount: true,
              scheduledDate: true,
            },
          },
          budgetCategory: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      if (!allocation) {
        return res.status(404).json({
          error: 'Budget allocation not found',
          message: 'The specified budget allocation was not found.',
        });
      }

      // Calculate spent amount for this allocation
      // This is a simplified version - in a real implementation, we'd need to track
      // spending against specific allocations through transaction categorization
      const spentAmount = 0; // Placeholder - would need proper implementation

      const response: BudgetAllocationResponse = {
        id: allocation.id,
        incomeEvent: {
          id: allocation.incomeEvent.id,
          name: allocation.incomeEvent.name,
          amount: allocation.incomeEvent.amount.toNumber(),
          scheduledDate: allocation.incomeEvent.scheduledDate.toISOString().split('T')[0],
        },
        budgetCategory: {
          id: allocation.budgetCategory.id,
          name: allocation.budgetCategory.name,
          color: allocation.budgetCategory.color,
        },
        amount: allocation.amount.toNumber(),
        percentage: allocation.percentage.toNumber(),
        spentAmount,
        remainingAmount: Math.max(0, allocation.amount.toNumber() - spentAmount),
        createdAt: allocation.createdAt.toISOString(),
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get budget allocation details error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Budget allocation not found') {
          return res.status(404).json({
            error: 'Budget allocation not found',
            message: 'The specified budget allocation was not found.',
          });
        }

        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get budget allocation details',
        message: 'Failed to retrieve budget allocation details. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get budget allocation details endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve budget allocation details. Please try again.',
    });
  }
}