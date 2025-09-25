/**
 * Database Performance Tests
 * Task: T447 - Database query optimization and indexing validation
 *
 * Tests database query performance to ensure optimizations meet targets.
 * Validates index effectiveness and query execution times.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueryPerformanceResult {
  queryName: string;
  executionTime: number;
  rowsAffected: number;
  indexesUsed: string[];
  target: number;
  passed: boolean;
}

const performanceResults: QueryPerformanceResult[] = [];

describe('Database Performance Tests', () => {
  let testFamilyId: string;
  let testMemberId: string;
  let testBankAccountIds: string[] = [];
  let testIncomeEventIds: string[] = [];
  let testPaymentIds: string[] = [];

  beforeAll(async () => {
    // Clean up and create comprehensive test data
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test family
    const family = await prisma.family.create({
      data: {
        name: 'DB Performance Test Family',
        settings: { timezone: 'UTC', currency: 'USD', fiscalYearStart: 1 },
        subscriptionStatus: 'active',
        dataRetentionConsent: true
      }
    });
    testFamilyId = family.id;

    // Create test member
    const member = await prisma.familyMember.create({
      data: {
        familyId: testFamilyId,
        email: 'dbperf@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'DB',
        lastName: 'Performance',
        role: 'admin',
        permissions: { canManageBankAccounts: true, canEditPayments: true, canViewReports: true, canManageFamily: true },
        emailVerified: true
      }
    });
    testMemberId = member.id;

    // Create bank accounts
    for (let i = 0; i < 3; i++) {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          familyId: testFamilyId,
          plaidAccountId: `perf_account_${i}`,
          plaidItemId: `perf_item_${i}`,
          institutionId: `inst_${i}`,
          institutionName: `Test Bank ${i}`,
          accountName: `Performance Account ${i}`,
          accountType: 'checking',
          accountNumber: `****123${i}`,
          currentBalance: 1000 + (i * 500),
          availableBalance: 900 + (i * 500),
          syncStatus: 'active'
        }
      });
      testBankAccountIds.push(bankAccount.id);
    }

    // Create income events (50 for performance testing)
    const incomePromises = Array.from({ length: 50 }, (_, i) => {
      const baseDate = new Date('2024-01-01');
      const scheduledDate = new Date(baseDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000)); // Weekly intervals

      return prisma.incomeEvent.create({
        data: {
          familyId: testFamilyId,
          name: `Performance Income ${i}`,
          amount: 2000 + (i * 100),
          scheduledDate,
          frequency: 'weekly',
          nextOccurrence: new Date(scheduledDate.getTime() + (7 * 24 * 60 * 60 * 1000)),
          status: i % 3 === 0 ? 'received' : 'scheduled',
          actualDate: i % 3 === 0 ? scheduledDate : null,
          actualAmount: i % 3 === 0 ? 2000 + (i * 100) : null
        }
      });
    });

    const incomeEvents = await Promise.all(incomePromises);
    testIncomeEventIds = incomeEvents.map(ie => ie.id);

    // Create payments (100 for performance testing)
    const paymentPromises = Array.from({ length: 100 }, (_, i) => {
      const baseDate = new Date('2024-01-01');
      const dueDate = new Date(baseDate.getTime() + (i * 3 * 24 * 60 * 60 * 1000)); // Every 3 days

      return prisma.payment.create({
        data: {
          familyId: testFamilyId,
          payee: `Performance Payee ${i}`,
          amount: 100 + (i * 10),
          dueDate,
          paymentType: i % 2 === 0 ? 'recurring' : 'once',
          frequency: i % 2 === 0 ? 'monthly' : 'once',
          nextDueDate: i % 2 === 0 ? new Date(dueDate.getTime() + (30 * 24 * 60 * 60 * 1000)) : null,
          status: i % 4 === 0 ? 'paid' : i % 4 === 1 ? 'overdue' : 'scheduled',
          paidDate: i % 4 === 0 ? dueDate : null,
          paidAmount: i % 4 === 0 ? 100 + (i * 10) : null
        }
      });
    });

    const payments = await Promise.all(paymentPromises);
    testPaymentIds = payments.map(p => p.id);

    // Create transactions (200 for performance testing)
    const transactionPromises = Array.from({ length: 200 }, (_, i) => {
      const baseDate = new Date('2024-01-01');
      const transactionDate = new Date(baseDate.getTime() + (i * 24 * 60 * 60 * 1000)); // Daily transactions
      const bankAccountId = testBankAccountIds[i % testBankAccountIds.length];

      return prisma.transaction.create({
        data: {
          bankAccountId,
          plaidTransactionId: `perf_txn_${i}`,
          amount: (i % 2 === 0 ? -1 : 1) * (50 + (i * 5)), // Mix of income/expenses
          date: transactionDate,
          description: `Performance Transaction ${i}`,
          merchantName: `Merchant ${i % 10}`,
          pending: i % 10 === 0, // 10% pending
          userCategorized: i % 5 === 0 // 20% user categorized
        }
      });
    });

    await Promise.all(transactionPromises);

    // Create payment attributions
    const attributionPromises = Array.from({ length: 30 }, (_, i) => {
      return prisma.paymentAttribution.create({
        data: {
          paymentId: testPaymentIds[i % testPaymentIds.length],
          incomeEventId: testIncomeEventIds[i % testIncomeEventIds.length],
          amount: 100 + (i * 10),
          attributionType: i % 2 === 0 ? 'automatic' : 'manual',
          createdBy: testMemberId
        }
      });
    });

    await Promise.all(attributionPromises);

    // Create sessions for authentication testing
    const sessionPromises = Array.from({ length: 20 }, (_, i) => {
      return prisma.session.create({
        data: {
          familyMemberId: testMemberId,
          token: `perf_token_${i}`,
          ipAddress: `192.168.1.${i + 1}`,
          userAgent: `Performance Test Agent ${i}`,
          expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
        }
      });
    });

    await Promise.all(sessionPromises);

    console.log('Database performance test data created successfully');
  });

  afterAll(async () => {
    // Print performance summary
    console.log('\n=== DATABASE PERFORMANCE SUMMARY ===');
    console.log(`Total Queries Tested: ${performanceResults.length}`);

    const passedQueries = performanceResults.filter(r => r.passed);
    const failedQueries = performanceResults.filter(r => !r.passed);

    console.log(`Passed: ${passedQueries.length}/${performanceResults.length}`);
    console.log(`Failed: ${failedQueries.length}/${performanceResults.length}`);

    if (failedQueries.length > 0) {
      console.log('\n=== FAILED PERFORMANCE TESTS ===');
      failedQueries.forEach(query => {
        console.log(`❌ ${query.queryName}: ${query.executionTime.toFixed(2)}ms (target: ${query.target}ms)`);
      });
    }

    // Performance percentiles
    const executionTimes = performanceResults.map(r => r.executionTime).sort((a, b) => a - b);
    const p50 = executionTimes[Math.floor(executionTimes.length * 0.5)];
    const p95 = executionTimes[Math.floor(executionTimes.length * 0.95)];
    const p99 = executionTimes[Math.floor(executionTimes.length * 0.99)];

    console.log('\n=== QUERY EXECUTION TIME PERCENTILES ===');
    console.log(`P50 (median): ${p50?.toFixed(2)}ms`);
    console.log(`P95: ${p95?.toFixed(2)}ms`);
    console.log(`P99: ${p99?.toFixed(2)}ms`);
    console.log(`Min: ${Math.min(...executionTimes).toFixed(2)}ms`);
    console.log(`Max: ${Math.max(...executionTimes).toFixed(2)}ms`);
    console.log(`Average: ${(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length).toFixed(2)}ms`);

    await prisma.$disconnect();
  });

  const measureQueryPerformance = async (
    queryName: string,
    target: number,
    queryFunc: () => Promise<any>
  ): Promise<QueryPerformanceResult> => {
    const startTime = process.hrtime.bigint();

    let result;
    let error = null;

    try {
      result = await queryFunc();
    } catch (e) {
      error = e;
    }

    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    const performanceResult: QueryPerformanceResult = {
      queryName,
      executionTime,
      rowsAffected: Array.isArray(result) ? result.length : result ? 1 : 0,
      indexesUsed: [], // Would need to analyze query plan
      target,
      passed: executionTime <= target && !error
    };

    performanceResults.push(performanceResult);

    if (error) {
      throw error;
    }

    return performanceResult;
  };

  describe('Authentication Query Performance', () => {
    it('should find user by email within 5ms', async () => {
      const result = await measureQueryPerformance('User lookup by email', 5, async () => {
        return await prisma.familyMember.findUnique({
          where: { email: 'dbperf@example.com' }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(5);
    });

    it('should validate session within 5ms', async () => {
      const result = await measureQueryPerformance('Session validation', 5, async () => {
        return await prisma.session.findFirst({
          where: {
            token: 'perf_token_0',
            expiresAt: { gt: new Date() }
          }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(5);
    });

    it('should fetch family member with family within 10ms', async () => {
      const result = await measureQueryPerformance('Family member with family data', 10, async () => {
        return await prisma.familyMember.findUnique({
          where: { id: testMemberId },
          include: {
            family: true
          }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(10);
    });
  });

  describe('Financial Data Query Performance', () => {
    it('should fetch upcoming payments within 20ms', async () => {
      const result = await measureQueryPerformance('Upcoming payments query', 20, async () => {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));

        return await prisma.payment.findMany({
          where: {
            familyId: testFamilyId,
            dueDate: { gte: today, lte: nextWeek },
            status: 'scheduled'
          },
          orderBy: { dueDate: 'asc' },
          take: 20
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(20);
    });

    it('should fetch overdue payments within 15ms', async () => {
      const result = await measureQueryPerformance('Overdue payments query', 15, async () => {
        return await prisma.payment.findMany({
          where: {
            familyId: testFamilyId,
            status: 'overdue'
          },
          orderBy: { dueDate: 'asc' }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(15);
    });

    it('should fetch recent income events within 25ms', async () => {
      const result = await measureQueryPerformance('Recent income events query', 25, async () => {
        const lastMonth = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

        return await prisma.incomeEvent.findMany({
          where: {
            familyId: testFamilyId,
            scheduledDate: { gte: lastMonth }
          },
          orderBy: { scheduledDate: 'desc' },
          take: 50
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(25);
    });

    it('should fetch recent transactions within 30ms', async () => {
      const result = await measureQueryPerformance('Recent transactions query', 30, async () => {
        return await prisma.transaction.findMany({
          where: {
            bankAccount: {
              familyId: testFamilyId
            }
          },
          orderBy: { date: 'desc' },
          take: 50,
          include: {
            bankAccount: true
          }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(30);
    });
  });

  describe('Complex Join Query Performance', () => {
    it('should fetch payment attributions within 25ms', async () => {
      const result = await measureQueryPerformance('Payment attributions query', 25, async () => {
        return await prisma.paymentAttribution.findMany({
          where: {
            payment: {
              familyId: testFamilyId
            }
          },
          include: {
            payment: true,
            incomeEvent: true
          },
          take: 20
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(25);
    });

    it('should fetch budget allocations with categories within 30ms', async () => {
      // First create budget categories and allocations for testing
      const budgetCategory = await prisma.budgetCategory.create({
        data: {
          familyId: testFamilyId,
          name: 'Performance Test Budget',
          targetPercentage: 50,
          color: '#FFD166',
          sortOrder: 1
        }
      });

      const budgetAllocations = await Promise.all([
        prisma.budgetAllocation.create({
          data: {
            incomeEventId: testIncomeEventIds[0],
            budgetCategoryId: budgetCategory.id,
            amount: 1000,
            percentage: 50
          }
        }),
        prisma.budgetAllocation.create({
          data: {
            incomeEventId: testIncomeEventIds[1],
            budgetCategoryId: budgetCategory.id,
            amount: 1000,
            percentage: 50
          }
        })
      ]);

      const result = await measureQueryPerformance('Budget allocations query', 30, async () => {
        return await prisma.budgetAllocation.findMany({
          where: {
            incomeEvent: {
              familyId: testFamilyId
            }
          },
          include: {
            budgetCategory: true,
            incomeEvent: true
          },
          take: 20
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(30);
    });
  });

  describe('Filtering Query Performance', () => {
    it('should find uncategorized transactions within 20ms', async () => {
      const result = await measureQueryPerformance('Uncategorized transactions query', 20, async () => {
        return await prisma.transaction.findMany({
          where: {
            bankAccount: {
              familyId: testFamilyId
            },
            spendingCategoryId: null
          },
          orderBy: { date: 'desc' },
          take: 50
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(20);
    });

    it('should find pending transactions within 15ms', async () => {
      const result = await measureQueryPerformance('Pending transactions query', 15, async () => {
        return await prisma.transaction.findMany({
          where: {
            bankAccount: {
              familyId: testFamilyId
            },
            pending: true
          },
          orderBy: { date: 'desc' }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(15);
    });

    it('should find active bank accounts within 10ms', async () => {
      const result = await measureQueryPerformance('Active bank accounts query', 10, async () => {
        return await prisma.bankAccount.findMany({
          where: {
            familyId: testFamilyId,
            syncStatus: 'active',
            deletedAt: null
          }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(10);
    });
  });

  describe('Aggregation Query Performance', () => {
    it('should calculate income summary within 40ms', async () => {
      const result = await measureQueryPerformance('Income summary aggregation', 40, async () => {
        const lastMonth = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

        return await prisma.incomeEvent.aggregate({
          where: {
            familyId: testFamilyId,
            scheduledDate: { gte: lastMonth }
          },
          _sum: {
            amount: true,
            actualAmount: true
          },
          _count: {
            id: true
          },
          _avg: {
            amount: true
          }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(40);
    });

    it('should calculate payment summary within 40ms', async () => {
      const result = await measureQueryPerformance('Payment summary aggregation', 40, async () => {
        const nextMonth = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));

        return await prisma.payment.aggregate({
          where: {
            familyId: testFamilyId,
            dueDate: { lte: nextMonth }
          },
          _sum: {
            amount: true,
            paidAmount: true
          },
          _count: {
            id: true
          }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(40);
    });

    it('should group transactions by date within 50ms', async () => {
      const result = await measureQueryPerformance('Transaction date grouping', 50, async () => {
        // Using raw query for complex grouping
        return await prisma.$queryRaw`
          SELECT
            DATE_TRUNC('day', date) as transaction_date,
            COUNT(*) as transaction_count,
            SUM(ABS(amount)) as total_amount
          FROM transactions t
          JOIN bank_accounts ba ON t.bank_account_id = ba.id
          WHERE ba.family_id = ${testFamilyId}
            AND t.date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', date)
          ORDER BY transaction_date DESC
          LIMIT 30
        `;
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(50);
    });
  });

  describe('Index Effectiveness Tests', () => {
    it('should demonstrate family-scoped payment query performance', async () => {
      // Test the composite index effectiveness
      const result = await measureQueryPerformance('Family-scoped payment with status', 15, async () => {
        return await prisma.payment.findMany({
          where: {
            familyId: testFamilyId,
            status: 'scheduled'
          },
          take: 20
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(15);
    });

    it('should demonstrate date-based income query performance', async () => {
      const result = await measureQueryPerformance('Date-based income query', 20, async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-03-01');

        return await prisma.incomeEvent.findMany({
          where: {
            familyId: testFamilyId,
            scheduledDate: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: { scheduledDate: 'asc' }
        });
      });

      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(20);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance across multiple queries', async () => {
      const iterations = 5;
      const queryTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const result = await measureQueryPerformance(`Consistency test ${i + 1}`, 20, async () => {
          return await prisma.payment.findMany({
            where: {
              familyId: testFamilyId,
              dueDate: { gte: new Date() }
            },
            take: 10
          });
        });
        queryTimes.push(result.executionTime);
      }

      // Calculate variance
      const mean = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const variance = queryTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / queryTimes.length;
      const stdDev = Math.sqrt(variance);

      console.log(`\nConsistency Test Results:`);
      console.log(`Mean: ${mean.toFixed(2)}ms`);
      console.log(`Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`Query Times: [${queryTimes.map(t => t.toFixed(2)).join(', ')}]ms`);

      // Standard deviation should be low for consistent performance
      expect(stdDev).toBeLessThan(mean * 0.5); // Within 50% of mean
      expect(mean).toBeLessThanOrEqual(20); // Average should meet target
    });
  });
});