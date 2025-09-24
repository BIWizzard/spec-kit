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

export async function getBudgetOverview(req: AuthenticatedRequest, res: Response) {
  try {
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

    // Parse query parameters
    const { period = 'current' } = req.query;

    try {
      // Get budget overview
      const overview = await BudgetService.getBudgetOverview(familyId, period as string);

      res.status(200).json({
        period,
        summary: {
          totalIncome: overview.totalIncome,
          totalBudgeted: overview.totalBudgeted,
          totalSpent: overview.totalSpent,
          totalRemaining: overview.totalRemaining,
          budgetUtilization: overview.budgetUtilization,
          savingsRate: overview.savingsRate,
        },
        categories: overview.categories.map(category => ({
          id: category.id,
          name: category.name,
          type: category.type,
          budgetedAmount: category.budgetedAmount,
          spentAmount: category.spentAmount,
          remainingAmount: category.remainingAmount,
          utilization: category.utilization,
          status: category.status, // 'under_budget', 'on_budget', 'over_budget'
          trend: category.trend, // 'increasing', 'stable', 'decreasing'
          lastUpdated: category.lastUpdated,
        })),
        recentTransactions: overview.recentTransactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          description: transaction.description,
          category: transaction.category,
          date: transaction.date,
          accountName: transaction.accountName,
        })),
        alerts: overview.alerts.map(alert => ({
          id: alert.id,
          type: alert.type, // 'over_budget', 'low_remaining', 'unusual_spending'
          severity: alert.severity, // 'low', 'medium', 'high'
          message: alert.message,
          categoryId: alert.categoryId,
          categoryName: alert.categoryName,
          amount: alert.amount,
          createdAt: alert.createdAt,
        })),
        projections: {
          endOfPeriodBalance: overview.projections.endOfPeriodBalance,
          projectedSavings: overview.projections.projectedSavings,
          categoryProjections: overview.projections.categoryProjections.map(proj => ({
            categoryId: proj.categoryId,
            categoryName: proj.categoryName,
            projectedSpend: proj.projectedSpend,
            projectedRemaining: proj.projectedRemaining,
            confidenceLevel: proj.confidenceLevel,
          })),
        },
        insights: overview.insights || [],
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get budget overview error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Budget categories not found') {
          return res.status(404).json({
            error: 'Budget categories not found',
            message: 'No budget categories found for this family.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get budget overview',
        message: 'Failed to retrieve budget overview. Please try again.',
      });
    }
  } catch (error) {
    console.error('Budget overview endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve budget overview. Please try again.',
    });
  }
}