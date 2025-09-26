import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ReportsService } from '@/lib/services/reports.service';

interface JWTPayload {
  userId: string;
  familyId: string;
  role: string;
}

interface AnnualSummaryData {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  averageMonthlySavingsRate: number;
  monthlyBreakdown: Array<{
    month: string;
    income: number;
    expenses: number;
    netCashFlow: number;
    savingsRate: number;
  }>;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  incomeGrowth: number; // percentage change from previous year
  expenseGrowth: number; // percentage change from previous year
}

export async function GET(request: NextRequest) {
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: JWTPayload;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get('year');

    // Use current year if not provided
    const targetYear = yearStr ? parseInt(yearStr) : new Date().getFullYear();

    // Validate year parameter
    if (isNaN(targetYear) || targetYear < 1900 || targetYear > 2100) {
      return NextResponse.json(
        { error: 'Invalid year. Must be between 1900 and 2100' },
        { status: 400 }
      );
    }

    // Create date range for the entire year
    const fromDate = new Date(targetYear, 0, 1); // January 1st
    const toDate = new Date(targetYear, 11, 31); // December 31st

    // Generate monthly summaries for the year
    const monthlyBreakdown = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(targetYear, month, 1);
      const monthlySummary = await ReportsService.generateMonthlySummary(
        decoded.familyId,
        monthDate
      );

      const monthData = {
        month: monthDate.toISOString().substring(0, 7), // YYYY-MM format
        income: monthlySummary.income.total,
        expenses: monthlySummary.expenses.total,
        netCashFlow: monthlySummary.netCashFlow,
        savingsRate: monthlySummary.savingsRate,
      };

      monthlyBreakdown.push(monthData);
      totalIncome += monthData.income;
      totalExpenses += monthData.expenses;
    }

    const netCashFlow = totalIncome - totalExpenses;
    const averageMonthlySavingsRate = monthlyBreakdown.reduce((sum, month) => sum + month.savingsRate, 0) / 12;

    // Get spending analysis for top categories
    const spendingAnalysis = await ReportsService.generateSpendingAnalysis(
      decoded.familyId,
      { fromDate, toDate }
    );

    const topExpenseCategories = spendingAnalysis.categoryBreakdown
      .slice(0, 10)
      .map(category => ({
        category: category.categoryName,
        amount: category.amount,
        percentage: category.percentage,
      }));

    // Calculate growth compared to previous year (simplified)
    const previousYear = targetYear - 1;
    const previousFromDate = new Date(previousYear, 0, 1);
    const previousToDate = new Date(previousYear, 11, 31);

    let incomeGrowth = 0;
    let expenseGrowth = 0;

    try {
      // Generate cash flow report for previous year to calculate growth
      const previousCashFlow = await ReportsService.generateCashFlowReport(
        decoded.familyId,
        { fromDate: previousFromDate, toDate: previousToDate },
        'year'
      );

      if (previousCashFlow.length > 0) {
        const previousYearData = previousCashFlow[0];
        incomeGrowth = previousYearData.totalIncome > 0
          ? ((totalIncome - previousYearData.totalIncome) / previousYearData.totalIncome) * 100
          : 0;
        expenseGrowth = previousYearData.totalExpenses > 0
          ? ((totalExpenses - previousYearData.totalExpenses) / previousYearData.totalExpenses) * 100
          : 0;
      }
    } catch (error) {
      // Previous year data might not exist, keep growth at 0
      console.warn('Could not calculate year-over-year growth:', error);
    }

    const annualSummaryData: AnnualSummaryData = {
      year: targetYear,
      totalIncome,
      totalExpenses,
      netCashFlow,
      averageMonthlySavingsRate,
      monthlyBreakdown,
      topExpenseCategories,
      incomeGrowth,
      expenseGrowth,
    };

    return NextResponse.json({
      data: annualSummaryData,
      meta: {
        familyId: decoded.familyId,
        year: targetYear,
        generatedAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Error generating annual summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}