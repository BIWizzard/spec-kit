/**
 * Contract Test: GET /api/reports/net-worth
 * Task: T117 - Net worth report endpoint contract validation
 *
 * This test validates the net worth report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/net-worth', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.bankAccount.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Net Worth Report Requests', () => {
    it('should return 200 with net worth analysis for valid date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/net-worth')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          includeProjections: false
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('currentNetWorth');
      expect(response.body).toHaveProperty('netWorthChange');
      expect(response.body).toHaveProperty('percentageChange');
      expect(response.body).toHaveProperty('assets');
      expect(response.body).toHaveProperty('liabilities');
      expect(response.body).toHaveProperty('monthlyHistory');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate date range structure
      const { dateRange } = response.body;
      expect(dateRange).toHaveProperty('fromDate', '2024-01-01');
      expect(dateRange).toHaveProperty('toDate', '2024-12-31');

      // Validate main financial metrics
      expect(typeof response.body.currentNetWorth).toBe('number');
      expect(typeof response.body.netWorthChange).toBe('number');
      expect(typeof response.body.percentageChange).toBe('number');

      // Validate assets structure
      const { assets } = response.body;
      expect(assets).toHaveProperty('totalAssets');
      expect(assets).toHaveProperty('breakdown');
      expect(typeof assets.totalAssets).toBe('number');
      expect(Array.isArray(assets.breakdown)).toBe(true);

      if (assets.breakdown.length > 0) {
        const asset = assets.breakdown[0];
        expect(asset).toHaveProperty('accountType');
        expect(asset).toHaveProperty('accountName');
        expect(asset).toHaveProperty('currentBalance');
        expect(asset).toHaveProperty('changeAmount');

        expect(typeof asset.accountType).toBe('string');
        expect(typeof asset.accountName).toBe('string');
        expect(typeof asset.currentBalance).toBe('number');
        expect(typeof asset.changeAmount).toBe('number');
      }

      // Validate liabilities structure
      const { liabilities } = response.body;
      expect(liabilities).toHaveProperty('totalLiabilities');
      expect(liabilities).toHaveProperty('breakdown');
      expect(typeof liabilities.totalLiabilities).toBe('number');
      expect(Array.isArray(liabilities.breakdown)).toBe(true);

      if (liabilities.breakdown.length > 0) {
        const liability = liabilities.breakdown[0];
        expect(liability).toHaveProperty('accountType');
        expect(liability).toHaveProperty('accountName');
        expect(liability).toHaveProperty('currentBalance');
        expect(liability).toHaveProperty('changeAmount');

        expect(typeof liability.accountType).toBe('string');
        expect(typeof liability.accountName).toBe('string');
        expect(typeof liability.currentBalance).toBe('number');
        expect(typeof liability.changeAmount).toBe('number');
      }

      // Validate monthly history array
      expect(Array.isArray(response.body.monthlyHistory)).toBe(true);
      if (response.body.monthlyHistory.length > 0) {
        const month = response.body.monthlyHistory[0];
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('netWorth');
        expect(month).toHaveProperty('assets');
        expect(month).toHaveProperty('liabilities');

        // Validate month format (YYYY-MM-DD)
        expect(month.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof month.netWorth).toBe('number');
        expect(typeof month.assets).toBe('number');
        expect(typeof month.liabilities).toBe('number');

        // Net worth should equal assets minus liabilities
        expect(Math.abs(month.netWorth - (month.assets - month.liabilities))).toBeLessThan(0.01);
      }
    });

    it('should support projections when requested', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/net-worth')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-06-30',
          includeProjections: true
        })
        .expect(200);

      // When projections are included, monthly history may extend beyond the date range
      expect(response.body).toHaveProperty('monthlyHistory');
      expect(Array.isArray(response.body.monthlyHistory)).toBe(true);
    });

    it('should calculate net worth correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/net-worth')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      const { currentNetWorth, assets, liabilities } = response.body;

      // Net worth should equal total assets minus total liabilities
      const calculatedNetWorth = assets.totalAssets - liabilities.totalLiabilities;
      expect(Math.abs(currentNetWorth - calculatedNetWorth)).toBeLessThan(0.01);

      // Total assets should be non-negative
      expect(assets.totalAssets).toBeGreaterThanOrEqual(0);

      // Total liabilities should be non-negative (represented as positive numbers)
      expect(liabilities.totalLiabilities).toBeGreaterThanOrEqual(0);
    });

    it('should use default values for optional parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/net-worth')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      // Should default to no projections
      expect(response.body).toHaveProperty('monthlyHistory');
    });

    it('should provide account breakdown with all required fields', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/net-worth')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      // Check assets breakdown
      if (response.body.assets.breakdown.length > 0) {
        const asset = response.body.assets.breakdown[0];
        expect(typeof asset.accountType).toBe('string');
        expect(typeof asset.accountName).toBe('string');
        expect(asset.accountName.length).toBeGreaterThan(0);
      }

      // Check liabilities breakdown
      if (response.body.liabilities.breakdown.length > 0) {
        const liability = response.body.liabilities.breakdown[0];
        expect(typeof liability.accountType).toBe('string');
        expect(typeof liability.accountName).toBe('string');
        expect(liability.accountName.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Invalid Net Worth Report Requests', () => {
    it('should return 400 for missing required parameters', async () => {
      const invalidQueries = [
        { toDate: '2024-12-31' }, // Missing fromDate
        { fromDate: '2024-01-01' }, // Missing toDate
        {} // Missing both
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/net-worth')
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
        .get('/api/reports/net-worth')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: 'invalid-date',
          toDate: '2024-12-31'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 when fromDate is after toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/net-worth')
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
        .get('/api/reports/net-worth')
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
        .get('/api/reports/net-worth')
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
        .get('/api/reports/net-worth')
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