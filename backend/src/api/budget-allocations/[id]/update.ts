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

export interface UpdateBudgetAllocationRequest {
  amount?: number;
  percentage?: number;
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

export async function updateBudgetAllocation(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract allocation ID from path
    const allocationId = req.params.id;

    if (!allocationId || typeof allocationId !== 'string') {
      return res.status(400).json({
        error: 'Invalid allocation ID',
        message: 'Valid allocation ID is required.',
      });
    }

    // Validate request body
    const { amount, percentage }: UpdateBudgetAllocationRequest = req.body;

    // Must provide either amount or percentage, but not both
    if (!amount && !percentage) {
      return res.status(400).json({
        error: 'Missing update data',
        message: 'Either amount or percentage must be provided.',
      });
    }

    if (amount !== undefined && percentage !== undefined) {
      return res.status(400).json({
        error: 'Conflicting update data',
        message: 'Provide either amount or percentage, not both.',
      });
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({
          error: 'Invalid amount',
          message: 'Amount must be a non-negative number.',
        });
      }
    }

    if (percentage !== undefined) {
      if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
        return res.status(400).json({
          error: 'Invalid percentage',
          message: 'Percentage must be a number between 0 and 100.',
        });
      }
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
      // First, get the allocation to verify it exists and belongs to the family
      const existingAllocation = await prisma.budgetAllocation.findFirst({
        where: {
          id: allocationId,
          incomeEvent: {
            familyId,
          },
        },
        include: {
          incomeEvent: true,
        },
      });

      if (!existingAllocation) {
        return res.status(404).json({
          error: 'Budget allocation not found',
          message: 'The specified budget allocation was not found.',
        });
      }

      // Calculate the final amount to update
      let finalAmount: number;

      if (amount !== undefined) {
        finalAmount = amount;
      } else if (percentage !== undefined) {
        const incomeAmount = existingAllocation.incomeEvent.amount.toNumber();
        finalAmount = (incomeAmount * percentage) / 100;
      } else {
        throw new Error('Invalid update data'); // This should never happen due to validation above
      }

      // Check if the new amount would exceed the income event's total amount
      // when combined with other allocations for the same income event
      const otherAllocations = await prisma.budgetAllocation.findMany({
        where: {
          incomeEventId: existingAllocation.incomeEventId,
          id: { not: allocationId },
        },
      });

      const otherAllocationsTotal = otherAllocations.reduce(
        (sum, alloc) => sum + alloc.amount.toNumber(),
        0
      );

      const totalWithUpdate = otherAllocationsTotal + finalAmount;
      const incomeAmount = existingAllocation.incomeEvent.amount.toNumber();

      if (totalWithUpdate > incomeAmount) {
        return res.status(400).json({
          error: 'Allocation exceeds income',
          message: `Total allocations (${totalWithUpdate.toFixed(2)}) would exceed income amount (${incomeAmount.toFixed(2)}).`,
        });
      }

      // Update the allocation using the service
      const updatedAllocation = await BudgetService.updateBudgetAllocation(
        familyId,
        allocationId,
        finalAmount
      );

      // Get the updated allocation with related data
      const fullAllocation = await prisma.budgetAllocation.findFirst({
        where: { id: allocationId },
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

      if (!fullAllocation) {
        throw new Error('Failed to retrieve updated allocation');
      }

      // Calculate spent amount for this allocation
      const spentAmount = 0; // Placeholder - would need proper implementation

      const response: BudgetAllocationResponse = {
        id: fullAllocation.id,
        incomeEvent: {
          id: fullAllocation.incomeEvent.id,
          name: fullAllocation.incomeEvent.name,
          amount: fullAllocation.incomeEvent.amount.toNumber(),
          scheduledDate: fullAllocation.incomeEvent.scheduledDate.toISOString().split('T')[0],
        },
        budgetCategory: {
          id: fullAllocation.budgetCategory.id,
          name: fullAllocation.budgetCategory.name,
          color: fullAllocation.budgetCategory.color,
        },
        amount: fullAllocation.amount.toNumber(),
        percentage: fullAllocation.percentage.toNumber(),
        spentAmount,
        remainingAmount: Math.max(0, fullAllocation.amount.toNumber() - spentAmount),
        createdAt: fullAllocation.createdAt.toISOString(),
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update budget allocation error:', serviceError);

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

        if (serviceError.message.includes('exceeds income amount')) {
          return res.status(400).json({
            error: 'Allocation exceeds income',
            message: serviceError.message,
          });
        }
      }

      res.status(500).json({
        error: 'Failed to update budget allocation',
        message: 'Failed to update budget allocation. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update budget allocation endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update budget allocation. Please try again.',
    });
  }
}