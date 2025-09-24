/**
 * Contract Test: GET /api/analytics/trends
 * Task: T130 - Analytics trends endpoint contract validation
 *
 * This test validates the analytics trends API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/analytics/trends', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.payment.deleteMany();
    await prisma.income.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Trends Analytics Requests', () => {
    it('should return 200 with trends analysis for required parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          granularity: 'monthly',
          metrics: 'income,spending,savings_rate,net_worth'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per FinancialTrendsResponse schema
      expect(response.body).toHaveProperty('trends');
      expect(typeof response.body.trends).toBe('object');
      expect(response.body.trends).not.toBeNull();

      // Validate trends structure for each requested metric
      const requestedMetrics = ['income', 'spending', 'savings_rate', 'net_worth'];

      requestedMetrics.forEach(metric => {
        if (response.body.trends[metric]) {
          const trendData = response.body.trends[metric];

          expect(trendData).toHaveProperty('data');
          expect(trendData).toHaveProperty('trend');
          expect(trendData).toHaveProperty('changeRate');

          // Validate data array
          expect(Array.isArray(trendData.data)).toBe(true);
          if (trendData.data.length > 0) {
            const dataPoint = trendData.data[0];
            expect(dataPoint).toHaveProperty('date');
            expect(dataPoint).toHaveProperty('value');

            expect(dataPoint.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(typeof dataPoint.value).toBe('number');
          }

          // Validate trend enum
          expect(['increasing', 'decreasing', 'stable', 'volatile']).toContain(trendData.trend);

          // Validate change rate
          expect(typeof trendData.changeRate).toBe('number');
          expect(trendData.changeRate).toBeGreaterThanOrEqual(-100); // Can be negative
        }
      });
    });

    it('should support single metric requests', async () => {
      const metrics = ['income', 'spending', 'savings_rate', 'net_worth'];

      for (const metric of metrics) {
        const response = await request(API_BASE_URL)
          .get('/api/analytics/trends')
          .set('Authorization', mockAccessToken)
          .query({
            fromDate: '2024-01-01',
            toDate: '2024-12-31',
            metrics: metric
          })
          .expect(200);

        expect(response.body.trends).toHaveProperty(metric);

        const trendData = response.body.trends[metric];
        expect(trendData).toHaveProperty('data');
        expect(trendData).toHaveProperty('trend');
        expect(trendData).toHaveProperty('changeRate');
      }
    });

    it('should support different granularity options', async () => {
      const granularities = ['daily', 'weekly', 'monthly'];

      for (const granularity of granularities) {
        const response = await request(API_BASE_URL)
          .get('/api/analytics/trends')
          .set('Authorization', mockAccessToken)
          .query({
            fromDate: '2024-01-01',
            toDate: '2024-12-31',
            granularity,
            metrics: 'income'
          })
          .expect(200);

        expect(response.body).toHaveProperty('trends');
        if (response.body.trends.income && response.body.trends.income.data.length > 0) {
          const data = response.body.trends.income.data;

          // Verify data points are spaced according to granularity
          if (data.length > 1) {
            const firstDate = new Date(data[0].date);
            const secondDate = new Date(data[1].date);
            const daysDiff = (secondDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

            switch (granularity) {
              case 'daily':
                expect(daysDiff).toBeGreaterThanOrEqual(1);
                expect(daysDiff).toBeLessThanOrEqual(7);
                break;
              case 'weekly':
                expect(daysDiff).toBeGreaterThanOrEqual(7);
                expect(daysDiff).toBeLessThanOrEqual(14);
                break;
              case 'monthly':
                expect(daysDiff).toBeGreaterThanOrEqual(28);
                expect(daysDiff).toBeLessThanOrEqual(35);
                break;
            }
          }
        }
      }
    });

    it('should use default granularity when not specified', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income'
        })
        .expect(200);

      // Should default to monthly per OpenAPI spec
      expect(response.body).toHaveProperty('trends');
    });

    it('should handle comma-separated metrics correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income,spending,savings_rate'
        })
        .expect(200);

      const expectedMetrics = ['income', 'spending', 'savings_rate'];
      const actualMetrics = Object.keys(response.body.trends);

      expectedMetrics.forEach(metric => {
        if (actualMetrics.includes(metric)) {
          expect(response.body.trends[metric]).toHaveProperty('data');
          expect(response.body.trends[metric]).toHaveProperty('trend');
          expect(response.body.trends[metric]).toHaveProperty('changeRate');
        }
      });
    });

    it('should order data points chronologically', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income',
          granularity: 'monthly'
        })
        .expect(200);

      if (response.body.trends.income && response.body.trends.income.data.length > 1) {
        const data = response.body.trends.income.data;

        for (let i = 1; i < data.length; i++) {
          const prevDate = new Date(data[i - 1].date);
          const currentDate = new Date(data[i].date);
          expect(currentDate.getTime()).toBeGreaterThan(prevDate.getTime());
        }
      }
    });

    it('should calculate change rates correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income,spending'
        })
        .expect(200);

      Object.values(response.body.trends).forEach(trendData => {
        if (trendData.data.length > 1) {
          const firstValue = trendData.data[0].value;
          const lastValue = trendData.data[trendData.data.length - 1].value;

          // Change rate should reflect actual data change
          if (firstValue !== 0) {
            const expectedChangeRate = ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
            expect(Math.abs(trendData.changeRate - expectedChangeRate)).toBeLessThan(1);
          }
        }
      });
    });

    it('should determine trend direction correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income'
        })
        .expect(200);

      if (response.body.trends.income && response.body.trends.income.data.length > 1) {
        const trendData = response.body.trends.income;
        const data = trendData.data;

        // Verify trend direction matches data pattern
        if (trendData.trend === 'increasing') {
          expect(trendData.changeRate).toBeGreaterThan(0);
        } else if (trendData.trend === 'decreasing') {
          expect(trendData.changeRate).toBeLessThan(0);
        } else if (trendData.trend === 'stable') {
          expect(Math.abs(trendData.changeRate)).toBeLessThan(5); // Within 5%
        }
        // 'volatile' can have any change rate but high variance
      }
    });

    it('should handle different date ranges appropriately', async () => {
      const dateRanges = [
        { fromDate: '2024-01-01', toDate: '2024-01-31' }, // 1 month
        { fromDate: '2024-01-01', toDate: '2024-03-31' }, // 3 months
        { fromDate: '2024-01-01', toDate: '2024-12-31' }  // 1 year
      ];

      for (const dateRange of dateRanges) {
        const response = await request(API_BASE_URL)
          .get('/api/analytics/trends')
          .set('Authorization', mockAccessToken)
          .query({
            ...dateRange,
            metrics: 'income'
          })
          .expect(200);

        expect(response.body).toHaveProperty('trends');

        if (response.body.trends.income && response.body.trends.income.data.length > 0) {
          const data = response.body.trends.income.data;
          const firstDate = new Date(data[0].date);
          const lastDate = new Date(data[data.length - 1].date);
          const requestFromDate = new Date(dateRange.fromDate);
          const requestToDate = new Date(dateRange.toDate);

          // Data should fall within requested range
          expect(firstDate.getTime()).toBeGreaterThanOrEqual(requestFromDate.getTime());
          expect(lastDate.getTime()).toBeLessThanOrEqual(requestToDate.getTime());
        }
      }
    });
  });

  describe('Invalid Trends Analytics Requests', () => {
    it('should return 400 for missing required fromDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          toDate: '2024-12-31',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for missing required toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid date formats', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: 'invalid-date',
          toDate: '2024-12-31',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for fromDate after toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-12-31',
          toDate: '2024-01-01',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid granularity', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          granularity: 'invalid_granularity',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid metrics', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'invalid_metric,another_invalid_metric'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for empty metrics parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: ''
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for date range too large', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2020-01-01',
          toDate: '2030-12-31', // 10+ year range
          granularity: 'daily',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/range|period|large/i);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle periods with no data gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2030-01-01',
          toDate: '2030-12-31', // Future dates with no data
          metrics: 'income'
        })
        .expect(200);

      expect(response.body).toHaveProperty('trends');

      if (response.body.trends.income) {
        expect(Array.isArray(response.body.trends.income.data)).toBe(true);
        // Data array can be empty for periods with no data
      }
    });

    it('should respond within reasonable time for large datasets', async () => {
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2023-01-01',
          toDate: '2024-12-31',
          granularity: 'weekly',
          metrics: 'income,spending,savings_rate,net_worth'
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 5 seconds even with large datasets
      expect(responseTime).toBeLessThan(5000);

      expect(response.body).toHaveProperty('trends');
    });

    it('should handle mixed valid and invalid metrics', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', mockAccessToken)
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income,invalid_metric,spending'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      // Should reject the entire request if any metric is invalid
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', 'Bearer invalid-token')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/trends')
        .set('Authorization', 'Bearer limited-permissions-token')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          metrics: 'income'
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});