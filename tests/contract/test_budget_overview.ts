/**
 * Contract Test: GET /api/budget/overview
 * Task: T108 - Budget overview endpoint contract validation
 *
 * This test validates the budget overview API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock authentication token
const mockToken = 'Bearer mock-jwt-token';

describe('Contract Test: GET /api/budget/overview', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.budgetAllocation.deleteMany();
    await prisma.budgetCategory.deleteMany();
    await prisma.incomeEvent.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Budget Overview Request', () => {
    const validFromDate = '2024-01-01';
    const validToDate = '2024-12-31';

    it('should return 200 with budget overview', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/overview?fromDate=${validFromDate}&toDate=${validToDate}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('periods');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('dateRange');
      expect(Array.isArray(response.body.periods)).toBe(true);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalIncome');
      expect(summary).toHaveProperty('totalAllocated');
      expect(summary).toHaveProperty('totalSpent');
      expect(summary).toHaveProperty('savingsRate');
      expect(summary).toHaveProperty('budgetEfficiency');
      expect(typeof summary.totalIncome).toBe('number');
      expect(typeof summary.totalAllocated).toBe('number');
      expect(typeof summary.totalSpent).toBe('number');
      expect(typeof summary.savingsRate).toBe('number');
      expect(typeof summary.budgetEfficiency).toBe('number');

      // Validate date range
      const { dateRange } = response.body;
      expect(dateRange).toHaveProperty('fromDate', validFromDate);
      expect(dateRange).toHaveProperty('toDate', validToDate);
    });

    it('should return periods with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/overview?fromDate=${validFromDate}&toDate=${validToDate}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { periods } = response.body;

      if (periods.length > 0) {
        const period = periods[0];
        expect(period).toHaveProperty('period');
        expect(period).toHaveProperty('periodStart');
        expect(period).toHaveProperty('periodEnd');
        expect(period).toHaveProperty('totalIncome');
        expect(period).toHaveProperty('totalAllocated');
        expect(period).toHaveProperty('totalSpent');
        expect(period).toHaveProperty('categoryBreakdown');
        expect(Array.isArray(period.categoryBreakdown)).toBe(true);

        // Validate data types
        expect(typeof period.period).toBe('string');
        expect(typeof period.periodStart).toBe('string');
        expect(typeof period.periodEnd).toBe('string');
        expect(typeof period.totalIncome).toBe('number');
        expect(typeof period.totalAllocated).toBe('number');
        expect(typeof period.totalSpent).toBe('number');

        // Validate date formats
        expect(period.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(period.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should support different groupBy parameters', async () => {
      const groupByOptions = ['week', 'month', 'quarter', 'year'];

      for (const groupBy of groupByOptions) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget/overview?fromDate=${validFromDate}&toDate=${validToDate}&groupBy=${groupBy}`)
          .set('Authorization', mockToken)
          .expect(200);

        expect(response.body).toHaveProperty('periods');
        expect(response.body).toHaveProperty('summary');
      }
    });

    it('should default to monthly grouping', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/overview?fromDate=${validFromDate}&toDate=${validToDate}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('periods');
      // Default groupBy should be month based on API spec
    });

    it('should validate category breakdown structure', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/overview?fromDate=${validFromDate}&toDate=${validToDate}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { periods } = response.body;

      if (periods.length > 0 && periods[0].categoryBreakdown.length > 0) {
        const categoryBreakdown = periods[0].categoryBreakdown[0];
        expect(categoryBreakdown).toHaveProperty('categoryId');
        expect(categoryBreakdown).toHaveProperty('categoryName');
        expect(categoryBreakdown).toHaveProperty('allocated');
        expect(categoryBreakdown).toHaveProperty('spent');
        expect(categoryBreakdown).toHaveProperty('remaining');
        expect(categoryBreakdown).toHaveProperty('performance');

        // Validate data types
        expect(typeof categoryBreakdown.categoryId).toBe('string');
        expect(typeof categoryBreakdown.categoryName).toBe('string');
        expect(typeof categoryBreakdown.allocated).toBe('number');
        expect(typeof categoryBreakdown.spent).toBe('number');
        expect(typeof categoryBreakdown.remaining).toBe('number');
        expect(typeof categoryBreakdown.performance).toBe('number');
      }
    });
  });

  describe('Invalid Budget Overview Requests', () => {
    it('should return 400 for missing required fromDate parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/overview?toDate=2024-12-31')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('fromDate');
    });

    it('should return 400 for missing required toDate parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/overview?fromDate=2024-01-01')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('toDate');
    });

    it('should return 400 for invalid date formats', async () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        '24-01-01', // Wrong year format
        'invalid-format'
      ];

      for (const invalidDate of invalidDates) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget/overview?fromDate=${invalidDate}&toDate=2024-12-31`)
          .set('Authorization', mockToken)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid groupBy parameter', async () => {
      const invalidGroupBy = ['invalid', 'day', 'decade'];

      for (const groupBy of invalidGroupBy) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget/overview?fromDate=2024-01-01&toDate=2024-12-31&groupBy=${groupBy}`)
          .set('Authorization', mockToken)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('groupBy');
      }
    });

    it('should return 400 when fromDate is after toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/overview?fromDate=2024-12-31&toDate=2024-01-01')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/date.*range|fromDate.*toDate/i);
    });
  });

  describe('Authentication Requirements', () => {
    const validQuery = 'fromDate=2024-01-01&toDate=2024-12-31';

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/overview?${validQuery}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/overview?${validQuery}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle empty date ranges gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/overview?fromDate=2024-06-01&toDate=2024-06-01') // Same date
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('periods');
      expect(response.body).toHaveProperty('summary');
    });

    it('should calculate savings rate correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/overview?fromDate=2024-01-01&toDate=2024-12-31')
        .set('Authorization', mockToken)
        .expect(200);

      const { summary } = response.body;
      const { totalIncome, totalSpent, savingsRate } = summary;

      if (totalIncome > 0) {
        const expectedSavingsRate = ((totalIncome - totalSpent) / totalIncome) * 100;
        expect(savingsRate).toBeCloseTo(expectedSavingsRate, 2);
      } else {
        expect(savingsRate).toBe(0);
      }
    });

    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get('/api/budget/overview?fromDate=2024-01-01&toDate=2024-12-31')
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });
  });
});
