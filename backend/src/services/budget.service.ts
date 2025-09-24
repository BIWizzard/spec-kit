import { prisma } from '../lib/prisma';
import { BudgetCategory, BudgetAllocation, Prisma } from '@prisma/client';

export type CreateBudgetCategoryData = {
  name: string;
  targetPercentage: number;
  color: string;
  sortOrder?: number;
};

export type UpdateBudgetCategoryData = {
  name?: string;
  targetPercentage?: number;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type GenerateBudgetAllocationData = {
  incomeEventId: string;
  overrideCategoryPercentages?: { [categoryId: string]: number };
};

export type BudgetPerformanceResult = {
  categoryId: string;
  categoryName: string;
  targetAmount: number;
  actualAmount: number;
  variance: number;
  percentUsed: number;
};

export class BudgetService {
  static async createBudgetCategory(familyId: string, data: CreateBudgetCategoryData): Promise<BudgetCategory> {
    await this.validateCategoryPercentages(familyId, data.targetPercentage);

    const maxSortOrder = await prisma.budgetCategory.aggregate({
      where: { familyId, isActive: true },
      _max: { sortOrder: true },
    });

    const category = await prisma.budgetCategory.create({
      data: {
        familyId,
        name: data.name,
        targetPercentage: new Prisma.Decimal(data.targetPercentage),
        color: data.color,
        sortOrder: data.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
        isActive: true,
      },
    });

    await this.logAuditEvent(familyId, 'create', 'BudgetCategory', category.id, {}, {
      name: data.name,
      targetPercentage: data.targetPercentage,
    });

    return category;
  }

  static async getBudgetCategories(familyId: string, includeInactive: boolean = false): Promise<BudgetCategory[]> {
    const where: Prisma.BudgetCategoryWhereInput = { familyId };

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.budgetCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  static async getBudgetCategoryById(familyId: string, categoryId: string): Promise<BudgetCategory | null> {
    return prisma.budgetCategory.findFirst({
      where: {
        id: categoryId,
        familyId,
      },
      include: {
        budgetAllocations: {
          include: {
            incomeEvent: {
              select: {
                name: true,
                scheduledDate: true,
                amount: true,
              },
            },
          },
        },
        spendingCategories: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            monthlyTarget: true,
          },
        },
      },
    });
  }

  static async updateBudgetCategory(
    familyId: string,
    categoryId: string,
    data: UpdateBudgetCategoryData
  ): Promise<BudgetCategory> {
    const existingCategory = await prisma.budgetCategory.findFirst({
      where: { id: categoryId, familyId },
    });

    if (!existingCategory) {
      throw new Error('Budget category not found');
    }

    if (data.targetPercentage !== undefined) {
      await this.validateCategoryPercentages(familyId, data.targetPercentage, categoryId);
    }

    const updateData: Prisma.BudgetCategoryUpdateInput = {};
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      oldValues.name = existingCategory.name;
      newValues.name = data.name;
    }

    if (data.targetPercentage !== undefined) {
      updateData.targetPercentage = new Prisma.Decimal(data.targetPercentage);
      oldValues.targetPercentage = existingCategory.targetPercentage;
      newValues.targetPercentage = data.targetPercentage;
    }

    if (data.color !== undefined) {
      updateData.color = data.color;
      oldValues.color = existingCategory.color;
      newValues.color = data.color;
    }

    if (data.sortOrder !== undefined) {
      updateData.sortOrder = data.sortOrder;
      oldValues.sortOrder = existingCategory.sortOrder;
      newValues.sortOrder = data.sortOrder;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      oldValues.isActive = existingCategory.isActive;
      newValues.isActive = data.isActive;
    }

    const updatedCategory = await prisma.budgetCategory.update({
      where: { id: categoryId },
      data: updateData,
    });

    await this.logAuditEvent(familyId, 'update', 'BudgetCategory', categoryId, oldValues, newValues);

    return updatedCategory;
  }

  static async deleteBudgetCategory(familyId: string, categoryId: string): Promise<void> {
    const existingCategory = await prisma.budgetCategory.findFirst({
      where: { id: categoryId, familyId },
      include: {
        budgetAllocations: true,
        spendingCategories: { where: { isActive: true } },
      },
    });

    if (!existingCategory) {
      throw new Error('Budget category not found');
    }

    if (existingCategory.spendingCategories.length > 0) {
      throw new Error('Cannot delete budget category with active spending categories');
    }

    await prisma.$transaction(async (tx) => {
      await tx.budgetAllocation.deleteMany({
        where: { budgetCategoryId: categoryId },
      });

      await tx.budgetCategory.delete({
        where: { id: categoryId },
      });
    });

    await this.logAuditEvent(familyId, 'delete', 'BudgetCategory', categoryId, {
      name: existingCategory.name,
      targetPercentage: existingCategory.targetPercentage,
    }, {});
  }

  static async generateBudgetAllocation(
    familyId: string,
    data: GenerateBudgetAllocationData
  ): Promise<BudgetAllocation[]> {
    const incomeEvent = await prisma.incomeEvent.findFirst({
      where: { id: data.incomeEventId, familyId },
    });

    if (!incomeEvent) {
      throw new Error('Income event not found');
    }

    const existingAllocations = await prisma.budgetAllocation.findMany({
      where: { incomeEventId: data.incomeEventId },
    });

    if (existingAllocations.length > 0) {
      throw new Error('Budget allocation already exists for this income event');
    }

    const categories = await prisma.budgetCategory.findMany({
      where: { familyId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (categories.length === 0) {
      throw new Error('No active budget categories found');
    }

    const totalAmount = Number(incomeEvent.amount);
    const allocations: BudgetAllocation[] = [];

    await prisma.$transaction(async (tx) => {
      for (const category of categories) {
        const percentage = data.overrideCategoryPercentages?.[category.id]
          ?? Number(category.targetPercentage);

        const amount = Math.round((totalAmount * percentage / 100) * 100) / 100;

        const allocation = await tx.budgetAllocation.create({
          data: {
            incomeEventId: data.incomeEventId,
            budgetCategoryId: category.id,
            amount: new Prisma.Decimal(amount),
            percentage: new Prisma.Decimal(percentage),
          },
        });

        allocations.push(allocation);
      }
    });

    await this.logAuditEvent(familyId, 'create', 'BudgetAllocation', data.incomeEventId, {}, {
      incomeEventId: data.incomeEventId,
      totalAmount,
      categoriesCount: categories.length,
    });

    return allocations;
  }

  static async getBudgetAllocations(familyId: string, incomeEventId: string): Promise<BudgetAllocation[]> {
    const incomeEvent = await prisma.incomeEvent.findFirst({
      where: { id: incomeEventId, familyId },
    });

    if (!incomeEvent) {
      throw new Error('Income event not found');
    }

    return prisma.budgetAllocation.findMany({
      where: { incomeEventId },
      include: {
        budgetCategory: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        budgetCategory: {
          sortOrder: 'asc',
        },
      },
    });
  }

  static async updateBudgetAllocation(
    familyId: string,
    allocationId: string,
    amount: number
  ): Promise<BudgetAllocation> {
    const allocation = await prisma.budgetAllocation.findFirst({
      where: {
        id: allocationId,
        incomeEvent: { familyId },
      },
      include: {
        incomeEvent: true,
      },
    });

    if (!allocation) {
      throw new Error('Budget allocation not found');
    }

    const totalIncomeAmount = Number(allocation.incomeEvent.amount);
    const newPercentage = (amount / totalIncomeAmount) * 100;

    const updatedAllocation = await prisma.budgetAllocation.update({
      where: { id: allocationId },
      data: {
        amount: new Prisma.Decimal(amount),
        percentage: new Prisma.Decimal(newPercentage),
      },
    });

    await this.logAuditEvent(familyId, 'update', 'BudgetAllocation', allocationId,
      { amount: allocation.amount },
      { amount: amount }
    );

    return updatedAllocation;
  }

  static async validateCategoryPercentages(
    familyId: string,
    newPercentage: number,
    excludeCategoryId?: string
  ): Promise<void> {
    const categories = await prisma.budgetCategory.findMany({
      where: {
        familyId,
        isActive: true,
        ...(excludeCategoryId && { id: { not: excludeCategoryId } }),
      },
    });

    const currentTotal = categories.reduce((sum, cat) => sum + Number(cat.targetPercentage), 0);
    const newTotal = currentTotal + newPercentage;

    if (newTotal > 100) {
      throw new Error(`Total budget percentages cannot exceed 100%. Current total: ${newTotal}%`);
    }
  }

  static async getBudgetOverview(familyId: string): Promise<{
    categories: BudgetCategory[];
    totalPercentage: number;
    isComplete: boolean;
  }> {
    const categories = await this.getBudgetCategories(familyId);
    const totalPercentage = categories.reduce((sum, cat) => sum + Number(cat.targetPercentage), 0);

    return {
      categories,
      totalPercentage,
      isComplete: totalPercentage === 100,
    };
  }

  static async getBudgetPerformance(
    familyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BudgetPerformanceResult[]> {
    const categories = await prisma.budgetCategory.findMany({
      where: { familyId, isActive: true },
      include: {
        budgetAllocations: {
          where: {
            incomeEvent: {
              scheduledDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        spendingCategories: {
          where: { isActive: true },
          include: {
            transactions: {
              where: {
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
            payments: {
              where: {
                paidDate: {
                  gte: startDate,
                  lte: endDate,
                },
                status: 'paid',
              },
            },
          },
        },
      },
    });

    return categories.map(category => {
      const targetAmount = category.budgetAllocations.reduce(
        (sum, alloc) => sum + Number(alloc.amount), 0
      );

      const actualAmount = category.spendingCategories.reduce((categorySum, spendingCat) => {
        const transactionAmount = spendingCat.transactions.reduce(
          (sum, txn) => sum + Math.abs(Number(txn.amount)), 0
        );
        const paymentAmount = spendingCat.payments.reduce(
          (sum, payment) => sum + Number(payment.paidAmount || 0), 0
        );
        return categorySum + transactionAmount + paymentAmount;
      }, 0);

      const variance = targetAmount - actualAmount;
      const percentUsed = targetAmount > 0 ? (actualAmount / targetAmount) * 100 : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        targetAmount,
        actualAmount,
        variance,
        percentUsed,
      };
    });
  }

  static async getBudgetProjections(
    familyId: string,
    months: number = 6
  ): Promise<Array<{
    month: string;
    totalBudget: number;
    projectedSpending: number;
    categories: Array<{
      name: string;
      budgetAmount: number;
      projectedAmount: number;
    }>;
  }>> {
    const categories = await prisma.budgetCategory.findMany({
      where: { familyId, isActive: true },
    });

    const avgMonthlyIncome = await this.getAverageMonthlyIncome(familyId);
    const projections = [];

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthYear = date.toISOString().slice(0, 7);

      const categoryProjections = categories.map(category => {
        const budgetAmount = (avgMonthlyIncome * Number(category.targetPercentage)) / 100;
        const projectedAmount = budgetAmount * 0.9; // Assume 90% utilization

        return {
          name: category.name,
          budgetAmount,
          projectedAmount,
        };
      });

      const totalBudget = categoryProjections.reduce((sum, cat) => sum + cat.budgetAmount, 0);
      const projectedSpending = categoryProjections.reduce((sum, cat) => sum + cat.projectedAmount, 0);

      projections.push({
        month: monthYear,
        totalBudget,
        projectedSpending,
        categories: categoryProjections,
      });
    }

    return projections;
  }

  static async createBudgetTemplate(
    familyId: string,
    templateName: string
  ): Promise<{ name: string; categories: Array<{ name: string; percentage: number }> }> {
    const categories = await prisma.budgetCategory.findMany({
      where: { familyId, isActive: true },
      select: {
        name: true,
        targetPercentage: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      name: templateName,
      categories: categories.map(cat => ({
        name: cat.name,
        percentage: Number(cat.targetPercentage),
      })),
    };
  }

  static async applyBudgetTemplate(
    familyId: string,
    template: { categories: Array<{ name: string; percentage: number }> }
  ): Promise<BudgetCategory[]> {
    const existingCategories = await prisma.budgetCategory.findMany({
      where: { familyId },
    });

    await prisma.budgetCategory.updateMany({
      where: { familyId },
      data: { isActive: false },
    });

    const newCategories: BudgetCategory[] = [];

    for (let i = 0; i < template.categories.length; i++) {
      const templateCat = template.categories[i];

      const existing = existingCategories.find(cat => cat.name === templateCat.name);

      if (existing) {
        const updated = await prisma.budgetCategory.update({
          where: { id: existing.id },
          data: {
            targetPercentage: new Prisma.Decimal(templateCat.percentage),
            sortOrder: i + 1,
            isActive: true,
          },
        });
        newCategories.push(updated);
      } else {
        const created = await prisma.budgetCategory.create({
          data: {
            familyId,
            name: templateCat.name,
            targetPercentage: new Prisma.Decimal(templateCat.percentage),
            color: this.getDefaultColor(i),
            sortOrder: i + 1,
            isActive: true,
          },
        });
        newCategories.push(created);
      }
    }

    return newCategories;
  }

  private static async getAverageMonthlyIncome(familyId: string): Promise<number> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const incomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        status: 'received',
        actualDate: {
          gte: sixMonthsAgo,
        },
      },
    });

    if (incomeEvents.length === 0) return 0;

    const totalIncome = incomeEvents.reduce((sum, event) => sum + Number(event.actualAmount || 0), 0);
    return totalIncome / 6;
  }

  private static getDefaultColor(index: number): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
    ];
    return colors[index % colors.length];
  }

  private static async logAuditEvent(
    familyId: string,
    action: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    oldValues: object,
    newValues: object
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        familyId,
        familyMemberId: '',
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        ipAddress: '',
      },
    });
  }
}