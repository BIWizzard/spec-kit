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

export interface GenerateAllocationsRequest {
  overrideCategoryPercentages?: { [categoryId: string]: number };
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

export interface GenerateAllocationsResponse {
  allocations: BudgetAllocationResponse[];
  summary: {
    totalAllocated: number;
    incomeAmount: number;
    categoriesAllocated: number;
  };
}

export async function generateBudgetAllocations(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract income event ID from path
    const incomeEventId = req.params.incomeEventId;

    if (!incomeEventId || typeof incomeEventId !== 'string') {
      return res.status(400).json({
        error: 'Invalid income event ID',
        message: 'Valid income event ID is required.',
      });
    }

    // Validate request body
    const { overrideCategoryPercentages }: GenerateAllocationsRequest = req.body || {};

    if (overrideCategoryPercentages) {
      if (typeof overrideCategoryPercentages !== 'object' || Array.isArray(overrideCategoryPercentages)) {
        return res.status(400).json({
          error: 'Invalid override percentages',
          message: 'Override category percentages must be an object.',
        });
      }

      // Validate each override percentage
      for (const [categoryId, percentage] of Object.entries(overrideCategoryPercentages)) {
        if (typeof categoryId !== 'string' || !categoryId.trim()) {
          return res.status(400).json({
            error: 'Invalid category ID in overrides',
            message: 'Each category ID must be a non-empty string.',
          });
        }

        if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
          return res.status(400).json({
            error: 'Invalid override percentage',
            message: `Override percentage for category ${categoryId} must be between 0 and 100.`,
          });
        }
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
      // Verify that the income event belongs to the family
      const incomeEvent = await prisma.incomeEvent.findFirst({
        where: {
          id: incomeEventId,
          familyId,
        },
      });

      if (!incomeEvent) {
        return res.status(404).json({
          error: 'Income event not found',
          message: 'The specified income event was not found.',
        });
      }

      // Generate budget allocations using the service
      const allocations = await BudgetService.generateBudgetAllocation(familyId, {
        incomeEventId,
        overrideCategoryPercentages,
      });

      // Get the generated allocations with related data
      const fullAllocations = await prisma.budgetAllocation.findMany({
        where: {
          incomeEventId,
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
        orderBy: {
          budgetCategory: {
            sortOrder: 'asc',
          },
        },
      });

      // Build the response data
      const allocationData: BudgetAllocationResponse[] = fullAllocations.map((allocation) => {
        // Calculate spent amount for this allocation
        const spentAmount = 0; // Placeholder - would need proper implementation

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
      });

      // Calculate summary
      const totalAllocated = allocationData.reduce((sum, alloc) => sum + alloc.amount, 0);
      const incomeAmount = incomeEvent.amount.toNumber();

      const response: GenerateAllocationsResponse = {
        allocations: allocationData,
        summary: {
          totalAllocated,
          incomeAmount,
          categoriesAllocated: allocationData.length,
        },
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Generate budget allocations error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The specified income event was not found.',
          });
        }

        if (serviceError.message === 'Budget allocation already exists for this income event') {
          return res.status(400).json({
            error: 'Allocations already exist',
            message: 'Budget allocations have already been generated for this income event.',
          });
        }

        if (serviceError.message === 'No active budget categories found') {
          return res.status(400).json({
            error: 'No budget categories',
            message: 'No active budget categories found. Please create budget categories first.',
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
        error: 'Failed to generate budget allocations',
        message: 'Failed to generate budget allocations. Please try again.',
      });
    }
  } catch (error) {
    console.error('Generate budget allocations endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate budget allocations. Please try again.',
    });
  }
}