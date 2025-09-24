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

export async function getMonthlySummaryReport(req: AuthenticatedRequest, res: Response) {
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

    // Parse query parameters for month selection
    let targetMonth: Date;

    if (req.query.month) {
      // Accept YYYY-MM format
      const monthStr = req.query.month as string;
      const [year, month] = monthStr.split('-').map(Number);
      if (year && month && month >= 1 && month <= 12) {
        targetMonth = new Date(year, month - 1, 1);
      } else {
        return res.status(400).json({
          error: 'Invalid month format',
          details: 'Month must be in YYYY-MM format'
        });
      }
    } else {
      // Default to current month
      targetMonth = new Date();
      targetMonth.setDate(1);
    }

    // Generate the monthly summary
    const summaryData = await ReportsService.generateMonthlySummary(familyId, targetMonth);

    // Calculate month-over-month changes if we can get previous month
    const previousMonth = new Date(targetMonth);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousSummary = await ReportsService.generateMonthlySummary(familyId, previousMonth);

    const monthOverMonth = {
      income: {
        amount: summaryData.income.total - previousSummary.income.total,
        percentage: previousSummary.income.total > 0
          ? ((summaryData.income.total - previousSummary.income.total) / previousSummary.income.total) * 100
          : 0
      },
      expenses: {
        amount: summaryData.expenses.total - previousSummary.expenses.total,
        percentage: previousSummary.expenses.total > 0
          ? ((summaryData.expenses.total - previousSummary.expenses.total) / previousSummary.expenses.total) * 100
          : 0
      },
      netCashFlow: {
        amount: summaryData.netCashFlow - previousSummary.netCashFlow,
        percentage: previousSummary.netCashFlow !== 0
          ? ((summaryData.netCashFlow - previousSummary.netCashFlow) / Math.abs(previousSummary.netCashFlow)) * 100
          : 0
      },
      savingsRate: {
        points: summaryData.savingsRate - previousSummary.savingsRate,
        trend: summaryData.savingsRate > previousSummary.savingsRate ? 'improving' : 'declining'
      }
    };

    // Generate insights
    const insights = [];

    if (summaryData.netCashFlow < 0) {
      insights.push({
        type: 'warning',
        message: 'Expenses exceeded income this month',
        deficit: Math.abs(summaryData.netCashFlow)
      });
    }

    if (monthOverMonth.expenses.percentage > 10) {
      insights.push({
        type: 'alert',
        message: `Expenses increased ${monthOverMonth.expenses.percentage.toFixed(1)}% from last month`,
        increase: monthOverMonth.expenses.amount
      });
    }

    if (summaryData.savingsRate < 10) {
      insights.push({
        type: 'info',
        message: 'Low savings rate this month. Consider reviewing budget allocations.',
        currentRate: summaryData.savingsRate.toFixed(1)
      });
    }

    if (summaryData.budgetPerformance < 70) {
      insights.push({
        type: 'warning',
        message: 'Budget performance below target',
        score: summaryData.budgetPerformance
      });
    }

    // Identify unusual expenses
    const avgExpenseAmount = summaryData.expenses.total / Math.max(1, summaryData.topExpenses.length);
    const unusualExpenses = summaryData.topExpenses.filter(expense =>
      expense.amount > avgExpenseAmount * 2
    );

    if (unusualExpenses.length > 0) {
      insights.push({
        type: 'info',
        message: `${unusualExpenses.length} unusually large expenses detected`,
        expenses: unusualExpenses.slice(0, 3).map(e => ({
          description: e.description,
          amount: e.amount
        }))
      });
    }

    // Financial health indicators
    const financialHealth = {
      cashFlowStatus: summaryData.netCashFlow >= 0 ? 'positive' : 'negative',
      savingsStatus: summaryData.savingsRate >= 20 ? 'excellent' :
                     summaryData.savingsRate >= 10 ? 'good' :
                     summaryData.savingsRate >= 5 ? 'fair' : 'poor',
      budgetStatus: summaryData.budgetPerformance >= 90 ? 'excellent' :
                    summaryData.budgetPerformance >= 75 ? 'good' :
                    summaryData.budgetPerformance >= 60 ? 'fair' : 'poor',
      overallScore: Math.round(
        (summaryData.budgetPerformance * 0.4) +
        (Math.min(100, summaryData.savingsRate * 3) * 0.3) +
        ((summaryData.netCashFlow >= 0 ? 100 : 50) * 0.3)
      )
    };

    return res.status(200).json({
      month: summaryData.month,
      income: {
        ...summaryData.income,
        topSources: summaryData.income.sources.slice(0, 5)
      },
      expenses: {
        ...summaryData.expenses,
        topCategories: summaryData.expenses.categories.slice(0, 5)
      },
      cashFlow: {
        net: summaryData.netCashFlow,
        status: summaryData.netCashFlow >= 0 ? 'surplus' : 'deficit'
      },
      savings: {
        amount: summaryData.netCashFlow > 0 ? summaryData.netCashFlow : 0,
        rate: summaryData.savingsRate,
        monthlyTarget: summaryData.income.total * 0.2 // 20% target
      },
      budget: {
        performanceScore: summaryData.budgetPerformance,
        status: summaryData.budgetPerformance >= 75 ? 'on_track' : 'needs_attention'
      },
      topExpenses: summaryData.topExpenses.slice(0, 10),
      monthOverMonth,
      financialHealth,
      insights,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monthly summary report error:', error);
    return res.status(500).json({
      error: 'Failed to generate monthly summary report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}