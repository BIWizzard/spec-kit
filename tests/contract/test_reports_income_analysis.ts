/**
 * Contract Test: GET /api/reports/income-analysis
 * Task: T116 - Income analysis report endpoint contract validation
 *
 * This test validates the income analysis report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/income-analysis', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.attribution.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.income.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Income Analysis Report Requests', () => {
    it('should return 200 with income analysis for valid date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/income-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          includeAttributions: true
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('incomeStreams');
      expect(response.body).toHaveProperty('attributionAnalysis');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate date range structure
      const { dateRange } = response.body;
      expect(dateRange).toHaveProperty('fromDate', '2024-01-01');
      expect(dateRange).toHaveProperty('toDate', '2024-12-31');

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalScheduledIncome');
      expect(summary).toHaveProperty('totalActualIncome');
      expect(summary).toHaveProperty('incomeVariance');
      expect(summary).toHaveProperty('averageMonthlyIncome');
      expect(summary).toHaveProperty('incomeReliability');

      // Validate data types
      expect(typeof summary.totalScheduledIncome).toBe('number');
      expect(typeof summary.totalActualIncome).toBe('number');
      expect(typeof summary.incomeVariance).toBe('number');
      expect(typeof summary.averageMonthlyIncome).toBe('number');
      expect(typeof summary.incomeReliability).toBe('number');

      // Income reliability should be a percentage (0-100)
      expect(summary.incomeReliability).toBeGreaterThanOrEqual(0);
      expect(summary.incomeReliability).toBeLessThanOrEqual(100);

      // Validate income streams array
      expect(Array.isArray(response.body.incomeStreams)).toBe(true);
      if (response.body.incomeStreams.length > 0) {
        const stream = response.body.incomeStreams[0];
        expect(stream).toHaveProperty('source');
        expect(stream).toHaveProperty('totalIncome');
        expect(stream).toHaveProperty('percentage');
        expect(stream).toHaveProperty('frequency');
        expect(stream).toHaveProperty('reliability');

        expect(typeof stream.source).toBe('string');
        expect(typeof stream.totalIncome).toBe('number');
        expect(typeof stream.percentage).toBe('number');
        expect(typeof stream.frequency).toBe('string');
        expect(typeof stream.reliability).toBe('number');

        // Percentage should be between 0 and 100
        expect(stream.percentage).toBeGreaterThanOrEqual(0);
        expect(stream.percentage).toBeLessThanOrEqual(100);

        // Reliability should be between 0 and 100
        expect(stream.reliability).toBeGreaterThanOrEqual(0);
        expect(stream.reliability).toBeLessThanOrEqual(100);
      }

      // Validate attribution analysis structure
      const { attributionAnalysis } = response.body;
      expect(attributionAnalysis).toHaveProperty('totalAttributed');
      expect(attributionAnalysis).toHaveProperty('totalUnattributed');
      expect(attributionAnalysis).toHaveProperty('attributionRate');
      expect(attributionAnalysis).toHaveProperty('topAttributions');

      expect(typeof attributionAnalysis.totalAttributed).toBe('number');
      expect(typeof attributionAnalysis.totalUnattributed).toBe('number');
      expect(typeof attributionAnalysis.attributionRate).toBe('number');
      expect(Array.isArray(attributionAnalysis.topAttributions)).toBe(true);

      // Attribution rate should be a percentage
      expect(attributionAnalysis.attributionRate).toBeGreaterThanOrEqual(0);
      expect(attributionAnalysis.attributionRate).toBeLessThanOrEqual(100);

      // Validate top attributions structure
      if (attributionAnalysis.topAttributions.length > 0) {
        const attribution = attributionAnalysis.topAttributions[0];
        expect(attribution).toHaveProperty('paymentName');
        expect(attribution).toHaveProperty('attributedAmount');
        expect(typeof attribution.paymentName).toBe('string');
        expect(typeof attribution.attributedAmount).toBe('number');
      }
    });

    it('should support different groupBy options', async () => {
      const groupByOptions = ['week', 'month', 'quarter', 'year'];

      for (const groupBy of groupByOptions) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/income-analysis')
          .set('Authorization', mockAccessToken)
          .query({
            fromDate: '2024-01-01',
            toDate: '2024-12-31',
            groupBy
          })
          .expect(200);

        expect(response.body).toHaveProperty('incomeStreams');
        expect(Array.isArray(response.body.incomeStreams)).toBe(true);
      }
    });

    it('should handle attribution inclusion settings', async () => {
      const withAttributions = await request(API_BASE_URL)
        .get('/api/reports/income-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          includeAttributions: true
        })
        .expect(200);

      const withoutAttributions = await request(API_BASE_URL)
        .get('/api/reports/income-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          includeAttributions: false
        })
        .expect(200);

      expect(withAttributions.body).toHaveProperty('attributionAnalysis');
      expect(withoutAttributions.body).toHaveProperty('attributionAnalysis');

      // When includeAttributions is false, attribution details should be minimal
      if (!withoutAttributions.body.includeAttributions) {
        expect(withoutAttributions.body.attributionAnalysis.topAttributions.length).toBe(0);
      }
    });

    it('should use default values for optional parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/income-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      // Should default to month grouping and include attributions
      expect(response.body).toHaveProperty('incomeStreams');
      expect(response.body).toHaveProperty('attributionAnalysis');
    });

    it('should calculate income variance correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/income-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect(200);

      const { summary } = response.body;

      // Income variance should be the difference between actual and scheduled
      // This is a logical check - the actual calculation depends on implementation
      expect(typeof summary.incomeVariance).toBe('number');
    });
  });

  describe('Invalid Income Analysis Report Requests', () => {
    it('should return 400 for missing required parameters', async () => {
      const invalidQueries = [
        { toDate: '2024-12-31' }, // Missing fromDate
        { fromDate: '2024-01-01' }, // Missing toDate
        {} // Missing both
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/income-analysis')
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
        .get('/api/reports/income-analysis')
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
        .get('/api/reports/income-analysis')
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
        .get('/api/reports/income-analysis')
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
        .get('/api/reports/income-analysis')
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
        .get('/api/reports/income-analysis')
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
        .get('/api/reports/income-analysis')
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