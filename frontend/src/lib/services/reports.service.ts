import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

export type DateRange = {
  fromDate: Date;
  toDate: Date;
};

export type GroupByPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type CashFlowReportData = {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  incomeBreakdown: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
  expenseBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
};

export type SpendingAnalysisData = {
  totalSpent: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
    transactionCount: number;
    averageTransaction: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    amount: number;
    categoryBreakdown: Array<{
      categoryId: string;
      categoryName: string;
      amount: number;
    }>;
  }>;
  topMerchants: Array<{
    merchantName: string;
    amount: number;
    transactionCount: number;
  }>;
};

export type BudgetPerformanceData = {
  overallPerformance: {
    totalBudgeted: number;
    totalSpent: number;
    remainingBudget: number;
    performanceScore: number; // 0-100
  };
  categoryPerformance: Array<{
    categoryId: string;
    categoryName: string;
    budgeted: number;
    spent: number;
    remaining: number;
    performancePercentage: number;
    status: 'under_budget' | 'on_track' | 'over_budget' | 'way_over_budget';
  }>;
  monthlyTrends: Array<{
    month: string;
    budgeted: number;
    spent: number;
    performanceScore: number;
  }>;
};

export type IncomeAnalysisData = {
  totalIncome: number;
  regularIncome: number;
  irregularIncome: number;
  averageMonthlyIncome: number;
  incomeConsistency: number; // 0-100 score
  sources: Array<{
    source: string;
    amount: number;
    percentage: number;
    frequency: string;
    reliability: number; // 0-100 score
  }>;
  monthlyTrends: Array<{
    month: string;
    amount: number;
    regularAmount: number;
    irregularAmount: number;
  }>;
};

export type NetWorthData = {
  currentNetWorth: number;
  assets: {
    total: number;
    breakdown: Array<{
      accountType: string;
      amount: number;
    }>;
  };
  liabilities: {
    total: number;
    breakdown: Array<{
      accountType: string;
      amount: number;
    }>;
  };
  monthlyTrends: Array<{
    month: string;
    netWorth: number;
    assets: number;
    liabilities: number;
  }>;
};

export type SavingsRateData = {
  currentSavingsRate: number;
  targetSavingsRate: number;
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
  }>;
  averageSavingsRate: number;
  savingsTrend: 'increasing' | 'decreasing' | 'stable';
};

export type MonthlySummaryData = {
  month: string;
  income: {
    total: number;
    sources: Array<{ source: string; amount: number }>;
  };
  expenses: {
    total: number;
    categories: Array<{ category: string; amount: number }>;
  };
  netCashFlow: number;
  savingsRate: number;
  budgetPerformance: number;
  topExpenses: Array<{
    description: string;
    amount: number;
    category: string;
    date: Date;
  }>;
};

export class ReportsService {
  static async generateCashFlowReport(
    familyId: string,
    dateRange: DateRange,
    groupBy: GroupByPeriod = 'month',
    includeProjections: boolean = false
  ): Promise<CashFlowReportData[]> {
    const periods = this.generatePeriods(dateRange, groupBy);
    const cashFlowData: CashFlowReportData[] = [];

    for (const period of periods) {
      // Get income for period
      const incomeEvents = await prisma.incomeEvent.findMany({
        where: {
          familyId,
          actualDate: {
            gte: period.start,
            lte: period.end,
          },
          status: 'received',
        },
      });

      // Get expenses for period (from transactions)
      const transactions = await prisma.transaction.findMany({
        where: {
          bankAccount: { familyId },
          date: {
            gte: period.start,
            lte: period.end,
          },
          amount: { gt: 0 }, // Only expenses (positive amounts)
        },
        include: {
          spendingCategory: true,
        },
      });

      const totalIncome = incomeEvents.reduce((sum, event) => sum + Number(event.actualAmount || event.amount), 0);
      const totalExpenses = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

      // Income breakdown
      const incomeBreakdown = this.groupBySource(incomeEvents);

      // Expense breakdown by category
      const expenseBreakdown = this.groupByCategory(transactions);

      cashFlowData.push({
        period: period.label,
        periodStart: period.start,
        periodEnd: period.end,
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
        incomeBreakdown,
        expenseBreakdown,
      });
    }

    // Add projections if requested
    if (includeProjections) {
      const projections = await this.generateCashFlowProjections(familyId, dateRange, groupBy);
      cashFlowData.push(...projections);
    }

    return cashFlowData;
  }

