import { Request, Response } from 'express';
import { ReportsService } from '../../services/reports.service';
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

export async function getAnalyticsDashboard(req: AuthenticatedRequest, res: Response) {
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
      period = '30days',
      refresh = 'false'
    } = req.query;

    try {
      // Get comprehensive dashboard analytics
      const dashboard = await ReportsService.getAnalyticsDashboard(familyId, {
        period: period as string,
        forceRefresh: refresh === 'true',
      });

      res.status(200).json({
        period,
        dateRange: {
          startDate: dashboard.dateRange.startDate,
          endDate: dashboard.dateRange.endDate,
        },
        summary: {
          totalIncome: dashboard.summary.totalIncome,
          totalExpenses: dashboard.summary.totalExpenses,
          netCashFlow: dashboard.summary.netCashFlow,
          savingsRate: dashboard.summary.savingsRate,
          budgetAdherence: dashboard.summary.budgetAdherence,
          transactionCount: dashboard.summary.transactionCount,
          averageDailySpend: dashboard.summary.averageDailySpend,
          financialHealth: dashboard.summary.financialHealth, // 'excellent', 'good', 'fair', 'poor'
        },
        trends: {
          income: {
            current: dashboard.trends.income.current,
            previous: dashboard.trends.income.previous,
            change: dashboard.trends.income.change,
            changePercentage: dashboard.trends.income.changePercentage,
            trend: dashboard.trends.income.trend, // 'up', 'down', 'stable'
          },
          expenses: {
            current: dashboard.trends.expenses.current,
            previous: dashboard.trends.expenses.previous,
            change: dashboard.trends.expenses.change,
            changePercentage: dashboard.trends.expenses.changePercentage,
            trend: dashboard.trends.expenses.trend,
          },
          savings: {
            current: dashboard.trends.savings.current,
            previous: dashboard.trends.savings.previous,
            change: dashboard.trends.savings.change,
            changePercentage: dashboard.trends.savings.changePercentage,
            trend: dashboard.trends.savings.trend,
          },
        },
        categoryBreakdown: {
          topSpendingCategories: dashboard.categoryBreakdown.topSpendingCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            amount: cat.amount,
            percentage: cat.percentage,
            trend: cat.trend,
            budget: cat.budget,
            variance: cat.variance,
          })),
          budgetPerformance: dashboard.categoryBreakdown.budgetPerformance.map(perf => ({
            categoryId: perf.categoryId,
            categoryName: perf.categoryName,
            budgetAmount: perf.budgetAmount,
            spentAmount: perf.spentAmount,
            remainingAmount: perf.remainingAmount,
            utilization: perf.utilization,
            status: perf.status, // 'under_budget', 'on_budget', 'over_budget'
          })),
        },
        cashFlow: {
          dailyFlow: dashboard.cashFlow.dailyFlow.map(day => ({
            date: day.date,
            income: day.income,
            expenses: day.expenses,
            netFlow: day.netFlow,
            runningBalance: day.runningBalance,
          })),
          weeklyTrend: dashboard.cashFlow.weeklyTrend.map(week => ({
            weekStart: week.weekStart,
            weekEnd: week.weekEnd,
            income: week.income,
            expenses: week.expenses,
            netFlow: week.netFlow,
            averageDaily: week.averageDaily,
          })),
          projectedBalance: dashboard.cashFlow.projectedBalance,
          cashFlowHealth: dashboard.cashFlow.cashFlowHealth, // 'positive', 'stable', 'concerning', 'critical'
        },
        insights: dashboard.insights.map(insight => ({
          id: insight.id,
          type: insight.type, // 'spending_alert', 'budget_warning', 'savings_opportunity', 'trend_analysis'
          priority: insight.priority, // 'high', 'medium', 'low'
          title: insight.title,
          description: insight.description,
          impact: insight.impact, // 'positive', 'negative', 'neutral'
          recommendation: insight.recommendation,
          actionRequired: insight.actionRequired,
          estimatedSavings: insight.estimatedSavings,
          relatedCategories: insight.relatedCategories,
          createdAt: insight.createdAt,
        })),
        alerts: dashboard.alerts.map(alert => ({
          id: alert.id,
          type: alert.type, // 'budget_exceeded', 'unusual_spending', 'low_balance', 'payment_due'
          severity: alert.severity, // 'critical', 'warning', 'info'
          message: alert.message,
          amount: alert.amount,
          categoryId: alert.categoryId,
          categoryName: alert.categoryName,
          dueDate: alert.dueDate,
          isActive: alert.isActive,
          createdAt: alert.createdAt,
        })),
        goals: {
          savingsGoals: dashboard.goals.savingsGoals.map(goal => ({
            id: goal.id,
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            progress: goal.progress,
            targetDate: goal.targetDate,
            onTrack: goal.onTrack,
            projectedCompletion: goal.projectedCompletion,
          })),
          budgetGoals: dashboard.goals.budgetGoals.map(goal => ({
            id: goal.id,
            categoryId: goal.categoryId,
            categoryName: goal.categoryName,
            targetAmount: goal.targetAmount,
            currentSpend: goal.currentSpend,
            progress: goal.progress,
            status: goal.status,
            daysRemaining: goal.daysRemaining,
          })),
        },
        upcomingEvents: {
          incomeEvents: dashboard.upcomingEvents.incomeEvents.map(event => ({
            id: event.id,
            description: event.description,
            amount: event.amount,
            expectedDate: event.expectedDate,
            probability: event.probability,
            isRecurring: event.isRecurring,
          })),
          paymentDue: dashboard.upcomingEvents.paymentDue.map(payment => ({
            id: payment.id,
            description: payment.description,
            amount: payment.amount,
            dueDate: payment.dueDate,
            categoryName: payment.categoryName,
            priority: payment.priority,
            isOverdue: payment.isOverdue,
          })),
        },
        performance: {
          monthToDate: dashboard.performance.monthToDate,
          quarterToDate: dashboard.performance.quarterToDate,
          yearToDate: dashboard.performance.yearToDate,
          comparisonToPreviousPeriod: dashboard.performance.comparisonToPreviousPeriod,
          benchmarkComparison: dashboard.performance.benchmarkComparison,
        },
        metadata: {
          lastUpdated: dashboard.metadata.lastUpdated,
          refreshInterval: dashboard.metadata.refreshInterval,
          dataAccuracy: dashboard.metadata.dataAccuracy,
          coveragePeriod: dashboard.metadata.coveragePeriod,
          totalDataPoints: dashboard.metadata.totalDataPoints,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get analytics dashboard error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Insufficient data') {
          return res.status(400).json({
            error: 'Insufficient data',
            message: 'Not enough data available to generate analytics dashboard.',
          });
        }

        if (serviceError.message === 'Invalid period') {
          return res.status(400).json({
            error: 'Invalid period',
            message: 'The specified period is invalid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get analytics dashboard',
        message: 'Failed to retrieve analytics dashboard. Please try again.',
      });
    }
  } catch (error) {
    console.error('Analytics dashboard endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve analytics dashboard. Please try again.',
    });
  }
}