import { Request, Response } from 'express';
import { SpendingCategoryService } from '../../services/spending-category.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface SpendingCategoryInfo {
  id: string;
  name: string;
  parentCategoryId: string | null;
  budgetCategoryId: string;
  icon: string | null;
  color: string | null;
  monthlyTarget: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpendingCategoriesResponse {
  message: string;
  categories: SpendingCategoryInfo[];
  count: number;
}

export async function getSpendingCategories(req: AuthenticatedRequest, res: Response) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const parentCategoryId = req.query.parentCategoryId as string;
    const budgetCategoryId = req.query.budgetCategoryId as string;
    const searchTerm = req.query.search as string;

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
      const filters = {
        includeInactive,
        ...(parentCategoryId && { parentCategoryId }),
        ...(budgetCategoryId && { budgetCategoryId }),
        ...(searchTerm && { searchTerm }),
      };

      const categories = await SpendingCategoryService.getSpendingCategories(familyId, filters);

      const categoryData: SpendingCategoryInfo[] = categories.map((category) => ({
        id: category.id,
        name: category.name,
        parentCategoryId: category.parentCategoryId,
        budgetCategoryId: category.budgetCategoryId,
        icon: category.icon,
        color: category.color,
        monthlyTarget: category.monthlyTarget ? category.monthlyTarget.toNumber() : null,
        isActive: category.isActive,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      }));

      const response: SpendingCategoriesResponse = {
        message: 'Spending categories retrieved successfully.',
        categories: categoryData,
        count: categoryData.length,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get spending categories error:', serviceError);

      res.status(500).json({
        error: 'Failed to get spending categories',
        message: 'Failed to retrieve spending categories. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get spending categories endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve spending categories. Please try again.',
    });
  }
}