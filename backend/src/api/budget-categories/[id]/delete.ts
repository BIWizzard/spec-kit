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

export interface SuccessResponse {
  message: string;
}

export async function deleteBudgetCategory(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract category ID from path
    const categoryId = req.params.id;

    if (!categoryId || typeof categoryId !== 'string') {
      return res.status(400).json({
        error: 'Invalid category ID',
        message: 'Valid category ID is required.',
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
      // Delete budget category
      await BudgetService.deleteBudgetCategory(familyId, categoryId);

      const response: SuccessResponse = {
        message: 'Budget category deleted successfully.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete budget category error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Budget category not found') {
          return res.status(404).json({
            error: 'Budget category not found',
            message: 'The specified budget category was not found.',
          });
        }

        if (serviceError.message === 'Cannot delete budget category with active spending categories') {
          return res.status(400).json({
            error: 'Cannot delete category',
            message: 'Cannot delete budget category with active spending categories. Please reassign or deactivate spending categories first.',
          });
        }

        if (serviceError.message.includes('Cannot delete budget category with active allocations')) {
          return res.status(400).json({
            error: 'Cannot delete category',
            message: 'Cannot delete budget category with existing allocations. Please remove all allocations first.',
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
        error: 'Failed to delete budget category',
        message: 'Failed to delete budget category. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete budget category endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete budget category. Please try again.',
    });
  }
}