import { prisma } from '../lib/prisma';
import { Transaction, SpendingCategory, Payment, Prisma } from '@prisma/client';

export type TransactionFilter = {
  bankAccountIds?: string[];
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  uncategorized?: boolean;
  pending?: boolean;
  amountRange?: {
    min?: number;
    max?: number;
  };
  searchTerm?: string;
};

export type BatchCategorizeData = {
  transactionIds: string[];
  spendingCategoryId: string;
  userCategorized?: boolean;
};

export type TransactionMatchResult = {
  transactionId: string;
  paymentId: string;
  matchConfidence: number;
  matchReason: string;
};

export type CategorySuggestion = {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reason: string;
};

export class TransactionService {
  static async getTransactions(
    familyId: string,
    filter: TransactionFilter = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{ transactions: Transaction[]; total: number }> {
    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      bankAccount: {
        familyId,
        deletedAt: null,
      },
    };

    if (filter.bankAccountIds?.length) {
      where.bankAccountId = { in: filter.bankAccountIds };
    }

    if (filter.startDate || filter.endDate) {
      where.date = {};
      if (filter.startDate) where.date.gte = filter.startDate;
      if (filter.endDate) where.date.lte = filter.endDate;
    }

    if (filter.categoryId) {
      where.spendingCategoryId = filter.categoryId;
    }

    if (filter.uncategorized) {
      where.OR = [
        { spendingCategoryId: null },
        { categoryConfidence: { lt: 0.8 } },
      ];
    }

    if (filter.pending !== undefined) {
      where.pending = filter.pending;
    }

    if (filter.amountRange) {
      where.amount = {};
      if (filter.amountRange.min !== undefined) {
        where.amount.gte = new Prisma.Decimal(filter.amountRange.min);
      }
      if (filter.amountRange.max !== undefined) {
        where.amount.lte = new Prisma.Decimal(filter.amountRange.max);
      }
    }

    if (filter.searchTerm) {
      where.OR = [
        { description: { contains: filter.searchTerm, mode: 'insensitive' } },
        { merchantName: { contains: filter.searchTerm, mode: 'insensitive' } },
        { notes: { contains: filter.searchTerm, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          spendingCategory: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
          bankAccount: {
            select: {
              id: true,
              accountName: true,
              institutionName: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions: transactions as Transaction[], total };
  }

  static async getTransactionById(
    familyId: string,
    transactionId: string
  ): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: {
        id: transactionId,
        bankAccount: {
          familyId,
          deletedAt: null,
        },
      },
      include: {
        spendingCategory: true,
        bankAccount: true,
      },
    }) as Promise<Transaction | null>;
  }

  static async updateTransaction(
    familyId: string,
    transactionId: string,
    data: {
      spendingCategoryId?: string;
      notes?: string;
      userCategorized?: boolean;
      categoryConfidence?: number;
    }
  ): Promise<Transaction> {
    // Verify transaction belongs to family
    const existingTransaction = await this.getTransactionById(familyId, transactionId);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...(data.spendingCategoryId !== undefined && { spendingCategoryId: data.spendingCategoryId }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.userCategorized !== undefined && { userCategorized: data.userCategorized }),
        ...(data.categoryConfidence !== undefined && {
          categoryConfidence: new Prisma.Decimal(data.categoryConfidence),
        }),
        updatedAt: new Date(),
      },
    }) as Promise<Transaction>;
  }

  static async batchCategorizeTransactions(
    familyId: string,
    data: BatchCategorizeData
  ): Promise<{ updatedCount: number; errors: Array<{ transactionId: string; error: string }> }> {
    // Verify all transactions belong to family
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: data.transactionIds },
        bankAccount: {
          familyId,
          deletedAt: null,
        },
      },
      select: { id: true },
    });

    const validTransactionIds = transactions.map(t => t.id);
    const invalidIds = data.transactionIds.filter(id => !validTransactionIds.includes(id));

    const errors: Array<{ transactionId: string; error: string }> = [];
    for (const invalidId of invalidIds) {
      errors.push({ transactionId: invalidId, error: 'Transaction not found or not authorized' });
    }

    // Verify category belongs to family
    if (data.spendingCategoryId) {
      const category = await prisma.spendingCategory.findFirst({
        where: {
          id: data.spendingCategoryId,
          familyId,
          isActive: true,
        },
      });

      if (!category) {
        throw new Error('Spending category not found or not authorized');
      }
    }

    // Batch update transactions
    const result = await prisma.transaction.updateMany({
      where: {
        id: { in: validTransactionIds },
      },
      data: {
        spendingCategoryId: data.spendingCategoryId || null,
        userCategorized: data.userCategorized ?? true,
        categoryConfidence: data.userCategorized !== false ? new Prisma.Decimal(1.0) : undefined,
        updatedAt: new Date(),
      },
    });

    return {
      updatedCount: result.count,
      errors,
    };
  }

  static async getUncategorizedTransactions(
    familyId: string,
    confidenceThreshold: number = 0.8,
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    transactions: Transaction[];
    total: number;
    suggestedCategories: CategorySuggestion[];
  }> {
    const filter: TransactionFilter = {
      uncategorized: true,
    };

    const { transactions, total } = await this.getTransactions(familyId, filter, limit, offset);

    // Generate category suggestions based on transaction patterns
    const suggestedCategories = await this.generateCategorySuggestions(familyId, transactions);

    return {
      transactions,
      total,
      suggestedCategories,
    };
  }

  static async matchTransactionsToPayments(
    familyId: string,
    options?: {
      bankAccountIds?: string[];
      dateRange?: { start: Date; end: Date };
      amountTolerance?: number;
      dateTolerance?: number;
    }
  ): Promise<TransactionMatchResult[]> {
    const amountTolerance = options?.amountTolerance || 0.01; // $0.01
    const dateTolerance = options?.dateTolerance || 3; // 3 days

    // Get unmatched transactions
    const transactionFilter: TransactionFilter = {
      ...(options?.bankAccountIds && { bankAccountIds: options.bankAccountIds }),
      ...(options?.dateRange && {
        startDate: options.dateRange.start,
        endDate: options.dateRange.end,
      }),
    };

    const { transactions } = await this.getTransactions(familyId, transactionFilter, 1000, 0);

    // Get scheduled payments around the same time
    const paymentStartDate = options?.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const paymentEndDate = options?.dateRange?.end || new Date();

    const payments = await prisma.payment.findMany({
      where: {
        familyId,
        dueDate: {
          gte: paymentStartDate,
          lte: paymentEndDate,
        },
        status: { in: ['scheduled', 'paid'] },
      },
      orderBy: { dueDate: 'desc' },
    });

    const matches: TransactionMatchResult[] = [];

    for (const transaction of transactions) {
      // Skip if already manually categorized
      if (transaction.userCategorized) continue;

      // Find potential payment matches
      const potentialMatches = payments.filter(payment => {
        // Amount match (within tolerance)
        const amountDiff = Math.abs(Number(transaction.amount) - Number(payment.amount));
        if (amountDiff > amountTolerance) return false;

        // Date match (within tolerance)
        const transactionDate = new Date(transaction.date);
        const paymentDate = new Date(payment.dueDate);
        const daysDiff = Math.abs(transactionDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > dateTolerance) return false;

        // Merchant/payee name similarity (optional enhancement)
        if (payment.payee && transaction.merchantName) {
          const payeeLower = payment.payee.toLowerCase();
          const merchantLower = transaction.merchantName.toLowerCase();
          if (!merchantLower.includes(payeeLower) && !payeeLower.includes(merchantLower)) {
            return false;
          }
        }

        return true;
      });

      // Pick best match (exact amount match preferred)
      if (potentialMatches.length > 0) {
        const bestMatch = potentialMatches.reduce((best, current) => {
          const bestAmountDiff = Math.abs(Number(transaction.amount) - Number(best.amount));
          const currentAmountDiff = Math.abs(Number(transaction.amount) - Number(current.amount));
          return currentAmountDiff < bestAmountDiff ? current : best;
        });

        const matchConfidence = this.calculateMatchConfidence(transaction, bestMatch, amountTolerance, dateTolerance);

        matches.push({
          transactionId: transaction.id,
          paymentId: bestMatch.id,
          matchConfidence,
          matchReason: this.generateMatchReason(transaction, bestMatch),
        });
      }
    }

    return matches;
  }

  static async applyCategoryRules(familyId: string, transactionIds?: string[]): Promise<{
    categorizedCount: number;
    results: Array<{
      transactionId: string;
      categoryId: string;
      categoryName: string;
      confidence: number;
      ruleApplied: string;
    }>;
  }> {
    // Get transactions to categorize
    let transactions: Transaction[];
    if (transactionIds) {
      const { transactions: filteredTransactions } = await this.getTransactions(
        familyId,
        { uncategorized: true },
        1000,
        0
      );
      transactions = filteredTransactions.filter(t => transactionIds.includes(t.id));
    } else {
      const { transactions: uncategorizedTransactions } = await this.getTransactions(
        familyId,
        { uncategorized: true },
        1000,
        0
      );
      transactions = uncategorizedTransactions;
    }

    const results = [];
    let categorizedCount = 0;

    // Get spending categories for rule matching
    const categories = await prisma.spendingCategory.findMany({
      where: { familyId, isActive: true },
    });

    for (const transaction of transactions) {
      const suggestion = await this.categorizeTransaction(transaction, categories);

      if (suggestion && suggestion.confidence >= 0.7) {
        await this.updateTransaction(familyId, transaction.id, {
          spendingCategoryId: suggestion.categoryId,
          categoryConfidence: suggestion.confidence,
          userCategorized: false,
        });

        results.push({
          transactionId: transaction.id,
          categoryId: suggestion.categoryId,
          categoryName: suggestion.categoryName,
          confidence: suggestion.confidence,
          ruleApplied: suggestion.reason,
        });

        categorizedCount++;
      }
    }

    return { categorizedCount, results };
  }

  private static async generateCategorySuggestions(
    familyId: string,
    transactions: Transaction[]
  ): Promise<CategorySuggestion[]> {
    const categories = await prisma.spendingCategory.findMany({
      where: { familyId, isActive: true },
    });

    const suggestions: CategorySuggestion[] = [];
    const categoryFrequency: Map<string, number> = new Map();

    for (const transaction of transactions) {
      const suggestion = await this.categorizeTransaction(transaction, categories);
      if (suggestion && suggestion.confidence >= 0.5) {
        categoryFrequency.set(suggestion.categoryId, (categoryFrequency.get(suggestion.categoryId) || 0) + 1);
      }
    }

    // Convert to suggestions array
    for (const [categoryId, frequency] of categoryFrequency.entries()) {
      const category = categories.find(c => c.id === categoryId);
      if (category && frequency >= 2) { // At least 2 potential matches
        suggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: Math.min(frequency / 10, 1.0), // Scale by frequency
          reason: `${frequency} similar transactions found`,
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private static async categorizeTransaction(
    transaction: Transaction,
    categories: SpendingCategory[]
  ): Promise<CategorySuggestion | null> {
    const description = transaction.description.toLowerCase();
    const merchantName = transaction.merchantName?.toLowerCase() || '';

    // Rule-based categorization
    const rules: Array<{ keywords: string[]; categoryName: string; weight: number }> = [
      { keywords: ['grocery', 'market', 'food', 'supermarket'], categoryName: 'Groceries', weight: 0.9 },
      { keywords: ['gas', 'fuel', 'station', 'shell', 'chevron'], categoryName: 'Transportation', weight: 0.9 },
      { keywords: ['restaurant', 'cafe', 'dining', 'food'], categoryName: 'Dining Out', weight: 0.8 },
      { keywords: ['pharmacy', 'medical', 'hospital', 'doctor'], categoryName: 'Healthcare', weight: 0.9 },
      { keywords: ['amazon', 'target', 'walmart', 'retail'], categoryName: 'Shopping', weight: 0.8 },
      { keywords: ['electric', 'utility', 'water', 'gas bill'], categoryName: 'Utilities', weight: 0.9 },
      { keywords: ['mortgage', 'rent', 'housing'], categoryName: 'Housing', weight: 0.9 },
    ];

    let bestMatch: CategorySuggestion | null = null;
    let bestScore = 0;

    for (const rule of rules) {
      const keywordMatches = rule.keywords.filter(keyword =>
        description.includes(keyword) || merchantName.includes(keyword)
      ).length;

      if (keywordMatches > 0) {
        const score = (keywordMatches / rule.keywords.length) * rule.weight;

        if (score > bestScore) {
          const category = categories.find(c => c.name.toLowerCase().includes(rule.categoryName.toLowerCase()));
          if (category) {
            bestMatch = {
              categoryId: category.id,
              categoryName: category.name,
              confidence: score,
              reason: `Matched keywords: ${rule.keywords.slice(0, keywordMatches).join(', ')}`,
            };
            bestScore = score;
          }
        }
      }
    }

    // Fallback: use Plaid category mapping if available
    if (!bestMatch && transaction.plaidCategory) {
      const plaidCategoryMapping = this.mapPlaidCategoryToSpending(transaction.plaidCategory, categories);
      if (plaidCategoryMapping) {
        bestMatch = {
          categoryId: plaidCategoryMapping.id,
          categoryName: plaidCategoryMapping.name,
          confidence: 0.6, // Lower confidence for Plaid auto-categorization
          reason: `Mapped from Plaid category: ${transaction.plaidCategory}`,
        };
      }
    }

    return bestMatch;
  }

  private static mapPlaidCategoryToSpending(
    plaidCategory: string,
    categories: SpendingCategory[]
  ): SpendingCategory | null {
    const categoryLower = plaidCategory.toLowerCase();

    const mappings: Array<{ plaidKeywords: string[]; spendingCategoryName: string }> = [
      { plaidKeywords: ['food', 'grocery', 'restaurant'], spendingCategoryName: 'groceries' },
      { plaidKeywords: ['gas', 'transportation'], spendingCategoryName: 'transportation' },
      { plaidKeywords: ['retail', 'shopping'], spendingCategoryName: 'shopping' },
      { plaidKeywords: ['utility', 'electric', 'water'], spendingCategoryName: 'utilities' },
      { plaidKeywords: ['medical', 'healthcare'], spendingCategoryName: 'healthcare' },
    ];

    for (const mapping of mappings) {
      if (mapping.plaidKeywords.some(keyword => categoryLower.includes(keyword))) {
        return categories.find(c => c.name.toLowerCase().includes(mapping.spendingCategoryName)) || null;
      }
    }

    return null;
  }

  private static calculateMatchConfidence(
    transaction: Transaction,
    payment: Payment,
    amountTolerance: number,
    dateTolerance: number
  ): number {
    let confidence = 0;

    // Amount match confidence (0-0.4)
    const amountDiff = Math.abs(Number(transaction.amount) - Number(payment.amount));
    if (amountDiff === 0) {
      confidence += 0.4;
    } else {
      confidence += 0.4 * (1 - Math.min(amountDiff / amountTolerance, 1));
    }

    // Date match confidence (0-0.3)
    const transactionDate = new Date(transaction.date);
    const paymentDate = new Date(payment.dueDate);
    const daysDiff = Math.abs(transactionDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff === 0) {
      confidence += 0.3;
    } else {
      confidence += 0.3 * (1 - Math.min(daysDiff / dateTolerance, 1));
    }

    // Name match confidence (0-0.3)
    if (payment.payee && transaction.merchantName) {
      const payeeLower = payment.payee.toLowerCase();
      const merchantLower = transaction.merchantName.toLowerCase();
      if (merchantLower.includes(payeeLower) || payeeLower.includes(merchantLower)) {
        confidence += 0.3;
      }
    }

    return Math.min(confidence, 1.0);
  }

  private static generateMatchReason(transaction: Transaction, payment: Payment): string {
    const reasons: string[] = [];

    const amountDiff = Math.abs(Number(transaction.amount) - Number(payment.amount));
    if (amountDiff === 0) {
      reasons.push('exact amount match');
    } else if (amountDiff < 0.01) {
      reasons.push('amount match within $0.01');
    }

    const transactionDate = new Date(transaction.date);
    const paymentDate = new Date(payment.dueDate);
    const daysDiff = Math.abs(transactionDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff === 0) {
      reasons.push('same date');
    } else if (daysDiff <= 3) {
      reasons.push(`${Math.round(daysDiff)} day(s) apart`);
    }

    if (payment.payee && transaction.merchantName) {
      const payeeLower = payment.payee.toLowerCase();
      const merchantLower = transaction.merchantName.toLowerCase();
      if (merchantLower.includes(payeeLower) || payeeLower.includes(merchantLower)) {
        reasons.push('merchant/payee name match');
      }
    }

    return reasons.join(', ');
  }
}