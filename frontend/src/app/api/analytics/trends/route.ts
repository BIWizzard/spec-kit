import { NextRequest, NextResponse } from 'next/server';
import { ReportsService } from '@/lib/services/reports.service';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload?.familyId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { familyId } = payload;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6months';
    const groupBy = searchParams.get('groupBy') || 'month';

    // Calculate date range based on period
    const currentDate = new Date();
    const fromDate = new Date();

    switch (period) {
      case '3months':
        fromDate.setMonth(fromDate.getMonth() - 3);
        break;
      case '6months':
        fromDate.setMonth(fromDate.getMonth() - 6);
        break;
      case '1year':
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        break;
      case '2years':
        fromDate.setFullYear(fromDate.getFullYear() - 2);
        break;
      default:
        fromDate.setMonth(fromDate.getMonth() - 6);
    }

    const dateRange = { fromDate, toDate: currentDate };

    // Generate trend analytics using existing report services
    const [
      cashFlowTrends,
      spendingAnalysis,
      budgetPerformance,
      incomeAnalysis,
      savingsRateReport
    ] = await Promise.all([
      ReportsService.generateCashFlowReport(familyId, dateRange, groupBy as any),
      ReportsService.generateSpendingAnalysis(familyId, dateRange),
      ReportsService.generateBudgetPerformance(familyId, dateRange),
      ReportsService.generateIncomeAnalysis(familyId, dateRange),
      ReportsService.generateSavingsRateReport(familyId, dateRange, 20)
    ]);

    // Calculate trends and patterns
    const trendsAnalytics = {
      cashFlowTrends: {
        periods: cashFlowTrends.map(period => ({
          period: period.period,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          income: period.totalIncome,
          expenses: period.totalExpenses,
          netFlow: period.netCashFlow
        })),
        trend: calculateTrend(cashFlowTrends.map(p => p.netCashFlow)),
        averageIncome: cashFlowTrends.reduce((sum, p) => sum + p.totalIncome, 0) / cashFlowTrends.length,
        averageExpenses: cashFlowTrends.reduce((sum, p) => sum + p.totalExpenses, 0) / cashFlowTrends.length
      },
      spendingTrends: {
        monthlyTrends: spendingAnalysis.monthlyTrends,
        categoryTrends: spendingAnalysis.categoryBreakdown.map(cat => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          totalAmount: cat.amount,
          averageTransaction: cat.averageTransaction,
          trend: calculateTrend(
            spendingAnalysis.monthlyTrends.map(month =>
              month.categoryBreakdown.find(c => c.categoryId === cat.categoryId)?.amount || 0
            )
          )
        }))
      },
      budgetTrends: {
        monthlyPerformance: budgetPerformance.monthlyTrends,
        overallTrend: calculateTrend(budgetPerformance.monthlyTrends.map(m => m.performanceScore)),
        categoryPerformance: budgetPerformance.categoryPerformance.map(cat => ({
          ...cat,
          trend: 'stable' as const // Would need historical data for actual trend calculation
        }))
      },
      incomeTrends: {
        monthlyTrends: incomeAnalysis.monthlyTrends,
        totalTrend: calculateTrend(incomeAnalysis.monthlyTrends.map(m => m.amount)),
        regularIncomeTrend: calculateTrend(incomeAnalysis.monthlyTrends.map(m => m.regularAmount)),
        irregularIncomeTrend: calculateTrend(incomeAnalysis.monthlyTrends.map(m => m.irregularAmount)),
        consistencyScore: incomeAnalysis.incomeConsistency
      },
      savingsTrends: {
        currentRate: savingsRateReport.currentSavingsRate,
        targetRate: savingsRateReport.targetSavingsRate,
        monthlyRates: savingsRateReport.monthlyBreakdown || [],
        trend: calculateTrend(savingsRateReport.monthlyBreakdown?.map(m => m.savingsRate) || [])
      },
      insights: generateTrendInsights(cashFlowTrends, spendingAnalysis, budgetPerformance, incomeAnalysis)
    };

    return NextResponse.json(trendsAnalytics);

  } catch (error) {
    console.error('Error generating trends analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate trends analytics' },
      { status: 500 }
    );
  }
}

// Helper function to calculate trend direction
function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const changePercent = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;

  if (changePercent > 5) return 'increasing';
  if (changePercent < -5) return 'decreasing';
  return 'stable';
}

// Helper function to generate insights
function generateTrendInsights(cashFlow: any[], spending: any, budget: any, income: any): string[] {
  const insights: string[] = [];

  // Cash flow insights
  const netFlowTrend = calculateTrend(cashFlow.map(p => p.netCashFlow));
  if (netFlowTrend === 'decreasing') {
    insights.push('Your net cash flow has been declining over the selected period');
  } else if (netFlowTrend === 'increasing') {
    insights.push('Your net cash flow has been improving over the selected period');
  }

  // Spending insights
  const topCategory = spending.categoryBreakdown[0];
  if (topCategory) {
    insights.push(`${topCategory.categoryName} is your largest spending category at ${topCategory.percentage.toFixed(1)}% of total expenses`);
  }

  // Budget insights
  if (budget.overallPerformance.performanceScore < 70) {
    insights.push('Your overall budget performance could be improved');
  }

  // Income insights
  if (income.incomeConsistency < 80) {
    insights.push('Your income shows significant variability - consider building a larger emergency fund');
  }

  return insights;
}