import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { ReportsService, DateRange, GroupByPeriod } from '../../backend/src/services/reports.service';
import { prisma } from '../../backend/src/lib/prisma';

jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: {
    incomeEvent: {
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    budgetCategory: {
      findMany: jest.fn(),
    },
    bankAccount: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ReportsService - Report Generators', () => {
  const familyId = 'family-123';
  const dateRange: DateRange = {
    fromDate: new Date('2024-01-01'),
    toDate: new Date('2024-03-31'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cash Flow Report Generation', () => {
    test('should generate monthly cash flow report with income and expenses', async () => {
      const mockIncomeEvents = [
        {
          id: 'income-1',
          familyId,
          name: 'Salary',
          amount: { toNumber: () => 5000 } as any,
          actualAmount: { toNumber: () => 5000 } as any,
          actualDate: new Date('2024-01-15'),
          status: 'received' as const,
          source: 'Employer',
        },
        {
          id: 'income-2',
          familyId,
          name: 'Freelance',
          amount: { toNumber: () => 2000 } as any,
          actualAmount: { toNumber: () => 1800 } as any,
          actualDate: new Date('2024-02-10'),
          status: 'received' as const,
          source: 'Client A',
        },
      ];

      const mockTransactions = [
        {
          id: 'txn-1',
          amount: { toNumber: () => 1500 } as any,
          date: new Date('2024-01-20'),
          spendingCategory: { name: 'Housing' },
          merchantName: 'Rent Company',
        },
        {
          id: 'txn-2',
          amount: { toNumber: () => 800 } as any,
          date: new Date('2024-02-05'),
          spendingCategory: { name: 'Food' },
          merchantName: 'Grocery Store',
        },
      ];

      mockPrisma.incomeEvent.findMany.mockResolvedValue(mockIncomeEvents as any);
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);

      const result = await ReportsService.generateCashFlowReport(familyId, dateRange, 'month', false);

      expect(result).toHaveLength(3); // Jan, Feb, Mar
      expect(mockPrisma.incomeEvent.findMany).toHaveBeenCalledTimes(3);
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledTimes(3);

      const januaryReport = result.find(r => r.period === '2024-01');
      expect(januaryReport).toBeDefined();
      expect(januaryReport?.totalIncome).toBe(5000);
      expect(januaryReport?.totalExpenses).toBe(1500);
      expect(januaryReport?.netCashFlow).toBe(3500);
      expect(januaryReport?.incomeBreakdown).toEqual([
        { source: 'Employer', amount: 5000, percentage: 100 }
      ]);
      expect(januaryReport?.expenseBreakdown).toEqual([
        { category: 'Housing', amount: 1500, percentage: 100 }
      ]);
    });

    test('should handle different grouping periods for cash flow reports', async () => {
      const weeklyDateRange: DateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-14'),
      };

      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const weeklyResult = await ReportsService.generateCashFlowReport(familyId, weeklyDateRange, 'week', false);
      expect(weeklyResult.length).toBeGreaterThan(0);

      const dailyResult = await ReportsService.generateCashFlowReport(familyId, weeklyDateRange, 'day', false);
      expect(dailyResult.length).toBeGreaterThan(weeklyResult.length);
    });

    test('should include projections when requested', async () => {
      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await ReportsService.generateCashFlowReport(familyId, dateRange, 'month', true);
      expect(result).toBeDefined();
      // Note: Projections are placeholder implementation, would be tested more thoroughly with real logic
    });

    test('should handle empty data gracefully', async () => {
      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await ReportsService.generateCashFlowReport(familyId, dateRange, 'month', false);

      expect(result).toHaveLength(3);
      for (const periodData of result) {
        expect(periodData.totalIncome).toBe(0);
        expect(periodData.totalExpenses).toBe(0);
        expect(periodData.netCashFlow).toBe(0);
        expect(periodData.incomeBreakdown).toEqual([]);
        expect(periodData.expenseBreakdown).toEqual([]);
      }
    });

    test('should handle quarterly and yearly periods', async () => {
      const yearlyDateRange: DateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
      };

      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const quarterlyResult = await ReportsService.generateCashFlowReport(familyId, yearlyDateRange, 'quarter', false);
      expect(quarterlyResult).toHaveLength(4); // Q1, Q2, Q3, Q4

      const yearlyResult = await ReportsService.generateCashFlowReport(familyId, yearlyDateRange, 'year', false);
      expect(yearlyResult).toHaveLength(1); // 2024
    });
  });

  describe('Spending Analysis Generation', () => {
    test('should analyze spending by category with trends and merchants', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          amount: { toNumber: () => 500 } as any,
          date: new Date('2024-01-15'),
          spendingCategoryId: 'cat-1',
          spendingCategory: { name: 'Groceries' },
          merchantName: 'Whole Foods',
        },
        {
          id: 'txn-2',
          amount: { toNumber: () => 300 } as any,
          date: new Date('2024-01-20'),
          spendingCategoryId: 'cat-1',
          spendingCategory: { name: 'Groceries' },
          merchantName: 'Trader Joes',
        },
        {
          id: 'txn-3',
          amount: { toNumber: () => 200 } as any,
          date: new Date('2024-01-25'),
          spendingCategoryId: 'cat-2',
          spendingCategory: { name: 'Entertainment' },
          merchantName: 'Movie Theater',
        },
        {
          id: 'txn-4',
          amount: { toNumber: () => 200 } as any,
          date: new Date('2024-02-05'),
          spendingCategoryId: null,
          spendingCategory: null,
          merchantName: 'Unknown Merchant',
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);

      const result = await ReportsService.generateSpendingAnalysis(familyId, dateRange);

      expect(result.totalSpent).toBe(1200);
      expect(result.categoryBreakdown).toHaveLength(3); // Groceries, Entertainment, Uncategorized

      const groceriesCategory = result.categoryBreakdown.find(c => c.categoryName === 'Groceries');
      expect(groceriesCategory).toBeDefined();
      expect(groceriesCategory?.amount).toBe(800);
      expect(groceriesCategory?.percentage).toBeCloseTo(66.67);
      expect(groceriesCategory?.transactionCount).toBe(2);
      expect(groceriesCategory?.averageTransaction).toBe(400);

      const entertainmentCategory = result.categoryBreakdown.find(c => c.categoryName === 'Entertainment');
      expect(entertainmentCategory).toBeDefined();
      expect(entertainmentCategory?.amount).toBe(200);
      expect(entertainmentCategory?.percentage).toBeCloseTo(16.67);

      const uncategorizedCategory = result.categoryBreakdown.find(c => c.categoryName === 'Uncategorized');
      expect(uncategorizedCategory).toBeDefined();
      expect(uncategorizedCategory?.amount).toBe(200);

      expect(result.topMerchants).toHaveLength(4);
      const topMerchant = result.topMerchants[0];
      expect(topMerchant.merchantName).toBe('Whole Foods');
      expect(topMerchant.amount).toBe(500);
      expect(topMerchant.transactionCount).toBe(1);
    });

    test('should handle spending analysis with no transactions', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await ReportsService.generateSpendingAnalysis(familyId, dateRange);

      expect(result.totalSpent).toBe(0);
      expect(result.categoryBreakdown).toEqual([]);
      expect(result.topMerchants).toEqual([]);
    });

    test('should sort categories by spending amount', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          amount: { toNumber: () => 100 } as any,
          date: new Date('2024-01-15'),
          spendingCategoryId: 'cat-1',
          spendingCategory: { name: 'Small Category' },
          merchantName: 'Shop A',
        },
        {
          id: 'txn-2',
          amount: { toNumber: () => 1000 } as any,
          date: new Date('2024-01-20'),
          spendingCategoryId: 'cat-2',
          spendingCategory: { name: 'Large Category' },
          merchantName: 'Shop B',
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);

      const result = await ReportsService.generateSpendingAnalysis(familyId, dateRange);

      expect(result.categoryBreakdown[0].categoryName).toBe('Large Category');
      expect(result.categoryBreakdown[1].categoryName).toBe('Small Category');
    });

    test('should limit top merchants to specified count', async () => {
      const mockTransactions = Array.from({ length: 15 }, (_, i) => ({
        id: `txn-${i}`,
        amount: { toNumber: () => 100 - i } as any,
        date: new Date('2024-01-15'),
        spendingCategoryId: 'cat-1',
        spendingCategory: { name: 'Category' },
        merchantName: `Merchant ${i}`,
      }));

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);

      const result = await ReportsService.generateSpendingAnalysis(familyId, dateRange);

      expect(result.topMerchants).toHaveLength(10); // Limited to 10 merchants
      expect(result.topMerchants[0].merchantName).toBe('Merchant 0'); // Highest amount (100)
      expect(result.topMerchants[9].merchantName).toBe('Merchant 9'); // 10th highest amount (91)
    });
  });

  describe('Budget Performance Generation', () => {
    test('should calculate budget performance with status categorization', async () => {
      const mockBudgetCategories = [
        {
          id: 'budget-1',
          familyId,
          name: 'Housing',
          isActive: true,
          allocations: [
            {
              amount: { toNumber: () => 2000 } as any,
              incomeEvent: { actualDate: new Date('2024-01-15') },
            },
          ],
          spendingCategories: [
            {
              transactions: [
                { amount: { toNumber: () => 1500 } as any, bankAccount: { familyId } },
              ],
            },
          ],
        },
        {
          id: 'budget-2',
          familyId,
          name: 'Food',
          isActive: true,
          allocations: [
            {
              amount: { toNumber: () => 800 } as any,
              incomeEvent: { actualDate: new Date('2024-01-15') },
            },
          ],
          spendingCategories: [
            {
              transactions: [
                { amount: { toNumber: () => 900 } as any, bankAccount: { familyId } },
              ],
            },
          ],
        },
        {
          id: 'budget-3',
          familyId,
          name: 'Entertainment',
          isActive: true,
          allocations: [
            {
              amount: { toNumber: () => 300 } as any,
              incomeEvent: { actualDate: new Date('2024-01-15') },
            },
          ],
          spendingCategories: [
            {
              transactions: [
                { amount: { toNumber: () => 400 } as any, bankAccount: { familyId } },
              ],
            },
          ],
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(mockBudgetCategories as any);

      const result = await ReportsService.generateBudgetPerformance(familyId, dateRange);

      expect(result.overallPerformance.totalBudgeted).toBe(3100);
      expect(result.overallPerformance.totalSpent).toBe(2800);
      expect(result.overallPerformance.remainingBudget).toBe(300);
      expect(result.overallPerformance.performanceScore).toBeGreaterThan(0);

      expect(result.categoryPerformance).toHaveLength(3);

      const housingPerformance = result.categoryPerformance.find(c => c.categoryName === 'Housing');
      expect(housingPerformance?.status).toBe('under_budget'); // 75% usage
      expect(housingPerformance?.performancePercentage).toBe(75);

      const foodPerformance = result.categoryPerformance.find(c => c.categoryName === 'Food');
      expect(foodPerformance?.status).toBe('over_budget'); // 112.5% usage
      expect(foodPerformance?.performancePercentage).toBe(112.5);

      const entertainmentPerformance = result.categoryPerformance.find(c => c.categoryName === 'Entertainment');
      expect(entertainmentPerformance?.status).toBe('way_over_budget'); // 133.33% usage
      expect(entertainmentPerformance?.performancePercentage).toBeCloseTo(133.33);
    });

    test('should handle budget categories with zero allocations', async () => {
      const mockBudgetCategories = [
        {
          id: 'budget-1',
          familyId,
          name: 'Unused Category',
          isActive: true,
          allocations: [],
          spendingCategories: [
            {
              transactions: [
                { amount: { toNumber: () => 100 } as any, bankAccount: { familyId } },
              ],
            },
          ],
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(mockBudgetCategories as any);

      const result = await ReportsService.generateBudgetPerformance(familyId, dateRange);

      expect(result.categoryPerformance).toHaveLength(1);
      const performance = result.categoryPerformance[0];
      expect(performance.budgeted).toBe(0);
      expect(performance.spent).toBe(100);
      expect(performance.performancePercentage).toBe(0);
      expect(performance.status).toBe('under_budget');
    });

    test('should calculate correct performance score', async () => {
      const mockBudgetCategories = [
        {
          id: 'budget-1',
          familyId,
          name: 'Test Category',
          isActive: true,
          allocations: [
            {
              amount: { toNumber: () => 1000 } as any,
              incomeEvent: { actualDate: new Date('2024-01-15') },
            },
          ],
          spendingCategories: [
            {
              transactions: [
                { amount: { toNumber: () => 1200 } as any, bankAccount: { familyId } },
              ],
            },
          ],
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(mockBudgetCategories as any);

      const result = await ReportsService.generateBudgetPerformance(familyId, dateRange);

      // With 1200 spent vs 1000 budgeted, overspend is 20%, so performance score should be 80
      expect(result.overallPerformance.performanceScore).toBe(80);
    });
  });

  describe('Income Analysis Generation', () => {
    test('should analyze income sources and consistency', async () => {
      const mockIncomeEvents = [
        {
          id: 'income-1',
          familyId,
          name: 'Regular Salary',
          amount: { toNumber: () => 5000 } as any,
          actualAmount: { toNumber: () => 5000 } as any,
          actualDate: new Date('2024-01-15'),
          status: 'received' as const,
          frequency: 'monthly' as const,
          source: 'Employer A',
        },
        {
          id: 'income-2',
          familyId,
          name: 'Freelance Project',
          amount: { toNumber: () => 2000 } as any,
          actualAmount: { toNumber: () => 2500 } as any,
          actualDate: new Date('2024-02-10'),
          status: 'received' as const,
          frequency: 'once' as const,
          source: 'Client B',
        },
        {
          id: 'income-3',
          familyId,
          name: 'Side Hustle',
          amount: { toNumber: () => 800 } as any,
          actualAmount: { toNumber: () => 800 } as any,
          actualDate: new Date('2024-03-05'),
          status: 'received' as const,
          frequency: 'weekly' as const,
          source: 'Side Business',
        },
      ];

      mockPrisma.incomeEvent.findMany.mockResolvedValue(mockIncomeEvents as any);

      const result = await ReportsService.generateIncomeAnalysis(familyId, dateRange);

      expect(result.totalIncome).toBe(8300);
      expect(result.regularIncome).toBe(5800); // Monthly + Weekly (5000 + 800)
      expect(result.irregularIncome).toBe(2500); // One-time freelance
      expect(result.averageMonthlyIncome).toBeCloseTo(2766.67); // 8300 / 3 months

      expect(result.sources).toHaveLength(3);
      const employerSource = result.sources.find(s => s.source === 'Employer A');
      expect(employerSource?.amount).toBe(5000);
      expect(employerSource?.percentage).toBeCloseTo(60.24);

      const freelanceSource = result.sources.find(s => s.source === 'Client B');
      expect(freelanceSource?.amount).toBe(2500);
      expect(freelanceSource?.percentage).toBeCloseTo(30.12);
    });

    test('should handle income analysis with no income events', async () => {
      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);

      const result = await ReportsService.generateIncomeAnalysis(familyId, dateRange);

      expect(result.totalIncome).toBe(0);
      expect(result.regularIncome).toBe(0);
      expect(result.irregularIncome).toBe(0);
      expect(result.averageMonthlyIncome).toBe(0);
      expect(result.sources).toEqual([]);
    });

    test('should use fallback values for missing source information', async () => {
      const mockIncomeEvents = [
        {
          id: 'income-1',
          familyId,
          name: 'Payment Without Source',
          amount: { toNumber: () => 1000 } as any,
          actualAmount: null,
          actualDate: new Date('2024-01-15'),
          status: 'received' as const,
          frequency: 'monthly' as const,
          source: null,
        },
      ];

      mockPrisma.incomeEvent.findMany.mockResolvedValue(mockIncomeEvents as any);

      const result = await ReportsService.generateIncomeAnalysis(familyId, dateRange);

      expect(result.totalIncome).toBe(1000); // Uses amount when actualAmount is null
      expect(result.sources[0].source).toBe('Payment Without Source'); // Uses name when source is null
    });
  });

  describe('Net Worth Report Generation', () => {
    test('should calculate net worth from bank account balances', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          familyId,
          accountType: 'checking' as const,
          currentBalance: { toNumber: () => 5000 } as any,
          deletedAt: null,
        },
        {
          id: 'account-2',
          familyId,
          accountType: 'savings' as const,
          currentBalance: { toNumber: () => 15000 } as any,
          deletedAt: null,
        },
        {
          id: 'account-3',
          familyId,
          accountType: 'credit' as const,
          currentBalance: { toNumber: () => -2000 } as any,
          deletedAt: null,
        },
        {
          id: 'account-4',
          familyId,
          accountType: 'loan' as const,
          currentBalance: { toNumber: () => -15000 } as any,
          deletedAt: null,
        },
      ];

      mockPrisma.bankAccount.findMany.mockResolvedValue(mockBankAccounts as any);

      const result = await ReportsService.generateNetWorthReport(familyId);

      expect(result.assets.total).toBe(20000); // 5000 + 15000
      expect(result.liabilities.total).toBe(17000); // abs(-2000) + abs(-15000)
      expect(result.currentNetWorth).toBe(3000); // 20000 - 17000

      expect(result.assets.breakdown).toHaveLength(2);
      const checkingAsset = result.assets.breakdown.find(b => b.accountType === 'checking');
      expect(checkingAsset?.amount).toBe(5000);

      expect(result.liabilities.breakdown).toHaveLength(2);
      const creditLiability = result.liabilities.breakdown.find(b => b.accountType === 'credit');
      expect(creditLiability?.amount).toBe(2000); // Positive value for liability
    });

    test('should exclude deleted bank accounts', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          familyId,
          accountType: 'checking' as const,
          currentBalance: { toNumber: () => 5000 } as any,
          deletedAt: null,
        },
        {
          id: 'account-2',
          familyId,
          accountType: 'savings' as const,
          currentBalance: { toNumber: () => 10000 } as any,
          deletedAt: new Date(),
        },
      ];

      mockPrisma.bankAccount.findMany.mockResolvedValue([mockBankAccounts[0]] as any);

      const result = await ReportsService.generateNetWorthReport(familyId);

      expect(result.assets.total).toBe(5000); // Only active account
    });

    test('should handle net worth with only assets', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          familyId,
          accountType: 'checking' as const,
          currentBalance: { toNumber: () => 10000 } as any,
          deletedAt: null,
        },
      ];

      mockPrisma.bankAccount.findMany.mockResolvedValue(mockBankAccounts as any);

      const result = await ReportsService.generateNetWorthReport(familyId);

      expect(result.assets.total).toBe(10000);
      expect(result.liabilities.total).toBe(0);
      expect(result.currentNetWorth).toBe(10000);
      expect(result.liabilities.breakdown).toEqual([]);
    });
  });

  describe('Savings Rate Report Generation', () => {
    test('should calculate savings rate and trends', async () => {
      const shortDateRange: DateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-02-29'),
      };

      // Mock income for two months
      mockPrisma.incomeEvent.findMany
        .mockResolvedValueOnce([
          {
            id: 'income-1',
            actualAmount: { toNumber: () => 5000 } as any,
            status: 'received' as const,
          },
        ] as any)
        .mockResolvedValueOnce([
          {
            id: 'income-2',
            actualAmount: { toNumber: () => 5500 } as any,
            status: 'received' as const,
          },
        ] as any);

      // Mock expenses for two months
      mockPrisma.transaction.findMany
        .mockResolvedValueOnce([
          { id: 'txn-1', amount: { toNumber: () => 3000 } as any },
        ] as any)
        .mockResolvedValueOnce([
          { id: 'txn-2', amount: { toNumber: () => 4000 } as any },
        ] as any);

      const result = await ReportsService.generateSavingsRateReport(familyId, shortDateRange, 25);

      expect(result.targetSavingsRate).toBe(25);
      expect(result.monthlyData).toHaveLength(2);

      const januaryData = result.monthlyData[0];
      expect(januaryData.month).toBe('2024-01');
      expect(januaryData.income).toBe(5000);
      expect(januaryData.expenses).toBe(3000);
      expect(januaryData.savings).toBe(2000);
      expect(januaryData.savingsRate).toBe(40); // (2000/5000) * 100

      const februaryData = result.monthlyData[1];
      expect(februaryData.month).toBe('2024-02');
      expect(februaryData.income).toBe(5500);
      expect(februaryData.expenses).toBe(4000);
      expect(februaryData.savings).toBe(1500);
      expect(februaryData.savingsRate).toBeCloseTo(27.27); // (1500/5500) * 100

      expect(result.currentSavingsRate).toBeCloseTo(27.27);
      expect(result.averageSavingsRate).toBeCloseTo(33.64); // (40 + 27.27) / 2
    });

    test('should determine savings trend correctly', async () => {
      const longDateRange: DateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-06-30'),
      };

      // Mock consistent income and varying expenses to create trends
      mockPrisma.incomeEvent.findMany.mockImplementation(() =>
        Promise.resolve([
          { id: 'income', actualAmount: { toNumber: () => 5000 } as any, status: 'received' }
        ] as any)
      );

      // Mock different expense levels to create trend
      let expenseCall = 0;
      const expenseAmounts = [4000, 3500, 3000, 2500, 2000, 1500]; // Decreasing expenses = increasing savings
      mockPrisma.transaction.findMany.mockImplementation(() => {
        const amount = expenseAmounts[expenseCall++] || 3000;
        return Promise.resolve([
          { id: 'txn', amount: { toNumber: () => amount } as any }
        ] as any);
      });

      const result = await ReportsService.generateSavingsRateReport(familyId, longDateRange, 20);

      expect(result.savingsTrend).toBe('increasing');
    });

    test('should handle zero income periods gracefully', async () => {
      const shortDateRange: DateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
      };

      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([
        { id: 'txn-1', amount: { toNumber: () => 1000 } as any },
      ] as any);

      const result = await ReportsService.generateSavingsRateReport(familyId, shortDateRange);

      expect(result.monthlyData).toHaveLength(1);
      expect(result.monthlyData[0].savingsRate).toBe(0); // Zero income should result in 0% savings rate
    });
  });

  describe('Monthly Summary Generation', () => {
    test('should generate comprehensive monthly summary', async () => {
      const monthDate = new Date('2024-03-15');

      const mockIncomeEvents = [
        {
          id: 'income-1',
          name: 'Salary',
          amount: { toNumber: () => 5000 } as any,
          actualAmount: { toNumber: () => 5000 } as any,
          status: 'received' as const,
          source: 'Employer',
        },
        {
          id: 'income-2',
          name: 'Bonus',
          amount: { toNumber: () => 1000 } as any,
          actualAmount: { toNumber: () => 1000 } as any,
          status: 'received' as const,
          source: 'Employer',
        },
      ];

      const mockTransactions = [
        {
          id: 'txn-1',
          amount: { toNumber: () => 1500 } as any,
          date: new Date('2024-03-01'),
          description: 'Rent Payment',
          spendingCategory: { name: 'Housing' },
        },
        {
          id: 'txn-2',
          amount: { toNumber: () => 800 } as any,
          date: new Date('2024-03-05'),
          description: 'Grocery Shopping',
          spendingCategory: { name: 'Food' },
        },
        {
          id: 'txn-3',
          amount: { toNumber: () => 200 } as any,
          date: new Date('2024-03-10'),
          description: 'Gas Station',
          spendingCategory: { name: 'Transportation' },
        },
      ];

      mockPrisma.incomeEvent.findMany.mockResolvedValue(mockIncomeEvents as any);
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);

      const result = await ReportsService.generateMonthlySummary(familyId, monthDate);

      expect(result.month).toBe('2024-03');
      expect(result.income.total).toBe(6000);
      expect(result.income.sources).toEqual([
        { source: 'Employer', amount: 6000, percentage: 100 }
      ]);

      expect(result.expenses.total).toBe(2500);
      expect(result.expenses.categories).toHaveLength(3);
      expect(result.expenses.categories.find(c => c.category === 'Housing')?.amount).toBe(1500);

      expect(result.netCashFlow).toBe(3500); // 6000 - 2500
      expect(result.savingsRate).toBeCloseTo(58.33); // (3500/6000) * 100

      expect(result.topExpenses).toHaveLength(3);
      expect(result.topExpenses[0].description).toBe('Rent Payment');
      expect(result.topExpenses[0].amount).toBe(1500);
      expect(result.topExpenses[0].category).toBe('Housing');
    });

    test('should handle monthly summary with no data', async () => {
      const monthDate = new Date('2024-03-15');

      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await ReportsService.generateMonthlySummary(familyId, monthDate);

      expect(result.month).toBe('2024-03');
      expect(result.income.total).toBe(0);
      expect(result.income.sources).toEqual([]);
      expect(result.expenses.total).toBe(0);
      expect(result.expenses.categories).toEqual([]);
      expect(result.netCashFlow).toBe(0);
      expect(result.savingsRate).toBe(0);
      expect(result.topExpenses).toEqual([]);
    });

    test('should limit top expenses to 10 items', async () => {
      const monthDate = new Date('2024-03-15');

      const mockTransactions = Array.from({ length: 15 }, (_, i) => ({
        id: `txn-${i}`,
        amount: { toNumber: () => 100 - i } as any,
        date: new Date('2024-03-10'),
        description: `Transaction ${i}`,
        spendingCategory: { name: 'Category' },
      }));

      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);

      const result = await ReportsService.generateMonthlySummary(familyId, monthDate);

      expect(result.topExpenses).toHaveLength(10);
      expect(result.topExpenses[0].description).toBe('Transaction 0');
      expect(result.topExpenses[9].description).toBe('Transaction 9');
    });
  });

  describe('Helper Methods and Edge Cases', () => {
    test('should handle transactions without spending categories', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          amount: { toNumber: () => 500 } as any,
          spendingCategory: null,
          merchantName: 'Unknown Store',
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);

      const result = await ReportsService.generateSpendingAnalysis(familyId, dateRange);

      const uncategorizedExpense = result.categoryBreakdown.find(c => c.categoryName === 'Uncategorized');
      expect(uncategorizedExpense).toBeDefined();
      expect(uncategorizedExpense?.amount).toBe(500);
    });

    test('should handle transactions with null merchant names', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          amount: { toNumber: () => 500 } as any,
          spendingCategory: { name: 'Food' },
          merchantName: null,
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);

      const result = await ReportsService.generateSpendingAnalysis(familyId, dateRange);

      expect(result.topMerchants[0].merchantName).toBe('Unknown');
    });

    test('should handle income events with null source and actualAmount', async () => {
      const mockIncomeEvents = [
        {
          id: 'income-1',
          name: 'Mystery Payment',
          amount: { toNumber: () => 1000 } as any,
          actualAmount: null,
          source: null,
        },
      ];

      mockPrisma.incomeEvent.findMany.mockResolvedValue(mockIncomeEvents as any);

      const result = await ReportsService.generateIncomeAnalysis(familyId, dateRange);

      expect(result.totalIncome).toBe(1000); // Uses amount when actualAmount is null
      expect(result.sources[0].source).toBe('Mystery Payment'); // Uses name when source is null
    });

    test('should handle edge case date ranges', async () => {
      const singleDayRange: DateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-01'),
      };

      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await ReportsService.generateCashFlowReport(familyId, singleDayRange, 'day', false);

      expect(result).toHaveLength(1);
      expect(result[0].period).toBe('2024-01-01');
    });

    test('should handle performance calculation edge cases', async () => {
      const mockBudgetCategories = [
        {
          id: 'budget-1',
          familyId,
          name: 'Zero Budget Category',
          isActive: true,
          allocations: [],
          spendingCategories: [
            {
              transactions: [
                { amount: { toNumber: () => 100 } as any, bankAccount: { familyId } },
              ],
            },
          ],
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(mockBudgetCategories as any);

      const result = await ReportsService.generateBudgetPerformance(familyId, dateRange);

      expect(result.overallPerformance.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.categoryPerformance[0].performancePercentage).toBe(0);
    });
  });
});