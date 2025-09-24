import { Request, Response } from 'express';
import { BudgetService } from '../../services/budget.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface CreateBudgetCategoryRequest {
  name: string;
  targetPercentage: number;
  color?: string;
  sortOrder?: number;
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

export async function createBudgetCategory(req: AuthenticatedRequest, res: Response) {
  try {
    // Validate request body
    const { name, targetPercentage, color, sortOrder }: CreateBudgetCategoryRequest = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Budget category name is required and must be a non-empty string.',
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Budget category name must be 100 characters or less.',
      });
    }

    if (!targetPercentage || typeof targetPercentage !== 'number') {
      return res.status(400).json({
        error: 'Invalid target percentage',
        message: 'Target percentage is required and must be a number.',
      });
    }

    if (targetPercentage <= 0 || targetPercentage > 100) {
      return res.status(400).json({
        error: 'Invalid target percentage',
        message: 'Target percentage must be between 0.01 and 100.',
      });
    }

    if (color && (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color))) {
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
      // Create budget category
      const category = await BudgetService.createBudgetCategory(familyId, {
        name: name.trim(),
        targetPercentage,
        color: color || '#3B82F6', // Default blue color
        sortOrder,
      });

      // Return the created category
      const response: BudgetCategoryResponse = {
        id: category.id,
        name: category.name,
        targetPercentage: category.targetPercentage.toNumber(),
        color: category.color,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        currentPeriodAllocated: 0, // New category has no allocations yet
        currentPeriodSpent: 0,
        remainingBalance: 0,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Create budget category error:', serviceError);

      if (serviceError instanceof Error) {
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
        error: 'Failed to create budget category',
        message: 'Failed to create budget category. Please try again.',
      });
    }
  } catch (error) {
    console.error('Create budget category endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create budget category. Please try again.',
    });
  }
}