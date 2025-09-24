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

export interface AllocationHistoryEntry {
  id: string;
  incomeEventName: string;
  amount: number;
  percentage: number;
  createdAt: string;
}

export interface SpendingCategorySummary {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface MonthlyBudgetPerformance {
  month: string;
  allocated: number;
  spent: number;
  variance: number;
}

export interface BudgetCategoryDetailResponse {
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
  allocationHistory: AllocationHistoryEntry[];
  spendingCategories: SpendingCategorySummary[];
  monthlyPerformance: MonthlyBudgetPerformance[];
}

export async function getBudgetCategoryDetails(req: AuthenticatedRequest, res: Response) {
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
      // Get budget category with details
      const category = await BudgetService.getBudgetCategoryById(familyId, categoryId);

      if (!category) {
        return res.status(404).json({
          error: 'Budget category not found',
          message: 'The specified budget category was not found.',
        });
      }

      // Calculate current period metrics (using current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const performance = await BudgetService.getBudgetPerformance(familyId, startOfMonth, endOfMonth);
      const perfData = performance.find(p => p.categoryId === category.id);

      // Build allocation history
      const allocationHistory: AllocationHistoryEntry[] = (category as any).budgetAllocations?.map((allocation: any) => ({
        id: allocation.id,
        incomeEventName: allocation.incomeEvent?.name || 'Unknown Income',
        amount: allocation.amount.toNumber(),
        percentage: allocation.percentage.toNumber(),
        createdAt: allocation.createdAt.toISOString(),
      })) || [];

      // Build spending categories summary
      const spendingCategories: SpendingCategorySummary[] = (category as any).spendingCategories?.map((spendingCat: any) => ({
        id: spendingCat.id,
        name: spendingCat.name,
        color: '#000000', // Default color - would need to be added to schema
        icon: 'default', // Default icon - would need to be added to schema
      })) || [];

      // Generate monthly performance for last 6 months
      const monthlyPerformance: MonthlyBudgetPerformance[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfPeriod = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfPeriod = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        // Get performance for this month
        const monthPerformance = await BudgetService.getBudgetPerformance(familyId, startOfPeriod, endOfPeriod);
        const monthPerfData = monthPerformance.find(p => p.categoryId === category.id);

        monthlyPerformance.push({
          month: date.toISOString().split('T')[0].substring(0, 7), // YYYY-MM format
          allocated: monthPerfData?.targetAmount || 0,
          spent: monthPerfData?.actualAmount || 0,
          variance: monthPerfData ? monthPerfData.targetAmount - monthPerfData.actualAmount : 0,
        });
      }

      const response: BudgetCategoryDetailResponse = {
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
        allocationHistory,
        spendingCategories,
        monthlyPerformance,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get budget category details error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Budget category not found') {
          return res.status(404).json({
            error: 'Budget category not found',
            message: 'The specified budget category was not found.',
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
        error: 'Failed to get budget category details',
        message: 'Failed to retrieve budget category details. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get budget category details endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve budget category details. Please try again.',
    });
  }
}