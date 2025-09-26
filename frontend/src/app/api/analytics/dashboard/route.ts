import { NextRequest, NextResponse } from 'next/server';
import { ReportsService } from '@/lib/services/reports.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = authenticateRequest(request);

    const { familyId } = user;

    // Generate dashboard analytics using existing report services
    const currentDate = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const dateRange = {
      fromDate: lastMonth,
      toDate: currentDate
    };

    // Generate comprehensive dashboard data
    const [
      cashFlow,
      spendingAnalysis,
      budgetPerformance,
      netWorth,
      savingsRate
    ] = await Promise.all([
      ReportsService.generateCashFlowReport(familyId, dateRange, 'month'),
      ReportsService.generateSpendingAnalysis(familyId, dateRange),
      ReportsService.generateBudgetPerformance(familyId, dateRange),
      ReportsService.generateNetWorthReport(familyId),
      ReportsService.generateSavingsRateReport(familyId, dateRange, 20)
    ]);

    // Aggregate dashboard analytics
    const dashboardAnalytics = {
      summary: {
        totalIncome: cashFlow.reduce((sum, period) => sum + period.totalIncome, 0),
        totalExpenses: cashFlow.reduce((sum, period) => sum + period.totalExpenses, 0),
        netCashFlow: cashFlow.reduce((sum, period) => sum + period.netCashFlow, 0),
        netWorth: netWorth.currentNetWorth,
        savingsRate: savingsRate.currentSavingsRate,
      },
      cashFlowTrend: cashFlow.map(period => ({
        period: period.period,
        income: period.totalIncome,
        expenses: period.totalExpenses,
        netFlow: period.netCashFlow
      })),
      topSpendingCategories: spendingAnalysis.categoryBreakdown
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
      budgetOverview: {
        totalBudgeted: budgetPerformance.overallPerformance.totalBudgeted,
        totalSpent: budgetPerformance.overallPerformance.totalSpent,
        performanceScore: budgetPerformance.overallPerformance.performanceScore,
        categoriesOverBudget: budgetPerformance.categoryPerformance.filter(
          cat => cat.status === 'over_budget' || cat.status === 'way_over_budget'
        ).length
      },
      alerts: [
        ...budgetPerformance.categoryPerformance
          .filter(cat => cat.status === 'way_over_budget')
          .map(cat => ({
            type: 'budget_exceeded',
            message: `${cat.categoryName} is significantly over budget`,
            severity: 'high' as const
          })),
        ...(savingsRate.currentSavingsRate < savingsRate.targetSavingsRate ? [{
          type: 'savings_below_target',
          message: `Savings rate (${savingsRate.currentSavingsRate.toFixed(1)}%) is below target (${savingsRate.targetSavingsRate}%)`,
          severity: 'medium' as const
        }] : [])
      ]
    };

    return NextResponse.json(dashboardAnalytics);

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error generating dashboard analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard analytics' },
      { status: 500 }
    );
  }
}