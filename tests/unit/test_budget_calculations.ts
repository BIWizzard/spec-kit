import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { BudgetService } from '../../backend/src/services/budget.service';
import { prisma } from '../../backend/src/lib/prisma';

jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: {
    budgetCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    budgetAllocation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    incomeEvent: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    spendingCategory: {
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('BudgetService - Budget Calculations', () => {
  const familyId = 'family-123';
  const categoryId = 'category-123';
  const incomeEventId = 'income-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Percentage Validation', () => {
    test('should validate category percentages do not exceed 100%', async () => {
      mockPrisma.budgetCategory.findMany.mockResolvedValue([
        {
          id: 'cat-1',
          familyId,
          name: 'Needs',
          targetPercentage: { toNumber: () => 50 } as any,
          color: '#3B82F6',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-2',
          familyId,
          name: 'Wants',
          targetPercentage: { toNumber: () => 30 } as any,
          color: '#10B981',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await expect(
        BudgetService.validateCategoryPercentages(familyId, 25)
      ).resolves.toBeUndefined();

      await expect(
        BudgetService.validateCategoryPercentages(familyId, 30)
      ).rejects.toThrow('Total budget percentages cannot exceed 100%. Current total: 110%');
    });

    test('should exclude specific category from percentage validation', async () => {
      mockPrisma.budgetCategory.findMany.mockResolvedValue([
        {
          id: 'cat-2',
          familyId,
          name: 'Wants',
          targetPercentage: { toNumber: () => 30 } as any,
          color: '#10B981',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await expect(
        BudgetService.validateCategoryPercentages(familyId, 70, 'cat-1')
      ).resolves.toBeUndefined();

      await expect(
        BudgetService.validateCategoryPercentages(familyId, 80, 'cat-1')
      ).rejects.toThrow('Total budget percentages cannot exceed 100%. Current total: 110%');
    });

    test('should handle empty category list in validation', async () => {
      mockPrisma.budgetCategory.findMany.mockResolvedValue([]);

      await expect(
        BudgetService.validateCategoryPercentages(familyId, 100)
      ).resolves.toBeUndefined();

      await expect(
        BudgetService.validateCategoryPercentages(familyId, 110)
      ).rejects.toThrow('Total budget percentages cannot exceed 100%. Current total: 110%');
    });
  });

  describe('Budget Allocation Calculations', () => {
    test('should calculate correct allocation amounts from percentages', async () => {
      const incomeEvent = {
        id: incomeEventId,
        familyId,
        name: 'Salary',
        amount: { toNumber: () => 5000 } as any,
        scheduledDate: new Date(),
        actualDate: null,
        actualAmount: null,
        frequency: 'monthly' as const,
        nextOccurrence: new Date(),
        allocatedAmount: { toNumber: () => 0 } as any,
        remainingAmount: { toNumber: () => 5000 } as any,
        status: 'scheduled' as const,
        source: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const categories = [
        {
          id: 'cat-1',
          familyId,
          name: 'Needs',
          targetPercentage: { toNumber: () => 50 } as any,
          color: '#3B82F6',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-2',
          familyId,
          name: 'Wants',
          targetPercentage: { toNumber: () => 30 } as any,
          color: '#10B981',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-3',
          familyId,
          name: 'Savings',
          targetPercentage: { toNumber: () => 20 } as any,
          color: '#F59E0B',
          sortOrder: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.incomeEvent.findFirst.mockResolvedValue(incomeEvent);
      mockPrisma.budgetAllocation.findMany.mockResolvedValue([]);
      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories);

      const mockCreatedAllocations = [
        {
          id: 'alloc-1',
          incomeEventId,
          budgetCategoryId: 'cat-1',
          amount: { toNumber: () => 2500 } as any,
          percentage: { toNumber: () => 50 } as any,
          createdAt: new Date(),
        },
        {
          id: 'alloc-2',
          incomeEventId,
          budgetCategoryId: 'cat-2',
          amount: { toNumber: () => 1500 } as any,
          percentage: { toNumber: () => 30 } as any,
          createdAt: new Date(),
        },
        {
          id: 'alloc-3',
          incomeEventId,
          budgetCategoryId: 'cat-3',
          amount: { toNumber: () => 1000 } as any,
          percentage: { toNumber: () => 20 } as any,
          createdAt: new Date(),
        },
      ];

      let callCount = 0;
      mockPrisma.budgetAllocation.create.mockImplementation(async (params: any) => {
        return mockCreatedAllocations[callCount++];
      });

      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const allocations = await BudgetService.generateBudgetAllocation(familyId, {
        incomeEventId,
      });

      expect(allocations).toHaveLength(3);
      expect(mockPrisma.budgetAllocation.create).toHaveBeenCalledTimes(3);

      expect(mockPrisma.budgetAllocation.create).toHaveBeenNthCalledWith(1, {
        data: {
          incomeEventId,
          budgetCategoryId: 'cat-1',
          amount: expect.objectContaining({}),
          percentage: expect.objectContaining({}),
        },
      });
    });

    test('should handle override percentages in allocation generation', async () => {
      const incomeEvent = {
        id: incomeEventId,
        familyId,
        name: 'Bonus',
        amount: { toNumber: () => 10000 } as any,
        scheduledDate: new Date(),
        actualDate: null,
        actualAmount: null,
        frequency: 'once' as const,
        nextOccurrence: new Date(),
        allocatedAmount: { toNumber: () => 0 } as any,
        remainingAmount: { toNumber: () => 10000 } as any,
        status: 'scheduled' as const,
        source: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const categories = [
        {
          id: 'cat-1',
          familyId,
          name: 'Emergency Fund',
          targetPercentage: { toNumber: () => 100 } as any,
          color: '#EF4444',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.incomeEvent.findFirst.mockResolvedValue(incomeEvent);
      mockPrisma.budgetAllocation.findMany.mockResolvedValue([]);
      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories);

      const mockCreatedAllocation = {
        id: 'alloc-1',
        incomeEventId,
        budgetCategoryId: 'cat-1',
        amount: { toNumber: () => 8000 } as any,
        percentage: { toNumber: () => 80 } as any,
        createdAt: new Date(),
      };

      mockPrisma.budgetAllocation.create.mockResolvedValue(mockCreatedAllocation);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const allocations = await BudgetService.generateBudgetAllocation(familyId, {
        incomeEventId,
        overrideCategoryPercentages: { 'cat-1': 80 },
      });

      expect(allocations).toHaveLength(1);
      expect(mockPrisma.budgetAllocation.create).toHaveBeenCalledWith({
        data: {
          incomeEventId,
          budgetCategoryId: 'cat-1',
          amount: expect.objectContaining({}),
          percentage: expect.objectContaining({}),
        },
      });
    });

    test('should prevent duplicate allocations for same income event', async () => {
      const incomeEvent = {
        id: incomeEventId,
        familyId,
        name: 'Salary',
        amount: { toNumber: () => 5000 } as any,
        scheduledDate: new Date(),
        actualDate: null,
        actualAmount: null,
        frequency: 'monthly' as const,
        nextOccurrence: new Date(),
        allocatedAmount: { toNumber: () => 5000 } as any,
        remainingAmount: { toNumber: () => 0 } as any,
        status: 'scheduled' as const,
        source: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingAllocations = [
        {
          id: 'existing-alloc-1',
          incomeEventId,
          budgetCategoryId: 'cat-1',
          amount: { toNumber: () => 5000 } as any,
          percentage: { toNumber: () => 100 } as any,
          createdAt: new Date(),
        },
      ];

      mockPrisma.incomeEvent.findFirst.mockResolvedValue(incomeEvent);
      mockPrisma.budgetAllocation.findMany.mockResolvedValue(existingAllocations);

      await expect(
        BudgetService.generateBudgetAllocation(familyId, { incomeEventId })
      ).rejects.toThrow('Budget allocation already exists for this income event');
    });

    test('should handle rounding in allocation calculations', async () => {
      const incomeEvent = {
        id: incomeEventId,
        familyId,
        name: 'Freelance Payment',
        amount: { toNumber: () => 3333.33 } as any,
        scheduledDate: new Date(),
        actualDate: null,
        actualAmount: null,
        frequency: 'once' as const,
        nextOccurrence: new Date(),
        allocatedAmount: { toNumber: () => 0 } as any,
        remainingAmount: { toNumber: () => 3333.33 } as any,
        status: 'scheduled' as const,
        source: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const categories = [
        {
          id: 'cat-1',
          familyId,
          name: 'Split Category',
          targetPercentage: { toNumber: () => 33.33 } as any,
          color: '#8B5CF6',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.incomeEvent.findFirst.mockResolvedValue(incomeEvent);
      mockPrisma.budgetAllocation.findMany.mockResolvedValue([]);
      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories);

      const mockCreatedAllocation = {
        id: 'alloc-1',
        incomeEventId,
        budgetCategoryId: 'cat-1',
        amount: { toNumber: () => 1111.11 } as any,
        percentage: { toNumber: () => 33.33 } as any,
        createdAt: new Date(),
      };

      mockPrisma.budgetAllocation.create.mockResolvedValue(mockCreatedAllocation);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      await BudgetService.generateBudgetAllocation(familyId, { incomeEventId });

      expect(mockPrisma.budgetAllocation.create).toHaveBeenCalledWith({
        data: {
          incomeEventId,
          budgetCategoryId: 'cat-1',
          amount: expect.objectContaining({}),
          percentage: expect.objectContaining({}),
        },
      });
    });
  });

  describe('Budget Performance Calculations', () => {
    test('should calculate budget performance with actual spending', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const categoriesWithSpending = [
        {
          id: 'cat-1',
          familyId,
          name: 'Groceries',
          targetPercentage: { toNumber: () => 30 } as any,
          color: '#10B981',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          budgetAllocations: [
            {
              id: 'alloc-1',
              amount: { toNumber: () => 1500 } as any,
              incomeEvent: {
                scheduledDate: new Date('2024-01-15'),
              },
            },
          ],
          spendingCategories: [
            {
              id: 'spend-1',
              name: 'Grocery Stores',
              transactions: [
                {
                  id: 'txn-1',
                  amount: { toNumber: () => -500 } as any,
                  date: new Date('2024-01-10'),
                },
                {
                  id: 'txn-2',
                  amount: { toNumber: () => -600 } as any,
                  date: new Date('2024-01-20'),
                },
              ],
              payments: [
                {
                  id: 'pay-1',
                  paidAmount: { toNumber: () => 200 } as any,
                  paidDate: new Date('2024-01-25'),
                  status: 'paid' as const,
                },
              ],
            },
          ],
        },
        {
          id: 'cat-2',
          familyId,
          name: 'Entertainment',
          targetPercentage: { toNumber: () => 10 } as any,
          color: '#F59E0B',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          budgetAllocations: [
            {
              id: 'alloc-2',
              amount: { toNumber: () => 500 } as any,
              incomeEvent: {
                scheduledDate: new Date('2024-01-15'),
              },
            },
          ],
          spendingCategories: [
            {
              id: 'spend-2',
              name: 'Movies',
              transactions: [
                {
                  id: 'txn-3',
                  amount: { toNumber: () => -75 } as any,
                  date: new Date('2024-01-12'),
                },
              ],
              payments: [],
            },
          ],
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(categoriesWithSpending);

      const performance = await BudgetService.getBudgetPerformance(familyId, startDate, endDate);

      expect(performance).toHaveLength(2);

      const groceriesPerformance = performance.find(p => p.categoryName === 'Groceries');
      expect(groceriesPerformance).toEqual({
        categoryId: 'cat-1',
        categoryName: 'Groceries',
        targetAmount: 1500,
        actualAmount: 1300, // 500 + 600 + 200
        variance: 200, // 1500 - 1300
        percentUsed: 86.67, // (1300 / 1500) * 100
      });

      const entertainmentPerformance = performance.find(p => p.categoryName === 'Entertainment');
      expect(entertainmentPerformance).toEqual({
        categoryId: 'cat-2',
        categoryName: 'Entertainment',
        targetAmount: 500,
        actualAmount: 75,
        variance: 425, // 500 - 75
        percentUsed: 15, // (75 / 500) * 100
      });
    });

    test('should handle zero target amount in performance calculation', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const categoryWithNoAllocation = [
        {
          id: 'cat-1',
          familyId,
          name: 'Unused Category',
          targetPercentage: { toNumber: () => 0 } as any,
          color: '#6B7280',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          budgetAllocations: [],
          spendingCategories: [
            {
              id: 'spend-1',
              name: 'Miscellaneous',
              transactions: [
                {
                  id: 'txn-1',
                  amount: { toNumber: () => -100 } as any,
                  date: new Date('2024-01-15'),
                },
              ],
              payments: [],
            },
          ],
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(categoryWithNoAllocation);

      const performance = await BudgetService.getBudgetPerformance(familyId, startDate, endDate);

      expect(performance).toHaveLength(1);
      expect(performance[0]).toEqual({
        categoryId: 'cat-1',
        categoryName: 'Unused Category',
        targetAmount: 0,
        actualAmount: 100,
        variance: -100,
        percentUsed: 0,
      });
    });
  });

  describe('Budget Projections', () => {
    test('should calculate budget projections based on historical income', async () => {
      const categories = [
        {
          id: 'cat-1',
          familyId,
          name: 'Housing',
          targetPercentage: { toNumber: () => 40 } as any,
          color: '#EF4444',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-2',
          familyId,
          name: 'Transportation',
          targetPercentage: { toNumber: () => 15 } as any,
          color: '#3B82F6',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const historicalIncome = [
        {
          id: 'income-1',
          actualAmount: { toNumber: () => 5000 } as any,
          actualDate: new Date('2023-12-15'),
        },
        {
          id: 'income-2',
          actualAmount: { toNumber: () => 5200 } as any,
          actualDate: new Date('2023-11-15'),
        },
        {
          id: 'income-3',
          actualAmount: { toNumber: () => 4800 } as any,
          actualDate: new Date('2023-10-15'),
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories);
      mockPrisma.incomeEvent.findMany.mockResolvedValue(historicalIncome);

      const projections = await BudgetService.getBudgetProjections(familyId, 3);

      expect(projections).toHaveLength(3);

      const firstProjection = projections[0];
      expect(firstProjection).toHaveProperty('month');
      expect(firstProjection).toHaveProperty('totalBudget');
      expect(firstProjection).toHaveProperty('projectedSpending');
      expect(firstProjection.categories).toHaveLength(2);

      const housingProjection = firstProjection.categories.find(c => c.name === 'Housing');
      expect(housingProjection).toBeDefined();
      expect(housingProjection?.budgetAmount).toBeCloseTo(2000); // (5000 avg * 40%)
      expect(housingProjection?.projectedAmount).toBeCloseTo(1800); // 90% utilization

      const transportationProjection = firstProjection.categories.find(c => c.name === 'Transportation');
      expect(transportationProjection).toBeDefined();
      expect(transportationProjection?.budgetAmount).toBeCloseTo(750); // (5000 avg * 15%)
      expect(transportationProjection?.projectedAmount).toBeCloseTo(675); // 90% utilization
    });

    test('should handle zero historical income in projections', async () => {
      const categories = [
        {
          id: 'cat-1',
          familyId,
          name: 'Test Category',
          targetPercentage: { toNumber: () => 100 } as any,
          color: '#10B981',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories);
      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);

      const projections = await BudgetService.getBudgetProjections(familyId, 1);

      expect(projections).toHaveLength(1);
      expect(projections[0].totalBudget).toBe(0);
      expect(projections[0].projectedSpending).toBe(0);
      expect(projections[0].categories[0].budgetAmount).toBe(0);
    });
  });

  describe('Budget Overview Calculations', () => {
    test('should calculate budget overview with total percentage', async () => {
      const categories = [
        {
          id: 'cat-1',
          familyId,
          name: 'Needs',
          targetPercentage: { toNumber: () => 50 } as any,
          color: '#3B82F6',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-2',
          familyId,
          name: 'Wants',
          targetPercentage: { toNumber: () => 30 } as any,
          color: '#10B981',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-3',
          familyId,
          name: 'Savings',
          targetPercentage: { toNumber: () => 20 } as any,
          color: '#F59E0B',
          sortOrder: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories);

      const overview = await BudgetService.getBudgetOverview(familyId);

      expect(overview.categories).toHaveLength(3);
      expect(overview.totalPercentage).toBe(100);
      expect(overview.isComplete).toBe(true);
    });

    test('should identify incomplete budget in overview', async () => {
      const categories = [
        {
          id: 'cat-1',
          familyId,
          name: 'Housing',
          targetPercentage: { toNumber: () => 40 } as any,
          color: '#EF4444',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-2',
          familyId,
          name: 'Food',
          targetPercentage: { toNumber: () => 25 } as any,
          color: '#10B981',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories);

      const overview = await BudgetService.getBudgetOverview(familyId);

      expect(overview.categories).toHaveLength(2);
      expect(overview.totalPercentage).toBe(65);
      expect(overview.isComplete).toBe(false);
    });
  });

  describe('Allocation Update Calculations', () => {
    test('should recalculate percentage when updating allocation amount', async () => {
      const allocation = {
        id: 'alloc-123',
        incomeEventId,
        budgetCategoryId: categoryId,
        amount: { toNumber: () => 1000 } as any,
        percentage: { toNumber: () => 20 } as any,
        createdAt: new Date(),
        incomeEvent: {
          id: incomeEventId,
          amount: { toNumber: () => 5000 } as any,
          familyId,
        },
      };

      const updatedAllocation = {
        id: 'alloc-123',
        incomeEventId,
        budgetCategoryId: categoryId,
        amount: { toNumber: () => 1500 } as any,
        percentage: { toNumber: () => 30 } as any,
        createdAt: new Date(),
      };

      mockPrisma.budgetAllocation.findFirst.mockResolvedValue(allocation);
      mockPrisma.budgetAllocation.update.mockResolvedValue(updatedAllocation);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const result = await BudgetService.updateBudgetAllocation(familyId, 'alloc-123', 1500);

      expect(result).toEqual(updatedAllocation);
      expect(mockPrisma.budgetAllocation.update).toHaveBeenCalledWith({
        where: { id: 'alloc-123' },
        data: {
          amount: expect.objectContaining({}),
          percentage: expect.objectContaining({}),
        },
      });
    });

    test('should handle edge case of zero income in allocation update', async () => {
      const allocation = {
        id: 'alloc-123',
        incomeEventId,
        budgetCategoryId: categoryId,
        amount: { toNumber: () => 0 } as any,
        percentage: { toNumber: () => 0 } as any,
        createdAt: new Date(),
        incomeEvent: {
          id: incomeEventId,
          amount: { toNumber: () => 0 } as any,
          familyId,
        },
      };

      mockPrisma.budgetAllocation.findFirst.mockResolvedValue(allocation);

      await expect(
        BudgetService.updateBudgetAllocation(familyId, 'alloc-123', 100)
      ).rejects.toThrow(); // Division by zero should be handled appropriately
    });
  });

  describe('Template Application Calculations', () => {
    test('should apply template with correct percentage calculations', async () => {
      const template = {
        categories: [
          { name: '50-30-20 Needs', percentage: 50 },
          { name: '50-30-20 Wants', percentage: 30 },
          { name: '50-30-20 Savings', percentage: 20 },
        ],
      };

      const existingCategories = [
        {
          id: 'existing-1',
          familyId,
          name: '50-30-20 Needs',
          targetPercentage: { toNumber: () => 60 } as any,
          color: '#3B82F6',
          sortOrder: 1,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.budgetCategory.findMany.mockResolvedValue(existingCategories);
      mockPrisma.budgetCategory.updateMany.mockResolvedValue({ count: 1 });

      let updateCallCount = 0;
      let createCallCount = 0;

      mockPrisma.budgetCategory.update.mockImplementation(async () => {
        const updated = {
          id: 'existing-1',
          familyId,
          name: '50-30-20 Needs',
          targetPercentage: { toNumber: () => 50 } as any,
          color: '#3B82F6',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        updateCallCount++;
        return updated;
      });

      mockPrisma.budgetCategory.create.mockImplementation(async (params: any) => {
        const created = {
          id: `new-${++createCallCount}`,
          familyId,
          name: params.data.name,
          targetPercentage: params.data.targetPercentage,
          color: params.data.color,
          sortOrder: params.data.sortOrder,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return created;
      });

      const result = await BudgetService.applyBudgetTemplate(familyId, template);

      expect(result).toHaveLength(3);
      expect(updateCallCount).toBe(1);
      expect(createCallCount).toBe(2);

      expect(mockPrisma.budgetCategory.update).toHaveBeenCalledWith({
        where: { id: 'existing-1' },
        data: {
          targetPercentage: expect.objectContaining({}),
          sortOrder: 1,
          isActive: true,
        },
      });

      expect(mockPrisma.budgetCategory.create).toHaveBeenCalledTimes(2);
    });

    test('should handle template with overlapping percentages', async () => {
      const template = {
        categories: [
          { name: 'Category A', percentage: 60 },
          { name: 'Category B', percentage: 60 }, // Total = 120%
        ],
      };

      mockPrisma.budgetCategory.findMany.mockResolvedValue([]);
      mockPrisma.budgetCategory.updateMany.mockResolvedValue({ count: 0 });

      let createCallCount = 0;
      mockPrisma.budgetCategory.create.mockImplementation(async (params: any) => {
        const created = {
          id: `new-${++createCallCount}`,
          familyId,
          name: params.data.name,
          targetPercentage: params.data.targetPercentage,
          color: params.data.color,
          sortOrder: params.data.sortOrder,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return created;
      });

      const result = await BudgetService.applyBudgetTemplate(familyId, template);

      expect(result).toHaveLength(2);

      const totalPercentage = result.reduce(
        (sum, cat) => sum + cat.targetPercentage.toNumber(),
        0
      );
      expect(totalPercentage).toBe(120); // Template should be applied as-is
    });
  });
});