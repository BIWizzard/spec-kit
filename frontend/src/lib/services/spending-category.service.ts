import { prisma } from '../prisma';
import { SpendingCategory, BudgetCategory, Prisma } from '@prisma/client';

export type CreateSpendingCategoryData = {
  name: string;
  parentCategoryId?: string;
  budgetCategoryId: string;
  icon?: string;
  color?: string;
  monthlyTarget?: number;
  description?: string;
};

export type UpdateSpendingCategoryData = {
  name?: string;
  parentCategoryId?: string;
  budgetCategoryId?: string;
  icon?: string;
  color?: string;
  monthlyTarget?: number;
  isActive?: boolean;
  description?: string;
};

export type SpendingCategoryFilter = {
  includeInactive?: boolean;
  parentCategoryId?: string;
  budgetCategoryId?: string;
  hasMonthlyTarget?: boolean;
  searchTerm?: string;
};

export type CategoryUsageStats = {
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  lastUsed: Date | null;
  monthlyAverage: number;
  percentageOfTotalSpending: number;
};

export type CategoryHierarchy = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  monthlyTarget?: number;
  budgetCategory: {
    id: string;
    name: string;
    color: string;
  };
  children: CategoryHierarchy[];
  transactionCount: number;
  totalSpent: number;
};

export class SpendingCategoryService {
  static async getSpendingCategories(
    familyId: string,
    filter: SpendingCategoryFilter = {}
  ): Promise<SpendingCategory[]> {
    const where: Prisma.SpendingCategoryWhereInput = {
      familyId,
      ...(filter.includeInactive !== true && { isActive: true }),
      ...(filter.parentCategoryId !== undefined && { parentCategoryId: filter.parentCategoryId }),
      ...(filter.budgetCategoryId && { budgetCategoryId: filter.budgetCategoryId }),
      ...(filter.hasMonthlyTarget !== undefined && {
        monthlyTarget: filter.hasMonthlyTarget ? { not: null } : null,
      }),
    };

    if (filter.searchTerm) {
      where.name = {
        contains: filter.searchTerm,
        mode: 'insensitive',
      };
    }

    return prisma.spendingCategory.findMany({
      where,
      include: {
        budgetCategory: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        parentCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            payments: true,
          },
        },
      },
      orderBy: [
        { parentCategoryId: 'asc' }, // Parent categories first
        { name: 'asc' },
      ],
    }) as Promise<SpendingCategory[]>;
  }

  static async getSpendingCategoryById(
    familyId: string,
    categoryId: string
  ): Promise<SpendingCategory | null> {
    return prisma.spendingCategory.findFirst({
      where: {
        id: categoryId,
        familyId,
      },
      include: {
        budgetCategory: true,
        parentCategory: true,
        children: {
          where: { isActive: true },
        },
        _count: {
          select: {
            transactions: true,
            payments: true,
          },
        },
      },
    }) as Promise<SpendingCategory | null>;
  }

  static async createSpendingCategory(
    familyId: string,
    userId: string,
    data: CreateSpendingCategoryData
  ): Promise<SpendingCategory> {
    // Verify user permissions
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canEditPayments) {
      throw new Error('Insufficient permissions to create spending categories');
    }

    // Verify budget category exists and belongs to family
    const budgetCategory = await prisma.budgetCategory.findFirst({
      where: {
        id: data.budgetCategoryId,
        familyId,
        isActive: true,
      },
    });

    if (!budgetCategory) {
      throw new Error('Budget category not found or not authorized');
    }

    // Verify parent category if specified
    if (data.parentCategoryId) {
      const parentCategory = await prisma.spendingCategory.findFirst({
        where: {
          id: data.parentCategoryId,
          familyId,
          isActive: true,
          parentCategoryId: null, // Parent categories cannot have parents
        },
      });

      if (!parentCategory) {
        throw new Error('Parent category not found or invalid');
      }
    }

    // Check for duplicate names within the same level
    const existingCategory = await prisma.spendingCategory.findFirst({
      where: {
        familyId,
        name: data.name,
        parentCategoryId: data.parentCategoryId || null,
        isActive: true,
      },
    });

    if (existingCategory) {
      throw new Error('A category with this name already exists at this level');
    }

    // Create the category
    return prisma.spendingCategory.create({
      data: {
        familyId,
        name: data.name,
        parentCategoryId: data.parentCategoryId,
        budgetCategoryId: data.budgetCategoryId,
        icon: data.icon || this.getDefaultIcon(data.name),
        color: data.color || this.getDefaultColor(),
        monthlyTarget: data.monthlyTarget ? new Prisma.Decimal(data.monthlyTarget) : null,
        isActive: true,
      },
      include: {
        budgetCategory: true,
        parentCategory: true,
      },
    }) as Promise<SpendingCategory>;
  }

  static async updateSpendingCategory(
    familyId: string,
    categoryId: string,
    userId: string,
    data: UpdateSpendingCategoryData
  ): Promise<SpendingCategory> {
    // Verify user permissions
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canEditPayments) {
      throw new Error('Insufficient permissions to update spending categories');
    }

    // Verify category exists and belongs to family
    const existingCategory = await this.getSpendingCategoryById(familyId, categoryId);
    if (!existingCategory) {
      throw new Error('Spending category not found');
    }

    // Verify budget category if being updated
    if (data.budgetCategoryId && data.budgetCategoryId !== existingCategory.budgetCategoryId) {
      const budgetCategory = await prisma.budgetCategory.findFirst({
        where: {
          id: data.budgetCategoryId,
          familyId,
          isActive: true,
        },
      });

      if (!budgetCategory) {
        throw new Error('Budget category not found or not authorized');
      }
    }

    // Verify parent category if being updated
    if (data.parentCategoryId !== undefined && data.parentCategoryId !== existingCategory.parentCategoryId) {
      if (data.parentCategoryId) {
        // Prevent circular references
        if (data.parentCategoryId === categoryId) {
          throw new Error('Category cannot be its own parent');
        }

        const parentCategory = await prisma.spendingCategory.findFirst({
          where: {
            id: data.parentCategoryId,
            familyId,
            isActive: true,
            parentCategoryId: null, // Parent categories cannot have parents
          },
        });

        if (!parentCategory) {
          throw new Error('Parent category not found or invalid');
        }

        // Check if the new parent is a child of this category
        const isCircular = await this.wouldCreateCircularReference(categoryId, data.parentCategoryId);
        if (isCircular) {
          throw new Error('Cannot create circular reference in category hierarchy');
        }
      }
    }

    // Check for duplicate names if name is being updated
    if (data.name && data.name !== existingCategory.name) {
      const duplicateCategory = await prisma.spendingCategory.findFirst({
        where: {
          familyId,
          name: data.name,
          parentCategoryId: data.parentCategoryId !== undefined ? data.parentCategoryId : existingCategory.parentCategoryId,
          isActive: true,
          id: { not: categoryId },
        },
      });

      if (duplicateCategory) {
        throw new Error('A category with this name already exists at this level');
      }
    }

    // Build update data
    const updateData: Prisma.SpendingCategoryUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parentCategoryId !== undefined) updateData.parentCategoryId = data.parentCategoryId;
    if (data.budgetCategoryId !== undefined) updateData.budgetCategoryId = data.budgetCategoryId;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.monthlyTarget !== undefined) {
      updateData.monthlyTarget = data.monthlyTarget ? new Prisma.Decimal(data.monthlyTarget) : null;
    }

    return prisma.spendingCategory.update({
      where: { id: categoryId },
      data: updateData,
      include: {
        budgetCategory: true,
        parentCategory: true,
        children: {
          where: { isActive: true },
        },
      },
    }) as Promise<SpendingCategory>;
  }

  static async deleteSpendingCategory(
    familyId: string,
    categoryId: string,
    userId: string,
    options?: {
      moveTransactionsTo?: string;
      movePaymentsTo?: string;
    }
  ): Promise<void> {
    // Verify user permissions
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canEditPayments) {
      throw new Error('Insufficient permissions to delete spending categories');
    }

    // Verify category exists
    const category = await this.getSpendingCategoryById(familyId, categoryId);
    if (!category) {
      throw new Error('Spending category not found');
    }

    await prisma.$transaction(async (tx) => {
      // Check for child categories
      const childCategories = await tx.spendingCategory.findMany({
        where: {
          parentCategoryId: categoryId,
          isActive: true,
        },
      });

      if (childCategories.length > 0) {
        // Move child categories to parent's parent (or make them top-level)
        await tx.spendingCategory.updateMany({
          where: { parentCategoryId: categoryId },
          data: { parentCategoryId: category.parentCategoryId },
        });
      }

      // Handle existing transactions and payments
      const transactionCount = await tx.transaction.count({
        where: { spendingCategoryId: categoryId },
      });

      const paymentCount = await tx.payment.count({
        where: { spendingCategoryId: categoryId },
      });

      if (transactionCount > 0 || paymentCount > 0) {
        if (options?.moveTransactionsTo || options?.movePaymentsTo) {
          // Move transactions to specified category
          if (options.moveTransactionsTo && transactionCount > 0) {
            const targetCategory = await tx.spendingCategory.findFirst({
              where: {
                id: options.moveTransactionsTo,
                familyId,
                isActive: true,
              },
            });

            if (!targetCategory) {
              throw new Error('Target category for transactions not found');
            }

            await tx.transaction.updateMany({
              where: { spendingCategoryId: categoryId },
              data: {
                spendingCategoryId: options.moveTransactionsTo,
                userCategorized: false, // Mark as needing review
              },
            });
          }

          // Move payments to specified category
          if (options.movePaymentsTo && paymentCount > 0) {
            const targetCategory = await tx.spendingCategory.findFirst({
              where: {
                id: options.movePaymentsTo,
                familyId,
                isActive: true,
              },
            });

            if (!targetCategory) {
              throw new Error('Target category for payments not found');
            }

            await tx.payment.updateMany({
              where: { spendingCategoryId: categoryId },
              data: { spendingCategoryId: options.movePaymentsTo },
            });
          }
        } else {
          // Just unlink - set to null
          await tx.transaction.updateMany({
            where: { spendingCategoryId: categoryId },
            data: {
              spendingCategoryId: null,
              userCategorized: false,
            },
          });

          await tx.payment.updateMany({
            where: { spendingCategoryId: categoryId },
            data: { spendingCategoryId: null },
          });
        }
      }

      // Soft delete the category
      await tx.spendingCategory.update({
        where: { id: categoryId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    });
  }

  static async getCategoryHierarchy(familyId: string): Promise<CategoryHierarchy[]> {
    const categories = await prisma.spendingCategory.findMany({
      where: {
        familyId,
        isActive: true,
      },
      include: {
        budgetCategory: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        children: {
          where: { isActive: true },
          include: {
            budgetCategory: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            _count: {
              select: {
                transactions: true,
              },
            },
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get transaction totals for spending calculation
    const transactionTotals = await this.getCategorySpendingTotals(familyId);

    // Build hierarchy (only top-level categories, children are included)
    return categories
      .filter(category => !category.parentCategoryId)
      .map(category => this.buildCategoryHierarchy(category, transactionTotals));
  }

  static async getCategoryUsageStats(
    familyId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<CategoryUsageStats[]> {
    const whereClause = {
      bankAccount: { familyId },
      spendingCategoryId: { not: null },
      ...(dateRange && {
        date: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    // Get transaction stats grouped by category
    const categoryStats = await prisma.transaction.groupBy({
      by: ['spendingCategoryId'],
      where: whereClause,
      _count: { id: true },
      _sum: { amount: true },
      _max: { date: true },
    });

    // Get total spending for percentage calculation
    const totalSpending = await prisma.transaction.aggregate({
      where: whereClause,
      _sum: { amount: true },
    });

    const totalAmount = Number(totalSpending._sum.amount || 0);

    // Get category details
    const categories = await prisma.spendingCategory.findMany({
      where: {
        familyId,
        id: { in: categoryStats.map(stat => stat.spendingCategoryId).filter(Boolean) },
      },
    });

    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    // Calculate monthly averages
    const monthsInRange = dateRange
      ? Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 1;

    return categoryStats.map(stat => {
      const category = categoryMap.get(stat.spendingCategoryId!);
      const totalCategoryAmount = Number(stat._sum.amount || 0);

      return {
        categoryId: stat.spendingCategoryId!,
        categoryName: category?.name || 'Unknown',
        transactionCount: stat._count.id,
        totalAmount: totalCategoryAmount,
        averageAmount: totalCategoryAmount / stat._count.id,
        lastUsed: stat._max.date,
        monthlyAverage: totalCategoryAmount / monthsInRange,
        percentageOfTotalSpending: totalAmount > 0 ? (totalCategoryAmount / totalAmount) * 100 : 0,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  static async getDefaultCategories(): Promise<Array<{
    name: string;
    icon: string;
    color: string;
    budgetCategoryName: string;
    children?: Array<{ name: string; icon: string; color: string }>;
  }>> {
    return [
      {
        name: 'Housing',
        icon: '🏠',
        color: '#4F46E5',
        budgetCategoryName: 'Needs',
        children: [
          { name: 'Rent/Mortgage', icon: '🏠', color: '#4F46E5' },
          { name: 'Utilities', icon: '⚡', color: '#F59E0B' },
          { name: 'Home Maintenance', icon: '🔧', color: '#8B5CF6' },
        ],
      },
      {
        name: 'Transportation',
        icon: '🚗',
        color: '#EF4444',
        budgetCategoryName: 'Needs',
        children: [
          { name: 'Gas', icon: '⛽', color: '#EF4444' },
          { name: 'Car Payment', icon: '🚗', color: '#DC2626' },
          { name: 'Insurance', icon: '🛡️', color: '#F97316' },
          { name: 'Maintenance', icon: '🔧', color: '#EA580C' },
        ],
      },
      {
        name: 'Food',
        icon: '🍽️',
        color: '#10B981',
        budgetCategoryName: 'Needs',
        children: [
          { name: 'Groceries', icon: '🛒', color: '#10B981' },
          { name: 'Dining Out', icon: '🍕', color: '#059669' },
        ],
      },
      {
        name: 'Entertainment',
        icon: '🎮',
        color: '#8B5CF6',
        budgetCategoryName: 'Wants',
        children: [
          { name: 'Movies', icon: '🎬', color: '#8B5CF6' },
          { name: 'Gaming', icon: '🎮', color: '#7C3AED' },
          { name: 'Subscriptions', icon: '📺', color: '#6D28D9' },
        ],
      },
      {
        name: 'Healthcare',
        icon: '🏥',
        color: '#EC4899',
        budgetCategoryName: 'Needs',
        children: [
          { name: 'Medical', icon: '🏥', color: '#EC4899' },
          { name: 'Pharmacy', icon: '💊', color: '#DB2777' },
          { name: 'Insurance', icon: '🛡️', color: '#BE185D' },
        ],
      },
      {
        name: 'Shopping',
        icon: '🛍️',
        color: '#F59E0B',
        budgetCategoryName: 'Wants',
      },
      {
        name: 'Savings',
        icon: '💰',
        color: '#059669',
        budgetCategoryName: 'Savings',
      },
    ];
  }

  private static async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    // Check if newParentId is a descendant of categoryId
    const descendants = await this.getAllDescendants(categoryId);
    return descendants.includes(newParentId);
  }

  private static async getAllDescendants(categoryId: string): Promise<string[]> {
    const children = await prisma.spendingCategory.findMany({
      where: { parentCategoryId: categoryId },
      select: { id: true },
    });

    let descendants = children.map(child => child.id);

    // Recursively get descendants
    for (const child of children) {
      const childDescendants = await this.getAllDescendants(child.id);
      descendants = descendants.concat(childDescendants);
    }

    return descendants;
  }

  private static async getCategorySpendingTotals(familyId: string): Promise<Map<string, number>> {
    const transactionTotals = await prisma.transaction.groupBy({
      by: ['spendingCategoryId'],
      where: {
        bankAccount: { familyId },
        spendingCategoryId: { not: null },
      },
      _sum: { amount: true },
    });

    const totalsMap = new Map<string, number>();
    for (const total of transactionTotals) {
      if (total.spendingCategoryId) {
        totalsMap.set(total.spendingCategoryId, Number(total._sum.amount || 0));
      }
    }

    return totalsMap;
  }

  private static buildCategoryHierarchy(category: any, transactionTotals: Map<string, number>): CategoryHierarchy {
    const totalSpent = transactionTotals.get(category.id) || 0;
    const transactionCount = category._count.transactions || 0;

    return {
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isActive: category.isActive,
      monthlyTarget: category.monthlyTarget ? Number(category.monthlyTarget) : undefined,
      budgetCategory: category.budgetCategory,
      transactionCount,
      totalSpent,
      children: category.children.map((child: any) => ({
        id: child.id,
        name: child.name,
        icon: child.icon,
        color: child.color,
        isActive: child.isActive,
        budgetCategory: child.budgetCategory,
        transactionCount: child._count.transactions || 0,
        totalSpent: transactionTotals.get(child.id) || 0,
        children: [], // Assume max 2 levels for now
      })),
    };
  }

  private static getDefaultIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      housing: '🏠',
      rent: '🏠',
      mortgage: '🏠',
      utilities: '⚡',
      transportation: '🚗',
      gas: '⛽',
      car: '🚗',
      food: '🍽️',
      groceries: '🛒',
      dining: '🍕',
      restaurant: '🍕',
      entertainment: '🎮',
      shopping: '🛍️',
      healthcare: '🏥',
      medical: '🏥',
      pharmacy: '💊',
      savings: '💰',
      insurance: '🛡️',
      maintenance: '🔧',
    };

    const lowerName = categoryName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }

    return '📁'; // Default folder icon
  }

  private static getDefaultColor(): string {
    const colors = [
      '#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }
}