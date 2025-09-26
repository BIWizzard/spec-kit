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

    // Generate comprehensive insights using existing report services
    const currentDate = new Date();
    const lastThreeMonths = new Date();
    lastThreeMonths.setMonth(lastThreeMonths.getMonth() - 3);
    const lastSixMonths = new Date();
    lastSixMonths.setMonth(lastSixMonths.getMonth() - 6);
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const threeMonthRange = { fromDate: lastThreeMonths, toDate: currentDate };
    const sixMonthRange = { fromDate: lastSixMonths, toDate: currentDate };
    const yearRange = { fromDate: lastYear, toDate: currentDate };

    // Generate comprehensive analytics for insights
    const [
      recentCashFlow,
      longerCashFlow,
      spendingAnalysis,
      budgetPerformance,
      incomeAnalysis,
      netWorth,
      savingsRate
    ] = await Promise.all([
      ReportsService.generateCashFlowReport(familyId, threeMonthRange, 'month'),
      ReportsService.generateCashFlowReport(familyId, sixMonthRange, 'month'),
      ReportsService.generateSpendingAnalysis(familyId, sixMonthRange),
      ReportsService.generateBudgetPerformance(familyId, threeMonthRange),
      ReportsService.generateIncomeAnalysis(familyId, sixMonthRange),
      ReportsService.generateNetWorthReport(familyId),
      ReportsService.generateSavingsRateReport(familyId, sixMonthRange, 20)
    ]);

    // Generate actionable insights
    const insights = {
      financialHealth: {
        score: calculateFinancialHealthScore(budgetPerformance, savingsRate, incomeAnalysis),
        factors: [
          {
            category: 'Budget Management',
            score: budgetPerformance.overallPerformance.performanceScore,
            status: budgetPerformance.overallPerformance.performanceScore >= 80 ? 'excellent' :
                   budgetPerformance.overallPerformance.performanceScore >= 60 ? 'good' : 'needs_improvement'
          },
          {
            category: 'Savings Rate',
            score: (savingsRate.currentSavingsRate / savingsRate.targetSavingsRate) * 100,
            status: savingsRate.currentSavingsRate >= savingsRate.targetSavingsRate ? 'excellent' :
                   savingsRate.currentSavingsRate >= savingsRate.targetSavingsRate * 0.8 ? 'good' : 'needs_improvement'
          },
          {
            category: 'Income Consistency',
            score: incomeAnalysis.incomeConsistency,
            status: incomeAnalysis.incomeConsistency >= 85 ? 'excellent' :
                   incomeAnalysis.incomeConsistency >= 70 ? 'good' : 'needs_improvement'
          }
        ]
      },
      spendingInsights: generateSpendingInsights(spendingAnalysis, recentCashFlow, longerCashFlow),
      budgetInsights: generateBudgetInsights(budgetPerformance),
      savingsOpportunities: generateSavingsOpportunities(spendingAnalysis, budgetPerformance, savingsRate),
      riskFactors: generateRiskFactors(incomeAnalysis, budgetPerformance, netWorth),
      recommendations: generateRecommendations(
        spendingAnalysis,
        budgetPerformance,
        incomeAnalysis,
        savingsRate,
        netWorth
      ),
      monthlyComparison: {
        currentMonth: recentCashFlow[recentCashFlow.length - 1],
        previousMonth: recentCashFlow[recentCashFlow.length - 2],
        averageLastSixMonths: {
          income: longerCashFlow.reduce((sum, p) => sum + p.totalIncome, 0) / longerCashFlow.length,
          expenses: longerCashFlow.reduce((sum, p) => sum + p.totalExpenses, 0) / longerCashFlow.length,
          netFlow: longerCashFlow.reduce((sum, p) => sum + p.netCashFlow, 0) / longerCashFlow.length
        }
      }
    };

    return NextResponse.json(insights);

  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

function calculateFinancialHealthScore(budget: any, savings: any, income: any): number {
  const budgetScore = budget.overallPerformance.performanceScore;
  const savingsScore = Math.min((savings.currentSavingsRate / savings.targetSavingsRate) * 100, 100);
  const incomeScore = income.incomeConsistency;

  return Math.round((budgetScore * 0.4 + savingsScore * 0.35 + incomeScore * 0.25));
}

function generateSpendingInsights(spending: any, recent: any[], longer: any[]): any[] {
  const insights = [];

  // Spending trend analysis
  const recentAvg = recent.reduce((sum, p) => sum + p.totalExpenses, 0) / recent.length;
  const longerAvg = longer.reduce((sum, p) => sum + p.totalExpenses, 0) / longer.length;
  const spendingChange = ((recentAvg - longerAvg) / longerAvg) * 100;

  if (spendingChange > 10) {
    insights.push({
      type: 'spending_increase',
      message: `Your spending has increased by ${spendingChange.toFixed(1)}% in recent months`,
      impact: 'negative',
      actionable: true
    });
  } else if (spendingChange < -10) {
    insights.push({
      type: 'spending_decrease',
      message: `Great job! Your spending has decreased by ${Math.abs(spendingChange).toFixed(1)}% in recent months`,
      impact: 'positive',
      actionable: false
    });
  }

  // Top spending category insight
  const topCategory = spending.categoryBreakdown[0];
  if (topCategory && topCategory.percentage > 40) {
    insights.push({
      type: 'category_dominance',
      message: `${topCategory.categoryName} accounts for ${topCategory.percentage.toFixed(1)}% of your spending - consider ways to optimize this category`,
      impact: 'neutral',
      actionable: true
    });
  }

  return insights;
}

