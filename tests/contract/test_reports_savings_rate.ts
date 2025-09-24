/**
 * Contract Test: GET /api/reports/savings-rate
 * Task: T118 - Savings rate report endpoint contract validation
 *
 * This test validates the savings rate report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/savings-rate', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.payment.deleteMany();
    await prisma.income.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Savings Rate Report Requests', () => {
    it('should return 200 with savings rate analysis for valid date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('currentSavingsRate');
      expect(response.body).toHaveProperty('averageSavingsRate');
      expect(response.body).toHaveProperty('totalSaved');
      expect(response.body).toHaveProperty('savingsGoal');
      expect(response.body).toHaveProperty('goalProgress');
      expect(response.body).toHaveProperty('monthlySavings');
      expect(response.body).toHaveProperty('savingsBreakdown');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate date range structure
      const { dateRange } = response.body;
      expect(dateRange).toHaveProperty('fromDate', '2024-01-01');
      expect(dateRange).toHaveProperty('toDate', '2024-12-31');

      // Validate main savings metrics
      expect(typeof response.body.currentSavingsRate).toBe('number');
      expect(typeof response.body.averageSavingsRate).toBe('number');
      expect(typeof response.body.totalSaved).toBe('number');

      // Savings rates should be percentages (0-100 or potentially higher)
      expect(response.body.currentSavingsRate).toBeGreaterThanOrEqual(0);
      expect(response.body.averageSavingsRate).toBeGreaterThanOrEqual(0);

      // Savings goal is nullable
      if (response.body.savingsGoal !== null) {
        expect(typeof response.body.savingsGoal).toBe('number');
        expect(response.body.savingsGoal).toBeGreaterThan(0);
      }

      // Goal progress is nullable
      if (response.body.goalProgress !== null) {
        expect(typeof response.body.goalProgress).toBe('number');
        expect(response.body.goalProgress).toBeGreaterThanOrEqual(0);
      }

      // Validate monthly savings array
      expect(Array.isArray(response.body.monthlySavings)).toBe(true);
      if (response.body.monthlySavings.length > 0) {
        const month = response.body.monthlySavings[0];
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('income');
        expect(month).toHaveProperty('expenses');
        expect(month).toHaveProperty('saved');
        expect(month).toHaveProperty('savingsRate');

        // Validate month format (YYYY-MM-DD)
        expect(month.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof month.income).toBe('number');
        expect(typeof month.expenses).toBe('number');
        expect(typeof month.saved).toBe('number');
        expect(typeof month.savingsRate).toBe('number');

        // Saved amount should equal income minus expenses
        expect(Math.abs(month.saved - (month.income - month.expenses))).toBeLessThan(0.01);

        // Savings rate should be calculated correctly (saved / income * 100)
        if (month.income > 0) {
          const expectedRate = (month.saved / month.income) * 100;
          expect(Math.abs(month.savingsRate - expectedRate)).toBeLessThan(0.01);
        }

        // Savings rate should be a percentage
        expect(month.savingsRate).toBeGreaterThanOrEqual(-100); // Can be negative if expenses > income
      }

      // Validate savings breakdown array
      expect(Array.isArray(response.body.savingsBreakdown)).toBe(true);
      if (response.body.savingsBreakdown.length > 0) {
        const breakdown = response.body.savingsBreakdown[0];
        expect(breakdown).toHaveProperty('category');
        expect(breakdown).toHaveProperty('amount');
        expect(breakdown).toHaveProperty('percentage');

        expect(typeof breakdown.category).toBe('string');
        expect(typeof breakdown.amount).toBe('number');
        expect(typeof breakdown.percentage).toBe('number');

        // Percentage should be between 0 and 100
        expect(breakdown.percentage).toBeGreaterThanOrEqual(0);
        expect(breakdown.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should support different groupBy options', async () => {
      const groupByOptions = ['week', 'month', 'quarter', 'year'];

      for (const groupBy of groupByOptions) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/savings-rate')
          .set('Authorization', mockAccessToken)
          .query({
            fromDate: '2024-01-01',
            toDate: '2024-12-31',
            groupBy
          })
          .expect(200);

        expect(response.body).toHaveProperty('monthlySavings');
        expect(Array.isArray(response.body.monthlySavings)).toBe(true);
      }
    });

    it('should handle scenarios with no savings goal', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      // When no savings goal is set, these should be null
      if (response.body.savingsGoal === null) {
        expect(response.body.goalProgress).toBe(null);
      }
    });

    it('should use default values for optional parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      // Should default to month grouping
      expect(response.body).toHaveProperty('monthlySavings');
      expect(response.body).toHaveProperty('savingsBreakdown');
    });

    it('should calculate savings breakdown percentages correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      if (response.body.savingsBreakdown.length > 0) {
        const totalPercentage = response.body.savingsBreakdown.reduce(
          (sum, item) => sum + item.percentage,
          0
        );

        // Total percentages should add up to 100 (or close due to rounding)
        expect(Math.abs(totalPercentage - 100)).toBeLessThan(1);
      }
    });

    it('should provide meaningful savings rate trends', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      // Current and average savings rates should be reasonable
      expect(response.body.currentSavingsRate).toBeGreaterThanOrEqual(-100);
      expect(response.body.currentSavingsRate).toBeLessThanOrEqual(100);
      expect(response.body.averageSavingsRate).toBeGreaterThanOrEqual(-100);
      expect(response.body.averageSavingsRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Invalid Savings Rate Report Requests', () => {
    it('should return 400 for missing required parameters', async () => {
      const invalidQueries = [
        { toDate: '2024-12-31' }, // Missing fromDate
        { fromDate: '2024-01-01' }, // Missing toDate
        {} // Missing both
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/savings-rate')
          .set('Authorization', mockAccessToken)
          .query(query)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for invalid date formats', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: 'invalid-date',
          toDate: '2024-12-31'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid groupBy values', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'invalid'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 when fromDate is after toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-12-31',
          toDate: '2024-01-01'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', 'Bearer invalid-token')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/savings-rate')
        .set('Authorization', 'Bearer limited-permissions-token')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});