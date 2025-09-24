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

export async function getBudgetPerformance(req: AuthenticatedRequest, res: Response) {
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
    const {
      startDate,
      endDate,
      period = '3months',
      categoryId
    } = req.query;

    try {
      // Get budget performance
      const performance = await BudgetService.getBudgetPerformance(familyId, {
        startDate: startDate as string,
        endDate: endDate as string,
        period: period as string,
        categoryId: categoryId as string,
      });

      res.status(200).json({
        period,
        dateRange: {
          startDate: performance.dateRange.startDate,
          endDate: performance.dateRange.endDate,
        },
        overallPerformance: {
          totalBudgeted: performance.overallPerformance.totalBudgeted,
          totalSpent: performance.overallPerformance.totalSpent,
          totalVariance: performance.overallPerformance.totalVariance,
          variancePercentage: performance.overallPerformance.variancePercentage,
          performanceScore: performance.overallPerformance.performanceScore, // 0-100
          budgetAdherence: performance.overallPerformance.budgetAdherence, // percentage
          averageDailySpend: performance.overallPerformance.averageDailySpend,
          trend: performance.overallPerformance.trend, // 'improving', 'stable', 'declining'
        },
        categoryPerformance: performance.categoryPerformance.map(category => ({
          id: category.id,
          name: category.name,
          type: category.type,
          budgetedAmount: category.budgetedAmount,
          spentAmount: category.spentAmount,
          variance: category.variance,
          variancePercentage: category.variancePercentage,
          performanceRating: category.performanceRating, // 'excellent', 'good', 'poor', 'over_budget'
          consistency: category.consistency, // how consistent spending is
          trend: category.trend,
          monthlyBreakdown: category.monthlyBreakdown.map(month => ({
            month: month.month,
            budgeted: month.budgeted,
            spent: month.spent,
            variance: month.variance,
          })),
          recommendations: category.recommendations,
        })),
        trends: {
          spendingTrend: performance.trends.spendingTrend.map(point => ({
            date: point.date,
            amount: point.amount,
            budgetAmount: point.budgetAmount,
            variance: point.variance,
          })),
          categoryTrends: performance.trends.categoryTrends.map(trend => ({
            categoryId: trend.categoryId,
            categoryName: trend.categoryName,
            data: trend.data.map(point => ({
              date: point.date,
              amount: point.amount,
              budgetAmount: point.budgetAmount,
            })),
            trendDirection: trend.trendDirection, // 'up', 'down', 'stable'
            volatility: trend.volatility, // 'high', 'medium', 'low'
          })),
        },
        insights: performance.insights.map(insight => ({
          type: insight.type, // 'budget_variance', 'spending_pattern', 'seasonal_trend'
          severity: insight.severity,
          title: insight.title,
          description: insight.description,
          categoryId: insight.categoryId,
          categoryName: insight.categoryName,
          impact: insight.impact, // financial impact
          recommendation: insight.recommendation,
          actionable: insight.actionable,
        })),
        comparisons: {
          previousPeriod: performance.comparisons.previousPeriod && {
            totalSpent: performance.comparisons.previousPeriod.totalSpent,
            variance: performance.comparisons.previousPeriod.variance,
            variancePercentage: performance.comparisons.previousPeriod.variancePercentage,
            performanceChange: performance.comparisons.previousPeriod.performanceChange,
          },
          familyAverage: performance.comparisons.familyAverage && {
            totalSpent: performance.comparisons.familyAverage.totalSpent,
            variance: performance.comparisons.familyAverage.variance,
            performanceRank: performance.comparisons.familyAverage.performanceRank,
          },
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get budget performance error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Budget data not found') {
          return res.status(404).json({
            error: 'Budget data not found',
            message: 'No budget data found for the specified period.',
          });
        }

        if (serviceError.message === 'Invalid date range') {
          return res.status(400).json({
            error: 'Invalid date range',
            message: 'The specified date range is invalid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get budget performance',
        message: 'Failed to retrieve budget performance data. Please try again.',
      });
    }
  } catch (error) {
    console.error('Budget performance endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve budget performance data. Please try again.',
    });
  }
}