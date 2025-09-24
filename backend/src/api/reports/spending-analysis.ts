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

export async function getSpendingAnalysisReport(req: AuthenticatedRequest, res: Response) {
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
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();
    const categoryId = req.query.categoryId as string;
    const merchantName = req.query.merchantName as string;

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

    // Generate the spending analysis report
    const spendingData = await ReportsService.generateSpendingAnalysis(
      familyId,
      { fromDate, toDate }
    );

    // Filter by category if specified
    let filteredData = spendingData;
    if (categoryId) {
      filteredData = {
        ...spendingData,
        categoryBreakdown: spendingData.categoryBreakdown.filter(cat => cat.categoryId === categoryId)
      };
    }

    // Filter by merchant if specified
    if (merchantName) {
      filteredData = {
        ...filteredData,
        topMerchants: filteredData.topMerchants.filter(merchant =>
          merchant.merchantName.toLowerCase().includes(merchantName.toLowerCase())
        )
      };
    }

    // Calculate additional insights
    const avgTransactionAmount = spendingData.totalSpent /
      spendingData.categoryBreakdown.reduce((sum, cat) => sum + cat.transactionCount, 0) || 0;

    const topCategory = spendingData.categoryBreakdown[0];
    const spendingVelocity = spendingData.totalSpent /
      Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));

    return res.status(200).json({
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      summary: {
        totalSpent: spendingData.totalSpent,
        avgTransactionAmount,
        numberOfTransactions: spendingData.categoryBreakdown.reduce((sum, cat) => sum + cat.transactionCount, 0),
        numberOfCategories: spendingData.categoryBreakdown.length,
        topCategory: topCategory ? {
          name: topCategory.categoryName,
          amount: topCategory.amount,
          percentage: topCategory.percentage
        } : null,
        dailyAverage: spendingVelocity
      },
      categoryBreakdown: filteredData.categoryBreakdown,
      monthlyTrends: filteredData.monthlyTrends,
      topMerchants: filteredData.topMerchants,
      filters: {
        categoryId: categoryId || null,
        merchantName: merchantName || null
      }
    });

  } catch (error) {
    console.error('Spending analysis report error:', error);
    return res.status(500).json({
      error: 'Failed to generate spending analysis report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}