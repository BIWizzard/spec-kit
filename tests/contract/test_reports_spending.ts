/**
 * Contract Test: GET /api/reports/spending-analysis
 * Task: T114 - Spending analysis report endpoint contract validation
 *
 * This test validates the spending analysis report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/spending-analysis', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';
  const mockCategoryId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.payment.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Spending Analysis Report Requests', () => {
    it('should return 200 with spending analysis for valid date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/spending-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          includeSubcategories: true
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('categoryBreakdown');
      expect(response.body).toHaveProperty('monthlyTrends');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate date range structure
      const { dateRange } = response.body;
      expect(dateRange).toHaveProperty('fromDate', '2024-01-01');
      expect(dateRange).toHaveProperty('toDate', '2024-12-31');

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalSpending');
      expect(summary).toHaveProperty('averageMonthlySpending');
      expect(summary).toHaveProperty('largestExpense');

      // Validate largest expense structure
      expect(summary.largestExpense).toHaveProperty('amount');
      expect(summary.largestExpense).toHaveProperty('description');
      expect(summary.largestExpense).toHaveProperty('category');
      expect(summary.largestExpense).toHaveProperty('date');

      // Validate category breakdown array
      expect(Array.isArray(response.body.categoryBreakdown)).toBe(true);
      if (response.body.categoryBreakdown.length > 0) {
        const category = response.body.categoryBreakdown[0];
        expect(category).toHaveProperty('categoryId');
        expect(category).toHaveProperty('categoryName');
        expect(category).toHaveProperty('totalSpent');
        expect(category).toHaveProperty('percentage');
        expect(category).toHaveProperty('transactionCount');
        expect(category).toHaveProperty('averageTransaction');
        expect(category).toHaveProperty('trend');
        expect(['increasing', 'stable', 'decreasing']).toContain(category.trend);
      }

      // Validate monthly trends array
      expect(Array.isArray(response.body.monthlyTrends)).toBe(true);
      if (response.body.monthlyTrends.length > 0) {
        const trend = response.body.monthlyTrends[0];
        expect(trend).toHaveProperty('month');
        expect(trend).toHaveProperty('totalSpent');
        expect(trend).toHaveProperty('categoryBreakdown');
      }
    });

    it('should support category filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/spending-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          categoryId: mockCategoryId
        })
        .expect(200);

      expect(response.body).toHaveProperty('categoryBreakdown');
      // Should filter to specific category
      if (response.body.categoryBreakdown.length > 0) {
        expect(response.body.categoryBreakdown.every(cat =>
          cat.categoryId === mockCategoryId || cat.parentCategoryId === mockCategoryId
        )).toBe(true);
      }
    });

    it('should support different groupBy options', async () => {
      const groupByOptions = ['week', 'month', 'quarter', 'year'];

      for (const groupBy of groupByOptions) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/spending-analysis')
          .set('Authorization', mockAccessToken)
          .query({
            fromDate: '2024-01-01',
            toDate: '2024-12-31',
            groupBy
          })
          .expect(200);

        expect(response.body).toHaveProperty('monthlyTrends');
        expect(Array.isArray(response.body.monthlyTrends)).toBe(true);
      }
    });

    it('should handle subcategory inclusion settings', async () => {
      const withSubcategories = await request(API_BASE_URL)
        .get('/api/reports/spending-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          includeSubcategories: true
        })
        .expect(200);

      const withoutSubcategories = await request(API_BASE_URL)
        .get('/api/reports/spending-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          includeSubcategories: false
        })
        .expect(200);

      expect(withSubcategories.body).toHaveProperty('categoryBreakdown');
      expect(withoutSubcategories.body).toHaveProperty('categoryBreakdown');
    });

    it('should use default values for optional parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/spending-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      // Should default to month grouping and include subcategories
      expect(response.body).toHaveProperty('categoryBreakdown');
      expect(response.body).toHaveProperty('monthlyTrends');
    });
  });

  describe('Invalid Spending Analysis Report Requests', () => {
    it('should return 400 for missing required parameters', async () => {
      const invalidQueries = [
        { toDate: '2024-12-31' }, // Missing fromDate
        { fromDate: '2024-01-01' }, // Missing toDate
        {} // Missing both
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/spending-analysis')
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
        .get('/api/reports/spending-analysis')
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
        .get('/api/reports/spending-analysis')
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

    it('should return 400 for invalid categoryId format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/spending-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          categoryId: 'invalid-uuid'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 when fromDate is after toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/spending-analysis')
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
        .get('/api/reports/spending-analysis')
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
        .get('/api/reports/spending-analysis')
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
        .get('/api/reports/spending-analysis')
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