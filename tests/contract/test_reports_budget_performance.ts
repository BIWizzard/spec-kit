/**
 * Contract Test: GET /api/reports/budget-performance
 * Task: T115 - Budget performance report endpoint contract validation
 *
 * This test validates the budget performance report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/budget-performance', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';
  const mockBudgetCategoryId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.budgetItem.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Budget Performance Report Requests', () => {
    it('should return 200 with budget performance analysis for valid date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/budget-performance')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('categoryPerformance');
      expect(response.body).toHaveProperty('monthlyComparison');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate date range structure
      const { dateRange } = response.body;
      expect(dateRange).toHaveProperty('fromDate', '2024-01-01');
      expect(dateRange).toHaveProperty('toDate', '2024-12-31');

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalBudgeted');
      expect(summary).toHaveProperty('totalSpent');
      expect(summary).toHaveProperty('budgetUtilization');
      expect(summary).toHaveProperty('overBudgetAmount');
      expect(summary).toHaveProperty('underBudgetAmount');

      // Validate data types
      expect(typeof summary.totalBudgeted).toBe('number');
      expect(typeof summary.totalSpent).toBe('number');
      expect(typeof summary.budgetUtilization).toBe('number');
      expect(typeof summary.overBudgetAmount).toBe('number');
      expect(typeof summary.underBudgetAmount).toBe('number');

      // Validate category performance array
      expect(Array.isArray(response.body.categoryPerformance)).toBe(true);
      if (response.body.categoryPerformance.length > 0) {
        const category = response.body.categoryPerformance[0];
        expect(category).toHaveProperty('categoryId');
        expect(category).toHaveProperty('categoryName');
        expect(category).toHaveProperty('budgeted');
        expect(category).toHaveProperty('spent');
        expect(category).toHaveProperty('variance');
        expect(category).toHaveProperty('utilizationRate');
        expect(category).toHaveProperty('status');
        expect(['under_budget', 'on_budget', 'over_budget']).toContain(category.status);

        // Validate UUID format
        expect(category.categoryId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }

      // Validate monthly comparison array
      expect(Array.isArray(response.body.monthlyComparison)).toBe(true);
      if (response.body.monthlyComparison.length > 0) {
        const month = response.body.monthlyComparison[0];
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('budgeted');
        expect(month).toHaveProperty('spent');
        expect(month).toHaveProperty('utilizationRate');

        // Validate month format (YYYY-MM-DD)
        expect(month.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should support budget category filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/budget-performance')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          budgetCategoryId: mockBudgetCategoryId
        })
        .expect(200);

      expect(response.body).toHaveProperty('categoryPerformance');
      // Should filter to specific budget category
      if (response.body.categoryPerformance.length > 0) {
        expect(response.body.categoryPerformance.every(cat =>
          cat.categoryId === mockBudgetCategoryId
        )).toBe(true);
      }
    });

    it('should calculate budget utilization correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/budget-performance')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      const { summary } = response.body;

      // Budget utilization should be a percentage
      expect(summary.budgetUtilization).toBeGreaterThanOrEqual(0);
      expect(typeof summary.budgetUtilization).toBe('number');

      // Over/under budget amounts should be non-negative
      expect(summary.overBudgetAmount).toBeGreaterThanOrEqual(0);
      expect(summary.underBudgetAmount).toBeGreaterThanOrEqual(0);
    });

    it('should provide category performance with all required fields', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/budget-performance')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      if (response.body.categoryPerformance.length > 0) {
        const category = response.body.categoryPerformance[0];

        // Validate all required fields are present
        expect(typeof category.categoryName).toBe('string');
        expect(typeof category.budgeted).toBe('number');
        expect(typeof category.spent).toBe('number');
        expect(typeof category.variance).toBe('number');
        expect(typeof category.utilizationRate).toBe('number');

        // Utilization rate should be a percentage
        expect(category.utilizationRate).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Invalid Budget Performance Report Requests', () => {
    it('should return 400 for missing required parameters', async () => {
      const invalidQueries = [
        { toDate: '2024-12-31' }, // Missing fromDate
        { fromDate: '2024-01-01' }, // Missing toDate
        {} // Missing both
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/budget-performance')
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
        .get('/api/reports/budget-performance')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: 'invalid-date',
          toDate: '2024-12-31'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid budgetCategoryId format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/budget-performance')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          budgetCategoryId: 'invalid-uuid'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 when fromDate is after toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/budget-performance')
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
        .get('/api/reports/budget-performance')
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
        .get('/api/reports/budget-performance')
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
        .get('/api/reports/budget-performance')
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