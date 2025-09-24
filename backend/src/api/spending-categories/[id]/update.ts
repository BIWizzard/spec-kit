import { Request, Response } from 'express';
import { SpendingCategoryService, UpdateSpendingCategoryData } from '../../../services/spending-category.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface UpdateSpendingCategoryRequest {
  name?: string;
  parentCategoryId?: string;
  budgetCategoryId?: string;
  icon?: string;
  color?: string;
  monthlyTarget?: number;
  isActive?: boolean;
  description?: string;
}

export interface UpdateSpendingCategoryResponse {
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
    updatedAt: string;
  };
}

export async function updateSpendingCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: categoryId } = req.params;

    if (!categoryId || typeof categoryId !== 'string') {
      return res.status(400).json({
        error: 'Invalid category ID',
        message: 'Category ID is required and must be a valid string.',
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

    const {
      name,
      parentCategoryId,
      budgetCategoryId,
      icon,
      color,
      monthlyTarget,
      isActive,
      description,
    }: UpdateSpendingCategoryRequest = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Category name must be a non-empty string if provided.',
      });
    }

    if (budgetCategoryId !== undefined && typeof budgetCategoryId !== 'string') {
      return res.status(400).json({
        error: 'Invalid budget category',
        message: 'Budget category ID must be a string if provided.',
      });
    }

    if (monthlyTarget !== undefined && (typeof monthlyTarget !== 'number' || monthlyTarget < 0)) {
      return res.status(400).json({
        error: 'Invalid monthly target',
        message: 'Monthly target must be a non-negative number if provided.',
      });
    }

    try {
      const updateData: UpdateSpendingCategoryData = {};

      if (name !== undefined) updateData.name = name.trim();
      if (parentCategoryId !== undefined) updateData.parentCategoryId = parentCategoryId || null;
      if (budgetCategoryId !== undefined) updateData.budgetCategoryId = budgetCategoryId;
      if (icon !== undefined) updateData.icon = icon?.trim() || null;
      if (color !== undefined) updateData.color = color?.trim() || null;
      if (monthlyTarget !== undefined) updateData.monthlyTarget = monthlyTarget;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (description !== undefined) updateData.description = description?.trim() || null;

      const category = await SpendingCategoryService.updateSpendingCategory(familyId, categoryId, updateData);

      const response: UpdateSpendingCategoryResponse = {
        message: 'Spending category updated successfully.',
        category: {
          id: category.id,
          name: category.name,
          parentCategoryId: category.parentCategoryId,
          budgetCategoryId: category.budgetCategoryId,
          icon: category.icon,
          color: category.color,
          monthlyTarget: category.monthlyTarget ? category.monthlyTarget.toNumber() : null,
          isActive: category.isActive,
          updatedAt: category.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update spending category error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Category not found') {
          return res.status(404).json({
            error: 'Category not found',
            message: 'The spending category was not found.',
          });
        }

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
        error: 'Failed to update spending category',
        message: 'Failed to update spending category. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update spending category endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update spending category. Please try again.',
    });
  }
}