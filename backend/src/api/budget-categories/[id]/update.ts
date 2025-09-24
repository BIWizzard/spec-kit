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

export interface UpdateBudgetCategoryRequest {
  name?: string;
  targetPercentage?: number;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface BudgetCategoryResponse {
  id: string;
  name: string;
  targetPercentage: number;
  color: string;
  sortOrder: number;
  isActive: boolean;
  currentPeriodAllocated: number;
  currentPeriodSpent: number;
  remainingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export async function updateBudgetCategory(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract category ID from path
    const categoryId = req.params.id;

    if (!categoryId || typeof categoryId !== 'string') {
      return res.status(400).json({
        error: 'Invalid category ID',
        message: 'Valid category ID is required.',
      });
    }

    // Validate request body
    const { name, targetPercentage, color, sortOrder, isActive }: UpdateBudgetCategoryRequest = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid name',
          message: 'Budget category name must be a non-empty string.',
        });
      }

      if (name.length > 100) {
        return res.status(400).json({
          error: 'Invalid name',
          message: 'Budget category name must be 100 characters or less.',
        });
      }
    }

    if (targetPercentage !== undefined) {
      if (typeof targetPercentage !== 'number' || targetPercentage <= 0 || targetPercentage > 100) {
        return res.status(400).json({
          error: 'Invalid target percentage',
          message: 'Target percentage must be a number between 0.01 and 100.',
        });
      }
    }

    if (color !== undefined && (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color))) {
      return res.status(400).json({
        error: 'Invalid color',
        message: 'Color must be a valid hex color format (#RRGGBB).',
      });
    }

    if (sortOrder !== undefined && (typeof sortOrder !== 'number' || sortOrder < 0)) {
      return res.status(400).json({
        error: 'Invalid sort order',
        message: 'Sort order must be a non-negative number.',
      });
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid active status',
        message: 'isActive must be a boolean value.',
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
      // Update budget category
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (targetPercentage !== undefined) updateData.targetPercentage = targetPercentage;
      if (color !== undefined) updateData.color = color;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const category = await BudgetService.updateBudgetCategory(familyId, categoryId, updateData);

      // Calculate current period metrics (using current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const performance = await BudgetService.getBudgetPerformance(familyId, startOfMonth, endOfMonth);
      const perfData = performance.find(p => p.categoryId === category.id);

      const response: BudgetCategoryResponse = {
        id: category.id,
        name: category.name,
        targetPercentage: category.targetPercentage.toNumber(),
        color: category.color,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        currentPeriodAllocated: perfData?.targetAmount || 0,
        currentPeriodSpent: perfData?.actualAmount || 0,
        remainingBalance: perfData ? Math.max(0, perfData.targetAmount - perfData.actualAmount) : 0,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update budget category error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Budget category not found') {
          return res.status(404).json({
            error: 'Budget category not found',
            message: 'The specified budget category was not found.',
          });
        }

        if (serviceError.message.includes('Total budget percentages cannot exceed 100%')) {
          return res.status(400).json({
            error: 'Percentage validation failed',
            message: serviceError.message,
          });
        }

        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }

        if (serviceError.message.includes('Unique constraint')) {
          return res.status(409).json({
            error: 'Category name already exists',
            message: 'A budget category with this name already exists for your family.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to update budget category',
        message: 'Failed to update budget category. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update budget category endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update budget category. Please try again.',
    });
  }
}