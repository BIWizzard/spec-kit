import { Request, Response } from 'express';
import { ReportsService } from '../../services/reports.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getBudgetPerformanceReport(req: AuthenticatedRequest, res: Response) {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        details: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.slice(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token',
        details: 'Token is invalid or expired'
      });
    }

    const familyId = decoded.familyId;
    if (!familyId) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'User must belong to a family to access reports'
      });
    }

    // Parse query parameters
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();
    const categoryId = req.query.categoryId as string;

    // Validate date range
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        details: 'Dates must be in ISO format (YYYY-MM-DD)'
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        error: 'Invalid date range',
        details: 'fromDate must be before toDate'
      });
    }

    // Generate the budget performance report
    const performanceData = await ReportsService.generateBudgetPerformance(
      familyId,
      { fromDate, toDate }
    );

    // Filter by category if specified
    let filteredCategories = performanceData.categoryPerformance;
    if (categoryId) {
      filteredCategories = performanceData.categoryPerformance.filter(cat => cat.categoryId === categoryId);
    }

    // Calculate additional insights
    const categoriesOverBudget = performanceData.categoryPerformance.filter(
      cat => cat.status === 'over_budget' || cat.status === 'way_over_budget'
    );

    const categoriesUnderBudget = performanceData.categoryPerformance.filter(
      cat => cat.status === 'under_budget'
    );

    const averagePerformance = performanceData.categoryPerformance.reduce(
      (sum, cat) => sum + cat.performancePercentage, 0
    ) / Math.max(1, performanceData.categoryPerformance.length);

    // Generate recommendations
    const recommendations = [];
    if (categoriesOverBudget.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${categoriesOverBudget.length} categories are over budget`,
        categories: categoriesOverBudget.map(c => c.categoryName)
      });
    }

    if (performanceData.overallPerformance.performanceScore < 70) {
      recommendations.push({
        type: 'alert',
        message: 'Overall budget performance is below target. Consider reviewing spending habits.',
        score: performanceData.overallPerformance.performanceScore
      });
    }

    if (categoriesUnderBudget.length > performanceData.categoryPerformance.length * 0.5) {
      recommendations.push({
        type: 'info',
        message: 'More than half of categories are under budget. Consider reallocating funds.',
        categories: categoriesUnderBudget.map(c => c.categoryName).slice(0, 3)
      });
    }

    return res.status(200).json({
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      overallPerformance: {
        ...performanceData.overallPerformance,
        utilizationRate: performanceData.overallPerformance.totalBudgeted > 0
          ? (performanceData.overallPerformance.totalSpent / performanceData.overallPerformance.totalBudgeted) * 100
          : 0
      },
      insights: {
        averagePerformance,
        categoriesOverBudget: categoriesOverBudget.length,
        categoriesUnderBudget: categoriesUnderBudget.length,
        categoriesOnTrack: performanceData.categoryPerformance.filter(cat => cat.status === 'on_track').length,
        topOverspendingCategory: categoriesOverBudget[0] || null
      },
      categoryPerformance: filteredCategories,
      monthlyTrends: performanceData.monthlyTrends,
      recommendations,
      filters: {
        categoryId: categoryId || null
      }
    });

  } catch (error) {
    console.error('Budget performance report error:', error);
    return res.status(500).json({
      error: 'Failed to generate budget performance report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}