  static async generateSpendingAnalysis(
    familyId: string,
    dateRange: DateRange
  ): Promise<SpendingAnalysisData> {
    // Get all transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccount: { familyId },
        date: {
          gte: dateRange.fromDate,
          lte: dateRange.toDate,
        },
        amount: { gt: 0 }, // Only expenses
      },
      include: {
        spendingCategory: true,
      },
    });

    const totalSpent = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

    // Category breakdown
    const categoryMap = new Map<string, { name: string; amount: number; count: number }>();

    for (const txn of transactions) {
      const categoryId = txn.spendingCategoryId || 'uncategorized';
      const categoryName = txn.spendingCategory?.name || 'Uncategorized';

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, { name: categoryName, amount: 0, count: 0 });
      }

      const category = categoryMap.get(categoryId)!;
      category.amount += Number(txn.amount);
      category.count += 1;
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      amount: data.amount,
      percentage: (data.amount / totalSpent) * 100,
      transactionCount: data.count,
      averageTransaction: data.amount / data.count,
    }));

    // Monthly trends
    const monthlyTrends = await this.generateMonthlySpendingTrends(familyId, dateRange);

    // Top merchants
    const topMerchants = this.getTopMerchants(transactions, 10);

    return {
      totalSpent,
      categoryBreakdown: categoryBreakdown.sort((a, b) => b.amount - a.amount),
      monthlyTrends,
      topMerchants,
    };
  }

  static async generateBudgetPerformance(
    familyId: string,
    dateRange: DateRange
  ): Promise<BudgetPerformanceData> {
    // Get budget categories with their allocations
    const budgetCategories = await prisma.budgetCategory.findMany({
      where: { familyId, isActive: true },
      include: {
        allocations: {
          where: {
            incomeEvent: {
              actualDate: {
                gte: dateRange.fromDate,
                lte: dateRange.toDate,
              },
            },
          },
        },
        spendingCategories: {
          include: {
            transactions: {
              where: {
                date: {
                  gte: dateRange.fromDate,
                  lte: dateRange.toDate,
                },
                bankAccount: { familyId },
              },
            },
          },
        },
      },
    });

    let totalBudgeted = 0;
    let totalSpent = 0;
    const categoryPerformance = [];

    for (const budgetCategory of budgetCategories) {
      const budgeted = budgetCategory.allocations.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
      const spent = budgetCategory.spendingCategories.reduce((sum, spendingCat) =>
        sum + spendingCat.transactions.reduce((txnSum, txn) => txnSum + Number(txn.amount), 0), 0
      );

      totalBudgeted += budgeted;
      totalSpent += spent;

      const remaining = budgeted - spent;
      const performancePercentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;

      let status: 'under_budget' | 'on_track' | 'over_budget' | 'way_over_budget';
      if (performancePercentage <= 75) status = 'under_budget';
      else if (performancePercentage <= 100) status = 'on_track';
      else if (performancePercentage <= 125) status = 'over_budget';
      else status = 'way_over_budget';

      categoryPerformance.push({
        categoryId: budgetCategory.id,
        categoryName: budgetCategory.name,
        budgeted,
        spent,
        remaining,
        performancePercentage,
        status,
      });
    }

    const overallPerformance = {
      totalBudgeted,
      totalSpent,
      remainingBudget: totalBudgeted - totalSpent,
      performanceScore: Math.max(0, 100 - ((totalSpent - totalBudgeted) / totalBudgeted) * 100),
    };

    // Monthly trends
    const monthlyTrends = await this.generateMonthlyBudgetTrends(familyId, dateRange);

    return {
      overallPerformance,
      categoryPerformance: categoryPerformance.sort((a, b) => b.spent - a.spent),
      monthlyTrends,
    };
  }

  static async generateIncomeAnalysis(
    familyId: string,
    dateRange: DateRange
  ): Promise<IncomeAnalysisData> {
    const incomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        actualDate: {
          gte: dateRange.fromDate,
          lte: dateRange.toDate,
        },
        status: 'received',
      },
    });

    const totalIncome = incomeEvents.reduce((sum, event) => sum + Number(event.actualAmount || event.amount), 0);
    const regularIncome = incomeEvents
      .filter(event => event.frequency !== 'once')
      .reduce((sum, event) => sum + Number(event.actualAmount || event.amount), 0);
    const irregularIncome = totalIncome - regularIncome;

    // Calculate months in range for average
    const monthsDiff = this.getMonthsDifference(dateRange.fromDate, dateRange.toDate);
    const averageMonthlyIncome = totalIncome / Math.max(1, monthsDiff);

    // Income consistency score based on variance in monthly income
    const incomeConsistency = await this.calculateIncomeConsistency(familyId, dateRange);

    // Income sources analysis
    const sources = this.analyzeIncomeSources(incomeEvents);

    // Monthly trends
    const monthlyTrends = await this.generateMonthlyIncomeTrends(familyId, dateRange);

    return {
      totalIncome,
      regularIncome,
      irregularIncome,
      averageMonthlyIncome,
      incomeConsistency,
      sources,
      monthlyTrends,
    };
  }

  static async generateNetWorthReport(familyId: string): Promise<NetWorthData> {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { familyId, deletedAt: null },
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    const assetBreakdown: Array<{ accountType: string; amount: number }> = [];
    const liabilityBreakdown: Array<{ accountType: string; amount: number }> = [];

    const accountTypeMap = new Map<string, number>();

    for (const account of bankAccounts) {
      const balance = Number(account.currentBalance);
      const accountType = account.accountType;

      if (!accountTypeMap.has(accountType)) {
        accountTypeMap.set(accountType, 0);
      }
      accountTypeMap.set(accountType, accountTypeMap.get(accountType)! + balance);

      if (accountType === 'checking' || accountType === 'savings') {
        totalAssets += balance;
      } else if (accountType === 'credit' || accountType === 'loan') {
        totalLiabilities += Math.abs(balance); // Liabilities are typically negative
      }
    }

    // Build breakdown arrays
    for (const [accountType, amount] of accountTypeMap.entries()) {
      if (accountType === 'checking' || accountType === 'savings') {
        assetBreakdown.push({ accountType, amount });
      } else {
        liabilityBreakdown.push({ accountType, amount: Math.abs(amount) });
      }
    }

    // Monthly trends (simplified - would need historical balance data)
    const monthlyTrends = await this.generateNetWorthTrends(familyId);

    return {
      currentNetWorth: totalAssets - totalLiabilities,
      assets: {
        total: totalAssets,
        breakdown: assetBreakdown,
      },
      liabilities: {
        total: totalLiabilities,
        breakdown: liabilityBreakdown,
      },
      monthlyTrends,
    };
  }

  static async generateSavingsRateReport(
    familyId: string,
    dateRange: DateRange,
    targetSavingsRate: number = 20
  ): Promise<SavingsRateData> {
    const monthlyData = [];
    const periods = this.generatePeriods(dateRange, 'month');

    for (const period of periods) {
      const income = await this.getIncomeForPeriod(familyId, period.start, period.end);
      const expenses = await this.getExpensesForPeriod(familyId, period.start, period.end);
      const savings = income - expenses;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;

      monthlyData.push({
        month: period.label,
        income,
        expenses,
        savings,
        savingsRate,
      });
    }

    const averageSavingsRate = monthlyData.reduce((sum, data) => sum + data.savingsRate, 0) / monthlyData.length;

    // Determine trend
    const recentRates = monthlyData.slice(-3).map(d => d.savingsRate);
    const earlierRates = monthlyData.slice(-6, -3).map(d => d.savingsRate);
    const recentAvg = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
    const earlierAvg = earlierRates.reduce((sum, rate) => sum + rate, 0) / earlierRates.length;

    let savingsTrend: 'increasing' | 'decreasing' | 'stable';
    if (recentAvg > earlierAvg + 2) savingsTrend = 'increasing';
    else if (recentAvg < earlierAvg - 2) savingsTrend = 'decreasing';
    else savingsTrend = 'stable';

    return {
      currentSavingsRate: monthlyData[monthlyData.length - 1]?.savingsRate || 0,
      targetSavingsRate,
      monthlyData,
      averageSavingsRate,
      savingsTrend,
    };
  }

  static async generateMonthlySummary(
    familyId: string,
    month: Date
  ): Promise<MonthlySummaryData> {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // Income data
    const incomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        actualDate: { gte: monthStart, lte: monthEnd },
        status: 'received',
      },
    });

    const totalIncome = incomeEvents.reduce((sum, event) => sum + Number(event.actualAmount || event.amount), 0);
    const incomeSources = this.groupBySource(incomeEvents);

    // Expense data
    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccount: { familyId },
        date: { gte: monthStart, lte: monthEnd },
        amount: { gt: 0 },
      },
      include: {
        spendingCategory: true,
      },
      orderBy: { amount: 'desc' },
    });

    const totalExpenses = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);
    const expenseCategories = this.groupByCategory(transactions);

    // Budget performance
    const budgetPerformance = await this.getBudgetPerformanceScore(familyId, monthStart, monthEnd);

    // Top expenses
    const topExpenses = transactions.slice(0, 10).map(txn => ({
      description: txn.description,
      amount: Number(txn.amount),
      category: txn.spendingCategory?.name || 'Uncategorized',
      date: txn.date,
    }));

    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

    return {
      month: month.toISOString().substring(0, 7), // YYYY-MM format
      income: {
        total: totalIncome,
        sources: incomeSources,
      },
      expenses: {
        total: totalExpenses,
        categories: expenseCategories,
      },
      netCashFlow,
      savingsRate,
      budgetPerformance,
      topExpenses,
    };
  }

  // Helper methods
  private static generatePeriods(dateRange: DateRange, groupBy: GroupByPeriod) {
    const periods = [];
    let current = new Date(dateRange.fromDate);

    while (current <= dateRange.toDate) {
      let periodEnd: Date;
      let label: string;

      switch (groupBy) {
        case 'day':
          periodEnd = new Date(current);
          label = current.toISOString().split('T')[0];
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          periodEnd = new Date(current);
          periodEnd.setDate(periodEnd.getDate() + 6);
          label = `Week of ${current.toISOString().split('T')[0]}`;
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          label = current.toISOString().substring(0, 7); // YYYY-MM
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarter':
          const quarter = Math.floor(current.getMonth() / 3);
          periodEnd = new Date(current.getFullYear(), (quarter + 1) * 3, 0);
          label = `Q${quarter + 1} ${current.getFullYear()}`;
          current.setMonth((quarter + 1) * 3);
          break;
        case 'year':
          periodEnd = new Date(current.getFullYear(), 11, 31);
          label = current.getFullYear().toString();
          current.setFullYear(current.getFullYear() + 1);
          break;
      }

      periods.push({
        start: new Date(current),
        end: periodEnd > dateRange.toDate ? dateRange.toDate : periodEnd,
        label,
      });

      if (periodEnd >= dateRange.toDate) break;
    }

    return periods;
  }

  private static groupBySource(incomeEvents: any[]): Array<{ source: string; amount: number; percentage?: number }> {
    const sourceMap = new Map<string, number>();
    const total = incomeEvents.reduce((sum, event) => sum + Number(event.actualAmount || event.amount), 0);

    for (const event of incomeEvents) {
      const source = event.source || event.name || 'Other';
      const amount = Number(event.actualAmount || event.amount);
      sourceMap.set(source, (sourceMap.get(source) || 0) + amount);
    }

    return Array.from(sourceMap.entries()).map(([source, amount]) => ({
      source,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  }

  private static groupByCategory(transactions: any[]): Array<{ category: string; amount: number; percentage?: number }> {
    const categoryMap = new Map<string, number>();
    const total = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

    for (const txn of transactions) {
      const category = txn.spendingCategory?.name || 'Uncategorized';
      const amount = Number(txn.amount);
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    }

    return Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  }

  private static getTopMerchants(transactions: any[], limit: number) {
    const merchantMap = new Map<string, { amount: number; count: number }>();

    for (const txn of transactions) {
      const merchantName = txn.merchantName || 'Unknown';
      const amount = Number(txn.amount);

      if (!merchantMap.has(merchantName)) {
        merchantMap.set(merchantName, { amount: 0, count: 0 });
      }

      const merchant = merchantMap.get(merchantName)!;
      merchant.amount += amount;
      merchant.count += 1;
    }

    return Array.from(merchantMap.entries())
      .map(([merchantName, data]) => ({
        merchantName,
        amount: data.amount,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  private static getMonthsDifference(start: Date, end: Date): number {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  }

  private static async generateCashFlowProjections(familyId: string, dateRange: DateRange, groupBy: GroupByPeriod): Promise<CashFlowReportData[]> {
    // Simplified projection logic - would be more sophisticated in practice
    return [];
  }

  private static async generateMonthlySpendingTrends(familyId: string, dateRange: DateRange) {
    // Implementation for monthly spending trends
    return [];
  }

  private static async generateMonthlyBudgetTrends(familyId: string, dateRange: DateRange) {
    // Implementation for monthly budget trends
    return [];
  }

  private static async calculateIncomeConsistency(familyId: string, dateRange: DateRange): Promise<number> {
    // Calculate variance in monthly income to determine consistency score
    return 85; // Placeholder
  }

  private static analyzeIncomeSources(incomeEvents: any[]) {
    // Analyze income sources for reliability and frequency
    const sources = this.groupBySource(incomeEvents);
    return sources.map(source => ({
      ...source,
      frequency: 'monthly', // Placeholder
      reliability: 90, // Placeholder
    }));
  }

  private static async generateMonthlyIncomeTrends(familyId: string, dateRange: DateRange) {
    // Implementation for monthly income trends
    return [];
  }

  private static async generateNetWorthTrends(familyId: string) {
    // Implementation for net worth trends
    return [];
  }

  private static async getIncomeForPeriod(familyId: string, start: Date, end: Date): Promise<number> {
    const incomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        actualDate: { gte: start, lte: end },
        status: 'received',
      },
    });

    return incomeEvents.reduce((sum, event) => sum + Number(event.actualAmount || event.amount), 0);
  }

  private static async getExpensesForPeriod(familyId: string, start: Date, end: Date): Promise<number> {
    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccount: { familyId },
        date: { gte: start, lte: end },
        amount: { gt: 0 },
      },
    });

    return transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);
  }

  private static async getBudgetPerformanceScore(familyId: string, start: Date, end: Date): Promise<number> {
    // Calculate budget performance score for the period
    return 85; // Placeholder
  }
}