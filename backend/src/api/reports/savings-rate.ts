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

export async function getSavingsRateReport(req: AuthenticatedRequest, res: Response) {
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
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1);
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();
    const targetSavingsRate = req.query.targetRate ? parseFloat(req.query.targetRate as string) : 20;

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

    // Validate target savings rate
    if (isNaN(targetSavingsRate) || targetSavingsRate < 0 || targetSavingsRate > 100) {
      return res.status(400).json({
        error: 'Invalid target savings rate',
        details: 'Target rate must be between 0 and 100'
      });
    }

    // Generate the savings rate report
    const savingsData = await ReportsService.generateSavingsRateReport(
      familyId,
      { fromDate, toDate },
      targetSavingsRate
    );

    // Calculate additional metrics
    const monthsAboveTarget = savingsData.monthlyData.filter(
      month => month.savingsRate >= targetSavingsRate
    ).length;

    const targetAchievementRate = savingsData.monthlyData.length > 0
      ? (monthsAboveTarget / savingsData.monthlyData.length) * 100
      : 0;

    const bestMonth = savingsData.monthlyData.reduce((best, current) =>
      current.savingsRate > best.savingsRate ? current : best,
      savingsData.monthlyData[0] || { month: '', savingsRate: 0 }
    );

    const worstMonth = savingsData.monthlyData.reduce((worst, current) =>
      current.savingsRate < worst.savingsRate ? current : worst,
      savingsData.monthlyData[0] || { month: '', savingsRate: 0 }
    );

    const totalSaved = savingsData.monthlyData.reduce((sum, month) => sum + month.savings, 0);
    const totalIncome = savingsData.monthlyData.reduce((sum, month) => sum + month.income, 0);
    const totalExpenses = savingsData.monthlyData.reduce((sum, month) => sum + month.expenses, 0);

    // Generate recommendations
    const recommendations = [];

    if (savingsData.currentSavingsRate < targetSavingsRate) {
      const gap = targetSavingsRate - savingsData.currentSavingsRate;
      recommendations.push({
        type: 'warning',
        message: `Current savings rate is ${gap.toFixed(1)}% below target`,
        currentRate: savingsData.currentSavingsRate.toFixed(1),
        targetRate: targetSavingsRate
      });
    }

    if (savingsData.savingsTrend === 'decreasing') {
      recommendations.push({
        type: 'alert',
        message: 'Savings rate is trending downward. Review recent spending increases.',
        trend: 'decreasing'
      });
    }

    if (targetAchievementRate < 50) {
      recommendations.push({
        type: 'info',
        message: `Target savings rate achieved only ${targetAchievementRate.toFixed(0)}% of the time`,
        suggestion: 'Consider adjusting budget allocations or target rate'
      });
    }

    if (savingsData.averageSavingsRate < 10) {
      recommendations.push({
        type: 'critical',
        message: 'Low average savings rate may impact long-term financial goals',
        averageRate: savingsData.averageSavingsRate.toFixed(1)
      });
    }

    // Calculate projected annual savings
    const projectedAnnualSavings = savingsData.averageSavingsRate > 0
      ? (totalIncome / savingsData.monthlyData.length) * 12 * (savingsData.averageSavingsRate / 100)
      : 0;

    return res.status(200).json({
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      summary: {
        currentSavingsRate: savingsData.currentSavingsRate,
        averageSavingsRate: savingsData.averageSavingsRate,
        targetSavingsRate,
        targetAchievementRate,
        savingsTrend: savingsData.savingsTrend,
        totalSaved,
        totalIncome,
        totalExpenses
      },
      metrics: {
        monthsAnalyzed: savingsData.monthlyData.length,
        monthsAboveTarget,
        bestMonth: bestMonth ? {
          month: bestMonth.month,
          rate: bestMonth.savingsRate,
          amount: bestMonth.savings
        } : null,
        worstMonth: worstMonth ? {
          month: worstMonth.month,
          rate: worstMonth.savingsRate,
          amount: worstMonth.savings
        } : null,
        projectedAnnualSavings
      },
      monthlyData: savingsData.monthlyData.map(month => ({
        ...month,
        meetsTarget: month.savingsRate >= targetSavingsRate,
        gapToTarget: targetSavingsRate - month.savingsRate
      })),
      recommendations
    });

  } catch (error) {
    console.error('Savings rate report error:', error);
    return res.status(500).json({
      error: 'Failed to generate savings rate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}