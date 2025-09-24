/**
 * Contract Test: GET /api/reports/cash-flow
 * Task: T113 - Cash flow report endpoint contract validation
 *
 * This test validates the cash flow report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/cash-flow', () => {
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

  describe('Valid Cash Flow Report Requests', () => {
    it('should return 200 with cash flow report for valid date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/cash-flow')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          includeProjections: false
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('periods');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate date range structure
      const { dateRange } = response.body;
      expect(dateRange).toHaveProperty('fromDate', '2024-01-01');
      expect(dateRange).toHaveProperty('toDate', '2024-12-31');

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalIncome');
      expect(summary).toHaveProperty('totalExpenses');
      expect(summary).toHaveProperty('netCashFlow');
      expect(summary).toHaveProperty('averageMonthlyIncome');
      expect(summary).toHaveProperty('averageMonthlyExpenses');

      // Validate data types
      expect(typeof summary.totalIncome).toBe('number');
      expect(typeof summary.totalExpenses).toBe('number');
      expect(typeof summary.netCashFlow).toBe('number');
      expect(typeof summary.averageMonthlyIncome).toBe('number');
      expect(typeof summary.averageMonthlyExpenses).toBe('number');

      // Validate periods array
      expect(Array.isArray(response.body.periods)).toBe(true);
      if (response.body.periods.length > 0) {
        const period = response.body.periods[0];
        expect(period).toHaveProperty('period');
        expect(period).toHaveProperty('periodStart');
        expect(period).toHaveProperty('periodEnd');
        expect(period).toHaveProperty('income');
        expect(period).toHaveProperty('expenses');
        expect(period).toHaveProperty('netFlow');
        expect(period).toHaveProperty('runningBalance');
      }
    });

    it('should include projections when requested', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/cash-flow')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-06-30',
          groupBy: 'month',
          includeProjections: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('projections');
      expect(Array.isArray(response.body.projections)).toBe(true);
    });

    it('should support different groupBy options', async () => {
      const groupByOptions = ['day', 'week', 'month', 'quarter', 'year'];

      for (const groupBy of groupByOptions) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/cash-flow')
          .set('Authorization', mockAccessToken)
          .query({
            fromDate: '2024-01-01',
            toDate: '2024-12-31',
            groupBy
          })
          .expect(200);

        expect(response.body).toHaveProperty('periods');
        expect(Array.isArray(response.body.periods)).toBe(true);
      }
    });

    it('should use default values for optional parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/cash-flow')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      // Should default to month grouping and no projections
      expect(response.body).toHaveProperty('periods');
      expect(response.body.projections).toBeNull();
    });
  });

  describe('Invalid Cash Flow Report Requests', () => {
    it('should return 400 for missing required parameters', async () => {
      const invalidQueries = [
        { toDate: '2024-12-31' }, // Missing fromDate
        { fromDate: '2024-01-01' }, // Missing toDate
        {} // Missing both
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/cash-flow')
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
        .get('/api/reports/cash-flow')
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
        .get('/api/reports/cash-flow')
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
        .get('/api/reports/cash-flow')
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
        .get('/api/reports/cash-flow')
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
        .get('/api/reports/cash-flow')
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
        .get('/api/reports/cash-flow')
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