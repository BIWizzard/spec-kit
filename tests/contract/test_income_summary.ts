/**
 * Contract Test: GET /api/income-events/summary
 * Task: T064 - Income events summary endpoint contract validation
 *
 * This test validates the income events summary API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/income-events/summary', () => {
  let authTokens: any;
  const testUser = {
    email: 'income-summary@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Summary',
    familyName: 'Summary Family'
  };

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create and authenticate test user
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send(testUser);

    const loginResponse = await request(API_BASE_URL)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authTokens = loginResponse.body.tokens;

    // Create comprehensive test data for summary calculations
    const incomeEvents = [
      // January 2024 - Scheduled income
      {
        name: 'Jan Salary 1',
        amount: 4000.00,
        scheduledDate: '2024-01-01',
        frequency: 'monthly'
      },
      {
        name: 'Jan Bonus',
        amount: 1000.00,
        scheduledDate: '2024-01-15',
        frequency: 'once'
      },
      // February 2024 - Mix of scheduled and received
      {
        name: 'Feb Salary',
        amount: 4000.00,
        scheduledDate: '2024-02-01',
        frequency: 'monthly'
      },
      {
        name: 'Feb Freelance',
        amount: 800.00,
        scheduledDate: '2024-02-10',
        frequency: 'once'
      },
      // March 2024 - All received with different actual amounts
      {
        name: 'Mar Salary',
        amount: 4000.00,
        scheduledDate: '2024-03-01',
        frequency: 'monthly'
      },
      {
        name: 'Mar Bonus',
        amount: 1200.00,
        scheduledDate: '2024-03-15',
        frequency: 'once'
      }
    ];

    const incomeIds: string[] = [];

    // Create all income events
    for (const income of incomeEvents) {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(income);
      incomeIds.push(response.body.id);
    }

    // Mark February income as received (same amounts)
    await request(API_BASE_URL)
      .post(`/api/income-events/${incomeIds[2]}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: '2024-02-01',
        actualAmount: 4000.00
      });

    await request(API_BASE_URL)
      .post(`/api/income-events/${incomeIds[3]}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: '2024-02-10',
        actualAmount: 800.00
      });

    // Mark March income as received (with variance)
    await request(API_BASE_URL)
      .post(`/api/income-events/${incomeIds[4]}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: '2024-03-01',
        actualAmount: 4200.00 // +200 variance
      });

    await request(API_BASE_URL)
      .post(`/api/income-events/${incomeIds[5]}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: '2024-03-15',
        actualAmount: 1000.00 // -200 variance
      });

    // Create some income with attributions for allocation tracking
    const payment1Response = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Rent',
        amount: 1500.00,
        dueDate: '2024-03-01',
        frequency: 'monthly'
      });

    await request(API_BASE_URL)
      .post('/api/attributions')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        incomeEventId: incomeIds[4], // Mar Salary (received)
        paymentId: payment1Response.body.id,
        amount: 1500.00
      });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Summary Requests', () => {
    it('should return income summary for required date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('summaryPeriods');
      expect(response.body).toHaveProperty('totals');
      expect(response.body).toHaveProperty('dateRange');

      // Validate summaryPeriods array
      expect(Array.isArray(response.body.summaryPeriods)).toBe(true);
      expect(response.body.summaryPeriods.length).toBe(3); // Jan, Feb, Mar

      // Validate individual period structure
      const period = response.body.summaryPeriods[0];
      expect(period).toHaveProperty('period');
      expect(period).toHaveProperty('periodStart');
      expect(period).toHaveProperty('periodEnd');
      expect(period).toHaveProperty('scheduledIncome');
      expect(period).toHaveProperty('actualIncome');
      expect(period).toHaveProperty('incomeCount');
      expect(period).toHaveProperty('variance');

      // Validate data types
      expect(typeof period.period).toBe('string');
      expect(typeof period.periodStart).toBe('string');
      expect(typeof period.periodEnd).toBe('string');
      expect(typeof period.scheduledIncome).toBe('number');
      expect(typeof period.actualIncome).toBe('number');
      expect(typeof period.incomeCount).toBe('number');
      expect(typeof period.variance).toBe('number');

      // Validate totals structure
      expect(response.body.totals).toHaveProperty('totalScheduled');
      expect(response.body.totals).toHaveProperty('totalActual');
      expect(response.body.totals).toHaveProperty('totalVariance');
      expect(response.body.totals).toHaveProperty('totalAllocated');
      expect(response.body.totals).toHaveProperty('totalRemaining');

      // Validate dateRange
      expect(response.body.dateRange).toHaveProperty('fromDate', '2024-01-01');
      expect(response.body.dateRange).toHaveProperty('toDate', '2024-03-31');
    });

    it('should calculate monthly summaries correctly by default', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31',
          groupBy: 'month'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const periods = response.body.summaryPeriods;

      // January (all scheduled)
      const janPeriod = periods.find((p: any) => p.period === '2024-01');
      expect(janPeriod).toBeDefined();
      expect(janPeriod.scheduledIncome).toBe(5000.00); // 4000 + 1000
      expect(janPeriod.actualIncome).toBe(0); // None received
      expect(janPeriod.incomeCount).toBe(2);
      expect(janPeriod.variance).toBe(-5000.00); // 0 - 5000

      // February (all received with no variance)
      const febPeriod = periods.find((p: any) => p.period === '2024-02');
      expect(febPeriod).toBeDefined();
      expect(febPeriod.scheduledIncome).toBe(4800.00); // 4000 + 800
      expect(febPeriod.actualIncome).toBe(4800.00); // Same as scheduled
      expect(febPeriod.incomeCount).toBe(2);
      expect(febPeriod.variance).toBe(0); // No variance

      // March (all received with variance)
      const marPeriod = periods.find((p: any) => p.period === '2024-03');
      expect(marPeriod).toBeDefined();
      expect(marPeriod.scheduledIncome).toBe(5200.00); // 4000 + 1200
      expect(marPeriod.actualIncome).toBe(5200.00); // 4200 + 1000
      expect(marPeriod.incomeCount).toBe(2);
      expect(marPeriod.variance).toBe(0); // Net zero variance: (+200) + (-200)
    });

    it('should calculate totals correctly across all periods', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const totals = response.body.totals;

      expect(totals.totalScheduled).toBe(15000.00); // 5000 + 4800 + 5200
      expect(totals.totalActual).toBe(10000.00); // 0 + 4800 + 5200
      expect(totals.totalVariance).toBe(-5000.00); // -5000 + 0 + 0
      expect(totals.totalAllocated).toBe(1500.00); // From the rent attribution
      expect(totals.totalRemaining).toBe(8500.00); // 10000 - 1500
    });
  });

  describe('Group By Parameter Validation', () => {
    it('should support weekly grouping', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
          groupBy: 'week'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const periods = response.body.summaryPeriods;
      expect(periods.length).toBeGreaterThan(1); // Multiple weeks in January

      periods.forEach((period: any) => {
        expect(period.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(period.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Weekly periods should be 7 days or less
        const start = new Date(period.periodStart);
        const end = new Date(period.periodEnd);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeLessThanOrEqual(6);
      });
    });

    it('should support daily grouping', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-03-01',
          toDate: '2024-03-31',
          groupBy: 'day'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const periods = response.body.summaryPeriods;

      // Should have periods for days with income events
      const mar1Period = periods.find((p: any) => p.periodStart === '2024-03-01');
      const mar15Period = periods.find((p: any) => p.periodStart === '2024-03-15');

      expect(mar1Period).toBeDefined();
      expect(mar1Period.scheduledIncome).toBe(4000.00);
      expect(mar1Period.actualIncome).toBe(4200.00);

      expect(mar15Period).toBeDefined();
      expect(mar15Period.scheduledIncome).toBe(1200.00);
      expect(mar15Period.actualIncome).toBe(1000.00);
    });

    it('should support quarterly grouping', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'quarter'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const periods = response.body.summaryPeriods;

      // Q1 should contain Jan, Feb, Mar data
      const q1Period = periods.find((p: any) => p.period.includes('Q1') || p.periodStart === '2024-01-01');
      expect(q1Period).toBeDefined();

      if (q1Period) {
        expect(q1Period.scheduledIncome).toBe(15000.00); // Sum of all months
        expect(q1Period.incomeCount).toBe(6); // All 6 income events
      }
    });

    it('should support yearly grouping', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'year'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const periods = response.body.summaryPeriods;
      expect(periods.length).toBe(1); // Single year

      const yearPeriod = periods[0];
      expect(yearPeriod.period).toBe('2024');
      expect(yearPeriod.scheduledIncome).toBe(15000.00);
      expect(yearPeriod.actualIncome).toBe(10000.00);
      expect(yearPeriod.incomeCount).toBe(6);
    });

    it('should default to monthly grouping when not specified', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const periods = response.body.summaryPeriods;
      expect(periods.length).toBe(3); // Three months

      // Verify monthly periods
      expect(periods[0].period).toBe('2024-01');
      expect(periods[1].period).toBe('2024-02');
      expect(periods[2].period).toBe('2024-03');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for missing required fromDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          toDate: '2024-03-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/fromDate.*required|missing.*date/i);
    });

    it('should return 400 for missing required toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/toDate.*required|missing.*date/i);
    });

    it('should return 400 for invalid date formats', async () => {
      const invalidDates = [
        'invalid-date',
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        '01-01-2024', // Wrong format
        '2024/01/01' // Wrong format
      ];

      for (const invalidDate of invalidDates) {
        const response = await request(API_BASE_URL)
          .get('/api/income-events/summary')
          .query({
            fromDate: invalidDate,
            toDate: '2024-03-31'
          })
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 when fromDate is after toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-03-31',
          toDate: '2024-01-01' // Before fromDate
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/fromDate.*after.*toDate|invalid.*date.*range/i);
    });

    it('should return 400 for invalid groupBy values', async () => {
      const invalidGroupBy = ['invalid', 'hours', 'minutes'];

      for (const invalid of invalidGroupBy) {
        const response = await request(API_BASE_URL)
          .get('/api/income-events/summary')
          .query({
            fromDate: '2024-01-01',
            toDate: '2024-03-31',
            groupBy: invalid
          })
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toMatch(/groupBy.*invalid|invalid.*group/i);
      }
    });

    it('should handle very large date ranges appropriately', async () => {
      // Test with a very large date range
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2000-01-01',
          toDate: '2030-12-31',
          groupBy: 'year'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should handle gracefully, but may have performance implications
      expect(Array.isArray(response.body.summaryPeriods)).toBe(true);
      expect(response.body.totals).toBeDefined();
    });
  });

  describe('Empty Result Scenarios', () => {
    it('should return empty periods for date range with no income', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2025-01-01',
          toDate: '2025-03-31' // Future dates with no income
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.summaryPeriods).toHaveLength(0);
      expect(response.body.totals.totalScheduled).toBe(0);
      expect(response.body.totals.totalActual).toBe(0);
      expect(response.body.totals.totalVariance).toBe(0);
      expect(response.body.totals.totalAllocated).toBe(0);
      expect(response.body.totals.totalRemaining).toBe(0);
    });

    it('should handle user with no income events', async () => {
      // Create new user with no income
      const emptyUser = {
        email: 'empty-summary@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Empty',
        lastName: 'User',
        familyName: 'Empty Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(emptyUser);

      const emptyLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: emptyUser.email,
          password: emptyUser.password
        });

      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${emptyLoginResponse.body.tokens.accessToken}`)
        .expect(200);

      expect(response.body.summaryPeriods).toHaveLength(0);
      expect(response.body.totals.totalScheduled).toBe(0);
      expect(response.body.totals.totalActual).toBe(0);
    });
  });

  describe('Variance Calculations', () => {
    it('should calculate positive variance correctly', async () => {
      // Create income with higher actual amount
      const bonusResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Bonus Income',
          amount: 1000.00,
          scheduledDate: '2024-04-01',
          frequency: 'once'
        });

      await request(API_BASE_URL)
        .post(`/api/income-events/${bonusResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-04-01',
          actualAmount: 1500.00 // +500 variance
        });

      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-04-01',
          toDate: '2024-04-30'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const aprPeriod = response.body.summaryPeriods.find((p: any) => p.period === '2024-04');
      expect(aprPeriod.variance).toBe(500.00); // 1500 - 1000
      expect(aprPeriod.scheduledIncome).toBe(1000.00);
      expect(aprPeriod.actualIncome).toBe(1500.00);
    });

    it('should calculate negative variance correctly', async () => {
      // Already have March data with mixed variance
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-03-01',
          toDate: '2024-03-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const marPeriod = response.body.summaryPeriods[0];
      // March has: Salary 4000->4200 (+200), Bonus 1200->1000 (-200) = net 0 variance
      expect(marPeriod.variance).toBe(0);
    });

    it('should handle scheduled income with zero variance', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-02-01',
          toDate: '2024-02-28'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const febPeriod = response.body.summaryPeriods[0];
      // February income was received with same amounts as scheduled
      expect(febPeriod.variance).toBe(0);
      expect(febPeriod.scheduledIncome).toBe(febPeriod.actualIncome);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31'
        })
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only include income from authenticated user\'s family', async () => {
      // Create second family with income
      const secondFamily = {
        email: 'other-summary@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(secondFamily);

      const otherLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: secondFamily.email,
          password: secondFamily.password
        });

      // Create income for other family
      await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Family Income',
          amount: 99999.00,
          scheduledDate: '2024-01-01',
          frequency: 'monthly'
        });

      // Original user should not see other family's income in summary
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Totals should not include other family's income
      expect(response.body.totals.totalScheduled).toBe(15000.00); // Original amount only
    });
  });

  describe('Performance and Optimization', () => {
    it('should respond within reasonable time for large date ranges', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });

    it('should handle complex calculations efficiently', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31',
          groupBy: 'day'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should handle daily grouping without performance issues
      expect(Array.isArray(response.body.summaryPeriods)).toBe(true);
      expect(typeof response.body.totals.totalScheduled).toBe('number');
      expect(typeof response.body.totals.totalActual).toBe('number');
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-03-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Summary data should be cacheable but with reasonable TTL
      expect(response.headers['cache-control']).toMatch(/max-age=|no-cache|private/);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle single day date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-03-01',
          toDate: '2024-03-01' // Same day
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.summaryPeriods.length).toBeLessThanOrEqual(1);
    });

    it('should handle leap year dates correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-02-28',
          toDate: '2024-02-29', // 2024 is a leap year
          groupBy: 'day'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should handle leap year boundary correctly
      expect(Array.isArray(response.body.summaryPeriods)).toBe(true);
    });

    it('should handle decimal amounts with proper precision', async () => {
      // Create income with decimal amounts
      const decimalResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Decimal Income',
          amount: 1234.56,
          scheduledDate: '2024-05-01',
          frequency: 'once'
        });

      await request(API_BASE_URL)
        .post(`/api/income-events/${decimalResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-05-01',
          actualAmount: 1234.78 // +0.22 variance
        });

      const response = await request(API_BASE_URL)
        .get('/api/income-events/summary')
        .query({
          fromDate: '2024-05-01',
          toDate: '2024-05-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const mayPeriod = response.body.summaryPeriods[0];
      expect(mayPeriod.scheduledIncome).toBe(1234.56);
      expect(mayPeriod.actualIncome).toBe(1234.78);
      expect(mayPeriod.variance).toBe(0.22);
    });
  });
});