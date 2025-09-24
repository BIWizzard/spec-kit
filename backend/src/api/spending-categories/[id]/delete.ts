import { Request, Response } from 'express';
import { SpendingCategoryService } from '../../../services/spending-category.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface DeleteSpendingCategoryResponse {
  message: string;
  categoryId: string;
}

export async function deleteSpendingCategory(req: AuthenticatedRequest, res: Response) {
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

    try {
      await SpendingCategoryService.deleteSpendingCategory(familyId, categoryId);

      const response: DeleteSpendingCategoryResponse = {
        message: 'Spending category deleted successfully.',
        categoryId,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete spending category error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Category not found') {
          return res.status(404).json({
            error: 'Category not found',
            message: 'The spending category was not found.',
          });
        }

        if (serviceError.message === 'Category has associated payments') {
          return res.status(400).json({
            error: 'Category has associated payments',
            message: 'Cannot delete spending category that has associated payments. Move or delete the payments first.',
          });
        }

        if (serviceError.message === 'Category has child categories') {
          return res.status(400).json({
            error: 'Category has child categories',
            message: 'Cannot delete spending category that has child categories. Delete or reassign child categories first.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to delete spending category',
        message: 'Failed to delete spending category. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete spending category endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete spending category. Please try again.',
    });
  }
}