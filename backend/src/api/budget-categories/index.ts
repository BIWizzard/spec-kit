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

export interface BudgetCategoryInfo {
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

export interface BudgetCategoriesResponse {
  categories: BudgetCategoryInfo[];
  summary: {
    totalPercentage: number;
    totalAllocated: number;
    isValid: boolean;
  };
}

export async function getBudgetCategories(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract query parameters
    const includeInactive = req.query.includeInactive === 'true';

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
      // Get budget categories
      const categories = await BudgetService.getBudgetCategories(familyId, includeInactive);

      // Calculate current period metrics (using current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const performance = await BudgetService.getBudgetPerformance(familyId, startOfMonth, endOfMonth);

      const categoryData: BudgetCategoryInfo[] = categories.map((category) => {
        const perfData = performance.find(p => p.categoryId === category.id);

        return {
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
      });

      // Calculate summary
      const totalPercentage = categories
        .filter(cat => cat.isActive)
        .reduce((sum, cat) => sum + cat.targetPercentage.toNumber(), 0);

      const totalAllocated = categoryData
        .filter(cat => cat.isActive)
        .reduce((sum, cat) => sum + cat.currentPeriodAllocated, 0);

      const response: BudgetCategoriesResponse = {
        categories: categoryData,
        summary: {
          totalPercentage,
          totalAllocated,
          isValid: Math.abs(totalPercentage - 100) < 0.01, // Allow small floating point differences
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get budget categories error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get budget categories',
        message: 'Failed to retrieve budget categories. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get budget categories endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve budget categories. Please try again.',
    });
  }
}