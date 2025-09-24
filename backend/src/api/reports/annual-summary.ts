import { Request, Response } from 'express';
import { ReportsService } from '../../services/reports.service';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getAnnualSummaryReport(req: AuthenticatedRequest, res: Response) {
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

    // Parse year from query parameters
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        error: 'Invalid year',
        details: 'Year must be between 2000 and 2100'
      });
    }

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    // Generate comprehensive annual data
    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      if (monthDate <= new Date()) {
        const monthlySummary = await ReportsService.generateMonthlySummary(familyId, monthDate);
        monthlyData.push(monthlySummary);
      }
    }

    // Calculate annual totals
    const annualIncome = monthlyData.reduce((sum, month) => sum + month.income.total, 0);
    const annualExpenses = monthlyData.reduce((sum, month) => sum + month.expenses.total, 0);
    const annualNetCashFlow = annualIncome - annualExpenses;
    const annualSavingsRate = annualIncome > 0 ? (annualNetCashFlow / annualIncome) * 100 : 0;

    // Get all income sources for the year
    const incomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        actualDate: { gte: yearStart, lte: yearEnd },
        status: 'received'
      }
    });

    // Get all transactions for the year
    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccount: { familyId },
        date: { gte: yearStart, lte: yearEnd },
        amount: { gt: 0 }
      },
      include: {
        spendingCategory: true
      }
    });

    // Aggregate income by source
    const incomeBySource = new Map<string, number>();
    for (const event of incomeEvents) {
      const source = event.source || event.name || 'Other';
      incomeBySource.set(source, (incomeBySource.get(source) || 0) + Number(event.actualAmount || event.amount));
    }

    // Aggregate expenses by category
    const expensesByCategory = new Map<string, number>();
    for (const txn of transactions) {
      const category = txn.spendingCategory?.name || 'Uncategorized';
      expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + Number(txn.amount));
    }

    // Calculate quarterly summaries
    const quarterlyData = [];
    for (let q = 0; q < 4; q++) {
      const quarterMonths = monthlyData.slice(q * 3, (q + 1) * 3);
      if (quarterMonths.length > 0) {
        const quarterIncome = quarterMonths.reduce((sum, m) => sum + m.income.total, 0);
        const quarterExpenses = quarterMonths.reduce((sum, m) => sum + m.expenses.total, 0);
        quarterlyData.push({
          quarter: `Q${q + 1}`,
          income: quarterIncome,
          expenses: quarterExpenses,
          netCashFlow: quarterIncome - quarterExpenses,
          savingsRate: quarterIncome > 0 ? ((quarterIncome - quarterExpenses) / quarterIncome) * 100 : 0
        });
      }
    }

    // Find best and worst months
    const bestMonth = monthlyData.reduce((best, current) =>
      current.netCashFlow > best.netCashFlow ? current : best,
      monthlyData[0] || { month: '', netCashFlow: 0 }
    );

    const worstMonth = monthlyData.reduce((worst, current) =>
      current.netCashFlow < worst.netCashFlow ? current : worst,
      monthlyData[0] || { month: '', netCashFlow: 0 }
    );

    // Calculate year-over-year comparison if previous year data exists
    let yearOverYear = null;
    if (year > 2020) {
      const previousYearStart = new Date(year - 1, 0, 1);
      const previousYearEnd = new Date(year - 1, 11, 31, 23, 59, 59);

      const previousIncome = await prisma.incomeEvent.aggregate({
        where: {
          familyId,
          actualDate: { gte: previousYearStart, lte: previousYearEnd },
          status: 'received'
        },
        _sum: { actualAmount: true, amount: true }
      });

      const previousExpenses = await prisma.transaction.aggregate({
        where: {
          bankAccount: { familyId },
          date: { gte: previousYearStart, lte: previousYearEnd },
          amount: { gt: 0 }
        },
        _sum: { amount: true }
      });

      const prevIncome = Number(previousIncome._sum.actualAmount || 0) + Number(previousIncome._sum.amount || 0);
      const prevExpenses = Number(previousExpenses._sum.amount || 0);

      yearOverYear = {
        income: {
          previousYear: prevIncome,
          currentYear: annualIncome,
          change: annualIncome - prevIncome,
          changePercentage: prevIncome > 0 ? ((annualIncome - prevIncome) / prevIncome) * 100 : 0
        },
        expenses: {
          previousYear: prevExpenses,
          currentYear: annualExpenses,
          change: annualExpenses - prevExpenses,
          changePercentage: prevExpenses > 0 ? ((annualExpenses - prevExpenses) / prevExpenses) * 100 : 0
        }
      };
    }

    // Generate financial milestones and achievements
    const achievements = [];
    if (annualSavingsRate >= 20) {
      achievements.push({
        type: 'savings',
        message: `Achieved ${annualSavingsRate.toFixed(1)}% savings rate`,
        icon: '🎯'
      });
    }

    const profitableMonths = monthlyData.filter(m => m.netCashFlow > 0).length;
    if (profitableMonths >= 10) {
      achievements.push({
        type: 'consistency',
        message: `${profitableMonths} profitable months`,
        icon: '📈'
      });
    }

    if (yearOverYear && yearOverYear.income.changePercentage > 10) {
      achievements.push({
        type: 'growth',
        message: `Income grew ${yearOverYear.income.changePercentage.toFixed(1)}%`,
        icon: '🚀'
      });
    }

    // Tax-related summary (simplified)
    const taxableIncome = annualIncome; // Simplified - would need deductions
    const estimatedTaxRate = 0.22; // Simplified federal rate
    const estimatedTaxes = taxableIncome * estimatedTaxRate;

    return res.status(200).json({
      year,
      summary: {
        totalIncome: annualIncome,
        totalExpenses: annualExpenses,
        netCashFlow: annualNetCashFlow,
        savingsRate: annualSavingsRate,
        avgMonthlyIncome: annualIncome / monthlyData.length,
        avgMonthlyExpenses: annualExpenses / monthlyData.length
      },
      incomeBreakdown: Array.from(incomeBySource.entries()).map(([source, amount]) => ({
        source,
        amount,
        percentage: annualIncome > 0 ? (amount / annualIncome) * 100 : 0
      })).sort((a, b) => b.amount - a.amount),
      expenseBreakdown: Array.from(expensesByCategory.entries()).map(([category, amount]) => ({
        category,
        amount,
        percentage: annualExpenses > 0 ? (amount / annualExpenses) * 100 : 0
      })).sort((a, b) => b.amount - a.amount),
      quarterlyPerformance: quarterlyData,
      monthlyTrends: monthlyData.map(m => ({
        month: m.month,
        income: m.income.total,
        expenses: m.expenses.total,
        netCashFlow: m.netCashFlow,
        savingsRate: m.savingsRate
      })),
      highlights: {
        bestMonth: bestMonth ? {
          month: bestMonth.month,
          netCashFlow: bestMonth.netCashFlow,
          savingsRate: bestMonth.savingsRate
        } : null,
        worstMonth: worstMonth ? {
          month: worstMonth.month,
          netCashFlow: worstMonth.netCashFlow,
          savingsRate: worstMonth.savingsRate
        } : null,
        profitableMonths,
        unprofitableMonths: monthlyData.length - profitableMonths
      },
      yearOverYear,
      achievements,
      taxSummary: {
        estimatedTaxableIncome: taxableIncome,
        estimatedTaxes,
        estimatedEffectiveRate: estimatedTaxRate * 100,
        afterTaxIncome: annualIncome - estimatedTaxes
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Annual summary report error:', error);
    return res.status(500).json({
      error: 'Failed to generate annual summary report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}