function generateBudgetInsights(budget: any): any[] {
  const insights = [];

  const overBudgetCategories = budget.categoryPerformance.filter(
    (cat: any) => cat.status === 'over_budget' || cat.status === 'way_over_budget'
  );

  if (overBudgetCategories.length > 0) {
    insights.push({
      type: 'budget_overruns',
      message: `${overBudgetCategories.length} categories are over budget this period`,
      categories: overBudgetCategories.map((cat: any) => cat.categoryName),
      impact: 'negative',
      actionable: true
    });
  }

  const wellManagedCategories = budget.categoryPerformance.filter(
    (cat: any) => cat.status === 'under_budget' && cat.performancePercentage < 80
  );

  if (wellManagedCategories.length > 0) {
    insights.push({
      type: 'budget_efficiency',
      message: `You're managing ${wellManagedCategories.length} categories very efficiently with room for strategic reallocation`,
      categories: wellManagedCategories.map((cat: any) => cat.categoryName),
      impact: 'positive',
      actionable: true
    });
  }

  return insights;
}

function generateSavingsOpportunities(spending: any, budget: any, savings: any): any[] {
  const opportunities = [];

  // Low utilization budget categories
  const underutilizedCategories = budget.categoryPerformance.filter(
    (cat: any) => cat.performancePercentage < 70
  );

  if (underutilizedCategories.length > 0) {
    const potentialSavings = underutilizedCategories.reduce(
      (sum: number, cat: any) => sum + cat.remaining, 0
    );
    opportunities.push({
      type: 'budget_reallocation',
      message: `You could redirect $${potentialSavings.toFixed(2)} from underutilized budget categories to savings`,
      amount: potentialSavings,
      categories: underutilizedCategories.map((cat: any) => cat.categoryName)
    });
  }

  // High-frequency, low-value transactions
  const frequentCategories = spending.categoryBreakdown.filter(
    (cat: any) => cat.transactionCount > 20 && cat.averageTransaction < 25
  );

  if (frequentCategories.length > 0) {
    opportunities.push({
      type: 'small_expenses',
      message: 'You have many small, frequent expenses that could add up to significant savings if reduced',
      categories: frequentCategories.map((cat: any) => cat.categoryName)
    });
  }

  return opportunities;
}

function generateRiskFactors(income: any, budget: any, netWorth: any): any[] {
  const risks = [];

  if (income.incomeConsistency < 70) {
    risks.push({
      type: 'income_volatility',
      severity: 'medium',
      message: 'Your income shows high variability, which could impact financial stability',
      recommendation: 'Consider building a larger emergency fund'
    });
  }

  const overBudgetCount = budget.categoryPerformance.filter(
    (cat: any) => cat.status === 'over_budget' || cat.status === 'way_over_budget'
  ).length;

  if (overBudgetCount > 3) {
    risks.push({
      type: 'budget_control',
      severity: 'high',
      message: 'Multiple budget categories are consistently over budget',
      recommendation: 'Review and adjust budget allocations or spending habits'
    });
  }

  if (netWorth.currentNetWorth < 0) {
    risks.push({
      type: 'negative_net_worth',
      severity: 'high',
      message: 'Negative net worth indicates debt exceeds assets',
      recommendation: 'Focus on debt reduction and asset building'
    });
  }

  return risks;
}

function generateRecommendations(spending: any, budget: any, income: any, savings: any, netWorth: any): any[] {
  const recommendations = [];

  // Savings rate improvement
  if (savings.currentSavingsRate < savings.targetSavingsRate) {
    recommendations.push({
      priority: 'high',
      category: 'savings',
      title: 'Increase Savings Rate',
      description: `Aim to increase your savings rate from ${savings.currentSavingsRate.toFixed(1)}% to ${savings.targetSavingsRate}%`,
      expectedImpact: `Additional $${((savings.targetSavingsRate - savings.currentSavingsRate) / 100 * income.averageMonthlyIncome).toFixed(2)} per month`
    });
  }

  // Budget optimization
  const inefficientCategories = budget.categoryPerformance.filter(
    (cat: any) => cat.status === 'way_over_budget'
  );

  if (inefficientCategories.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'budgeting',
      title: 'Optimize Over-Budget Categories',
      description: `Focus on reducing spending in: ${inefficientCategories.map((cat: any) => cat.categoryName).join(', ')}`,
      expectedImpact: 'Improved budget adherence and increased savings'
    });
  }

  // Emergency fund
  if (income.incomeConsistency < 80) {
    recommendations.push({
      priority: 'medium',
      category: 'emergency_fund',
      title: 'Build Emergency Fund',
      description: 'Due to income variability, consider building a 6-month emergency fund',
      expectedImpact: 'Increased financial security and reduced stress'
    });
  }

  return recommendations;
}