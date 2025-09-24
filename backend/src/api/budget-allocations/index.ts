import { Request, Response } from 'express';
import { BudgetService } from '../../services/budget.service';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface BudgetAllocationSummary {
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

export interface BudgetAllocationListResponse {
  allocations: BudgetAllocationSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalAllocated: number;
    totalSpent: number;
    remainingBalance: number;
  };
}

export async function getBudgetAllocations(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract pagination and filter parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const incomeEventId = req.query.incomeEventId as string;
    const budgetCategoryId = req.query.budgetCategoryId as string;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;

    // Validate date parameters
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (fromDate) {
      try {
        startDate = new Date(fromDate);
        if (isNaN(startDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (err) {
        return res.status(400).json({
          error: 'Invalid from date',
          message: 'Please provide from date in YYYY-MM-DD format.',
        });
      }
    }

    if (toDate) {
      try {
        endDate = new Date(toDate);
        if (isNaN(endDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (err) {
        return res.status(400).json({
          error: 'Invalid to date',
          message: 'Please provide to date in YYYY-MM-DD format.',
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
      // Build where clause for filtering
      const whereClause: any = {
        incomeEvent: {
          familyId,
        },
      };

      if (incomeEventId) {
        whereClause.incomeEventId = incomeEventId;
      }

      if (budgetCategoryId) {
        whereClause.budgetCategoryId = budgetCategoryId;
      }

      if (startDate || endDate) {
        whereClause.incomeEvent.scheduledDate = {};
        if (startDate) {
          whereClause.incomeEvent.scheduledDate.gte = startDate;
        }
        if (endDate) {
          whereClause.incomeEvent.scheduledDate.lte = endDate;
        }
      }

      // Get allocations with related data
      const allocations = await prisma.budgetAllocation.findMany({
        where: whereClause,
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
        orderBy: [
          { incomeEvent: { scheduledDate: 'desc' } },
          { budgetCategory: { sortOrder: 'asc' } },
        ],
        skip: offset,
        take: limit + 1, // Take one extra to check if there are more
      });

      const hasMore = allocations.length > limit;
      const limitedAllocations = hasMore ? allocations.slice(0, limit) : allocations;

      // Calculate spent amounts for each allocation
      // This is a simplified version - in a real implementation, we'd need to track
      // spending against specific allocations through transaction categorization
      const allocationData: BudgetAllocationSummary[] = await Promise.all(
        limitedAllocations.map(async (allocation) => {
          // For now, we'll calculate spent amount as 0 - this would need proper
          // implementation to track spending against specific budget allocations
          const spentAmount = 0;

          return {
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
        })
      );

      // Calculate summary totals
      const totalAllocated = allocationData.reduce((sum, alloc) => sum + alloc.amount, 0);
      const totalSpent = allocationData.reduce((sum, alloc) => sum + alloc.spentAmount, 0);
      const remainingBalance = totalAllocated - totalSpent;

      // Get actual count for pagination (this is simplified - in production, you'd want a separate count query)
      const totalCount = hasMore ? offset + limit + 1 : offset + allocationData.length;

      const response: BudgetAllocationListResponse = {
        allocations: allocationData,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore,
        },
        summary: {
          totalAllocated,
          totalSpent,
          remainingBalance,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get budget allocations error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get budget allocations',
        message: 'Failed to retrieve budget allocations. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get budget allocations endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve budget allocations. Please try again.',
    });
  }
}