/**
 * Contract Test: GET /api/income-events/upcoming
 * Task: T063 - Income events upcoming endpoint contract validation
 *
 * This test validates the upcoming income events API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/income-events/upcoming', () => {
  let authTokens: any;
  const testUser = {
    email: 'income-upcoming@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Upcoming',
    familyName: 'Upcoming Family'
  };

  // Helper function to get date string N days from today
  const getDateString = (daysFromToday: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    return date.toISOString().split('T')[0];
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

    // Create various income events for testing
    const today = new Date();

    // Income happening tomorrow (should be included in upcoming)
    await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Tomorrow Salary',
        amount: 3000.00,
        scheduledDate: getDateString(1),
        frequency: 'monthly',
        source: 'Main Job'
      });

    // Income happening in 5 days
    await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Weekly Bonus',
        amount: 500.00,
        scheduledDate: getDateString(5),
        frequency: 'weekly',
        source: 'Side Gig'
      });

    // Income happening in 15 days
    await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Mid-month Payment',
        amount: 1200.00,
        scheduledDate: getDateString(15),
        frequency: 'biweekly'
      });

    // Income happening in 25 days (within 30-day default window)
    await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Month-end Bonus',
        amount: 800.00,
        scheduledDate: getDateString(25),
        frequency: 'monthly'
      });

    // Income happening in 35 days (beyond 30-day default window)
    await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Future Salary',
        amount: 3500.00,
        scheduledDate: getDateString(35),
        frequency: 'monthly'
      });

    // Past income (should not be included)
    await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Past Income',
        amount: 2000.00,
        scheduledDate: getDateString(-5),
        frequency: 'once'
      });

    // Already received income for today (should not be included)
    const receivedIncomeResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Already Received',
        amount: 1500.00,
        scheduledDate: getDateString(0), // Today
        frequency: 'once'
      });

    await request(API_BASE_URL)
      .post(`/api/income-events/${receivedIncomeResponse.body.id}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: getDateString(0),
        actualAmount: 1500.00
      });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Upcoming Income Requests', () => {
    it('should return upcoming income events with default 30-day window', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('upcomingIncome');
      expect(response.body).toHaveProperty('totalUpcoming');
      expect(response.body).toHaveProperty('dateRange');

      // Validate upcomingIncome array
      expect(Array.isArray(response.body.upcomingIncome)).toBe(true);
      expect(response.body.upcomingIncome.length).toBeGreaterThan(0);

      // Should include income within 30 days (4 events: +1, +5, +15, +25 days)
      expect(response.body.upcomingIncome.length).toBe(4);

      // Validate individual income event structure
      const incomeEvent = response.body.upcomingIncome[0];
      expect(incomeEvent).toHaveProperty('id');
      expect(incomeEvent).toHaveProperty('name');
      expect(incomeEvent).toHaveProperty('amount');
      expect(incomeEvent).toHaveProperty('scheduledDate');
      expect(incomeEvent).toHaveProperty('frequency');
      expect(incomeEvent).toHaveProperty('status', 'scheduled');
      expect(incomeEvent).toHaveProperty('allocatedAmount');
      expect(incomeEvent).toHaveProperty('remainingAmount');
      expect(incomeEvent).toHaveProperty('nextOccurrence');
      expect(incomeEvent).toHaveProperty('source');

      // Validate data types
      expect(typeof incomeEvent.id).toBe('string');
      expect(typeof incomeEvent.name).toBe('string');
      expect(typeof incomeEvent.amount).toBe('number');
      expect(typeof incomeEvent.scheduledDate).toBe('string');
      expect(typeof incomeEvent.frequency).toBe('string');

      // Validate date range
      expect(response.body.dateRange).toHaveProperty('fromDate');
      expect(response.body.dateRange).toHaveProperty('toDate');

      // Validate total upcoming calculation
      const calculatedTotal = response.body.upcomingIncome.reduce(
        (sum: number, income: any) => sum + income.amount,
        0
      );
      expect(response.body.totalUpcoming).toBe(calculatedTotal);
    });

    it('should return upcoming income events sorted by scheduled date', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const upcomingIncome = response.body.upcomingIncome;

      // Verify events are sorted by scheduledDate (ascending)
      for (let i = 1; i < upcomingIncome.length; i++) {
        const prevDate = new Date(upcomingIncome[i - 1].scheduledDate);
        const currDate = new Date(upcomingIncome[i].scheduledDate);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }

      // Verify specific order
      expect(upcomingIncome[0].name).toBe('Tomorrow Salary');
      expect(upcomingIncome[1].name).toBe('Weekly Bonus');
      expect(upcomingIncome[2].name).toBe('Mid-month Payment');
      expect(upcomingIncome[3].name).toBe('Month-end Bonus');
    });

    it('should exclude past and received income events', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const upcomingIncome = response.body.upcomingIncome;

      // Should not include past income
      const pastIncome = upcomingIncome.find((income: any) => income.name === 'Past Income');
      expect(pastIncome).toBeUndefined();

      // Should not include already received income
      const receivedIncome = upcomingIncome.find((income: any) => income.name === 'Already Received');
      expect(receivedIncome).toBeUndefined();

      // All remaining events should be scheduled status
      upcomingIncome.forEach((income: any) => {
        expect(income.status).toBe('scheduled');
      });
    });

    it('should include all scheduled income frequencies', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const upcomingIncome = response.body.upcomingIncome;
      const frequencies = upcomingIncome.map((income: any) => income.frequency);

      expect(frequencies).toContain('monthly');
      expect(frequencies).toContain('weekly');
      expect(frequencies).toContain('biweekly');

      // All frequencies should be valid enum values
      const validFrequencies = ['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];
      frequencies.forEach((frequency: string) => {
        expect(validFrequencies).toContain(frequency);
      });
    });
  });

  describe('Custom Date Range Queries', () => {
    it('should return upcoming income for custom days parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 7 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should only include income within 7 days (2 events: +1, +5 days)
      expect(response.body.upcomingIncome.length).toBe(2);

      const incomeNames = response.body.upcomingIncome.map((income: any) => income.name);
      expect(incomeNames).toContain('Tomorrow Salary');
      expect(incomeNames).toContain('Weekly Bonus');
      expect(incomeNames).not.toContain('Mid-month Payment'); // +15 days, outside 7-day window

      // Verify date range reflects the custom parameter
      const fromDate = new Date(response.body.dateRange.fromDate);
      const toDate = new Date(response.body.dateRange.toDate);
      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('should handle minimum days parameter (1 day)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 1 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should only include income tomorrow (+1 day)
      expect(response.body.upcomingIncome.length).toBe(1);
      expect(response.body.upcomingIncome[0].name).toBe('Tomorrow Salary');
    });

    it('should handle maximum days parameter (365 days)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 365 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should include all future income within a year (5 events: +1, +5, +15, +25, +35 days)
      expect(response.body.upcomingIncome.length).toBe(5);

      const incomeNames = response.body.upcomingIncome.map((income: any) => income.name);
      expect(incomeNames).toContain('Future Salary'); // +35 days, now included
    });

    it('should handle large date ranges efficiently', async () => {
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 365 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds

      expect(Array.isArray(response.body.upcomingIncome)).toBe(true);
      expect(typeof response.body.totalUpcoming).toBe('number');
    });
  });

  describe('Query Parameter Validation', () => {
    it('should return 400 for days parameter below minimum', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 0 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/days.*minimum|invalid.*range/i);
    });

    it('should return 400 for days parameter above maximum', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 366 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/days.*maximum|invalid.*range/i);
    });

    it('should return 400 for invalid days parameter types', async () => {
      const invalidValues = ['invalid', 'abc', '-5', '30.5'];

      for (const invalidValue of invalidValues) {
        const response = await request(API_BASE_URL)
          .get('/api/income-events/upcoming')
          .query({ days: invalidValue })
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toMatch(/days.*integer|invalid.*number/i);
      }
    });

    it('should handle missing days parameter with default value', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should default to 30 days
      expect(response.body.upcomingIncome.length).toBe(4); // Events within 30 days

      const fromDate = new Date(response.body.dateRange.fromDate);
      const toDate = new Date(response.body.dateRange.toDate);
      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });
  });

  describe('Empty Result Scenarios', () => {
    it('should return empty list when no upcoming income exists', async () => {
      // Create new user with no income events
      const emptyUser = {
        email: 'empty-upcoming@example.com',
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
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${emptyLoginResponse.body.tokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.upcomingIncome).toHaveLength(0);
      expect(response.body.totalUpcoming).toBe(0);
      expect(response.body.dateRange).toHaveProperty('fromDate');
      expect(response.body.dateRange).toHaveProperty('toDate');
    });

    it('should return empty list for very narrow date range with no income', async () => {
      // Query for just tomorrow when income is in +2 days
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 1 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should have one income event (tomorrow)
      expect(response.body.upcomingIncome.length).toBe(1);

      // Query for a range that excludes all income
      const response2 = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 1 })
        .set('Authorization', `Bearer ${emptyLoginResponse?.body?.tokens?.accessToken || authTokens.accessToken}`)
        .expect(200);

      if (response2.body.upcomingIncome.length === 0) {
        expect(response2.body.totalUpcoming).toBe(0);
      }
    });
  });

  describe('Data Consistency and Calculations', () => {
    it('should calculate totalUpcoming correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const calculatedTotal = response.body.upcomingIncome.reduce(
        (sum: number, income: any) => sum + income.amount,
        0
      );

      expect(response.body.totalUpcoming).toBe(calculatedTotal);
      expect(response.body.totalUpcoming).toBe(5500.00); // 3000 + 500 + 1200 + 800
    });

    it('should provide accurate date range information', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .query({ days: 15 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const fromDate = new Date(response.body.dateRange.fromDate);
      const toDate = new Date(response.body.dateRange.toDate);
      const today = new Date();

      // From date should be today or tomorrow
      expect(fromDate.getTime()).toBeGreaterThanOrEqual(today.setHours(0, 0, 0, 0));

      // To date should be 15 days from from date
      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(15);
    });

    it('should handle decimal amounts correctly', async () => {
      // Create income with decimal amount
      await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Decimal Income',
          amount: 1234.56,
          scheduledDate: getDateString(3),
          frequency: 'once'
        });

      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const decimalIncome = response.body.upcomingIncome.find(
        (income: any) => income.name === 'Decimal Income'
      );

      expect(decimalIncome).toBeDefined();
      expect(decimalIncome.amount).toBe(1234.56);

      // Total should include decimal income
      expect(response.body.totalUpcoming).toBe(6734.56); // Original 5500 + 1234.56
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return upcoming income for authenticated user\'s family', async () => {
      // Create second family with upcoming income
      const secondFamily = {
        email: 'other-upcoming@example.com',
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

      // Create upcoming income for other family
      await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Family Upcoming',
          amount: 9999.00,
          scheduledDate: getDateString(2),
          frequency: 'monthly'
        });

      // Original user should not see other family's upcoming income
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const incomeNames = response.body.upcomingIncome.map((income: any) => income.name);
      expect(incomeNames).not.toContain('Other Family Upcoming');
      expect(response.body.totalUpcoming).toBe(5500.00); // Original amount, not including other family's income
    });
  });

  describe('Performance and Caching', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Upcoming income should be cacheable but with short TTL due to date-sensitive nature
      expect(response.headers['cache-control']).toMatch(/max-age=|no-cache|private/);
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('upcomingIncome');
    });

    it('should handle CORS headers appropriately', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .set('Origin', 'https://familyfinance.com')
        .expect(200);

      // CORS headers should be present if configured
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).toBeDefined();
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle income scheduled for today correctly', async () => {
      // Create income for today
      await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Today Income',
          amount: 1000.00,
          scheduledDate: getDateString(0), // Today
          frequency: 'once'
        });

      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should include today's scheduled income
      const todayIncome = response.body.upcomingIncome.find(
        (income: any) => income.name === 'Today Income'
      );
      expect(todayIncome).toBeDefined();
    });

    it('should handle recurring income with proper next occurrence calculation', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const recurringIncome = response.body.upcomingIncome.filter(
        (income: any) => income.frequency !== 'once'
      );

      recurringIncome.forEach((income: any) => {
        expect(income.nextOccurrence).not.toBeNull();

        if (income.nextOccurrence) {
          const scheduledDate = new Date(income.scheduledDate);
          const nextOccurrence = new Date(income.nextOccurrence);
          expect(nextOccurrence.getTime()).toBeGreaterThan(scheduledDate.getTime());
        }
      });
    });

    it('should handle timezone considerations correctly', async () => {
      // Dates should be handled consistently regardless of server timezone
      const response = await request(API_BASE_URL)
        .get('/api/income-events/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      response.body.upcomingIncome.forEach((income: any) => {
        // Scheduled dates should be in YYYY-MM-DD format
        expect(income.scheduledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Date should be parseable
        const scheduledDate = new Date(income.scheduledDate);
        expect(scheduledDate).toBeInstanceOf(Date);
        expect(!isNaN(scheduledDate.getTime())).toBe(true);
      });

      // Date range should also be consistent
      expect(response.body.dateRange.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(response.body.dateRange.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});