import { Request, Response } from 'express';
import { SpendingCategoryService, CreateSpendingCategoryData } from '../../services/spending-category.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface CreateSpendingCategoryRequest {
  name: string;
  parentCategoryId?: string;
  budgetCategoryId: string;
  icon?: string;
  color?: string;
  monthlyTarget?: number;
  description?: string;
}

export interface CreateSpendingCategoryResponse {
  message: string;
  category: {
    id: string;
    name: string;
    parentCategoryId: string | null;
    budgetCategoryId: string;
    icon: string | null;
    color: string | null;
    monthlyTarget: number | null;
    isActive: boolean;
    createdAt: string;
  };
}

export async function createSpendingCategory(req: AuthenticatedRequest, res: Response) {
  try {
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

    const {
      name,
      parentCategoryId,
      budgetCategoryId,
      icon,
      color,
      monthlyTarget,
      description,
    }: CreateSpendingCategoryRequest = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Category name is required and must be a non-empty string.',
      });
    }

    if (!budgetCategoryId || typeof budgetCategoryId !== 'string') {
      return res.status(400).json({
        error: 'Invalid budget category',
        message: 'Budget category ID is required.',
      });
    }

    if (parentCategoryId !== undefined && typeof parentCategoryId !== 'string') {
      return res.status(400).json({
        error: 'Invalid parent category',
        message: 'Parent category ID must be a string if provided.',
      });
    }

    if (monthlyTarget !== undefined && (typeof monthlyTarget !== 'number' || monthlyTarget < 0)) {
      return res.status(400).json({
        error: 'Invalid monthly target',
        message: 'Monthly target must be a non-negative number if provided.',
      });
    }

    try {
      const createData: CreateSpendingCategoryData = {
        name: name.trim(),
        parentCategoryId: parentCategoryId || undefined,
        budgetCategoryId,
        icon: icon?.trim() || undefined,
        color: color?.trim() || undefined,
        monthlyTarget,
        description: description?.trim() || undefined,
      };

      const category = await SpendingCategoryService.createSpendingCategory(familyId, createData);

      const response: CreateSpendingCategoryResponse = {
        message: 'Spending category created successfully.',
        category: {
          id: category.id,
          name: category.name,
          parentCategoryId: category.parentCategoryId,
          budgetCategoryId: category.budgetCategoryId,
          icon: category.icon,
          color: category.color,
          monthlyTarget: category.monthlyTarget ? category.monthlyTarget.toNumber() : null,
          isActive: category.isActive,
          createdAt: category.createdAt.toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Create spending category error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Invalid budget category') {
          return res.status(400).json({
            error: 'Invalid budget category',
            message: 'The specified budget category does not exist.',
          });
        }

        if (serviceError.message === 'Invalid parent category') {
          return res.status(400).json({
            error: 'Invalid parent category',
            message: 'The specified parent category does not exist.',
          });
        }

        if (serviceError.message === 'Category name already exists') {
          return res.status(400).json({
            error: 'Category name already exists',
            message: 'A spending category with this name already exists.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to create spending category',
        message: 'Failed to create spending category. Please try again.',
      });
    }
  } catch (error) {
    console.error('Create spending category endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create spending category. Please try again.',
    });
  }
}