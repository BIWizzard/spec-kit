/**
 * Contract Test: POST /api/reports/custom
 * Task: T122 - Custom report endpoint contract validation
 *
 * This test validates the custom report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/reports/custom', () => {
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

  describe('Valid Custom Report Requests', () => {
    it('should return 200 with custom cash flow report', async () => {
      const customReportRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          filters: {
            accountIds: ['550e8400-e29b-41d4-a716-446655440000'],
            categories: ['income', 'expenses']
          },
          metrics: ['totalIncome', 'totalExpenses', 'netCashFlow']
        },
        name: 'Monthly Cash Flow Analysis 2024',
        description: 'Detailed monthly cash flow analysis for the year 2024'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(customReportRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('data');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate name and description
      expect(response.body.name).toBe(customReportRequest.name);
      expect(response.body.description).toBe(customReportRequest.description);

      // Validate generated timestamp
      expect(response.body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Validate data structure (varies by report type)
      expect(typeof response.body.data).toBe('object');
      expect(response.body.data).not.toBeNull();
    });

    it('should support spending analysis custom report', async () => {
      const customReportRequest = {
        reportType: 'spending_analysis',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-06-30',
          groupBy: 'week',
          filters: {
            categoryIds: ['550e8400-e29b-41d4-a716-446655440001'],
            minAmount: 100.00,
            maxAmount: 5000.00
          },
          metrics: ['totalSpent', 'averageTransaction', 'categoryBreakdown']
        },
        name: 'H1 2024 Spending Analysis',
        description: 'First half 2024 spending analysis by categories'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(customReportRequest)
        .expect(200);

      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(response.body.name).toBe(customReportRequest.name);
    });

    it('should support budget performance custom report', async () => {
      const customReportRequest = {
        reportType: 'budget_performance',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          filters: {
            budgetIds: ['550e8400-e29b-41d4-a716-446655440002'],
            performanceThreshold: 0.8
          },
          metrics: ['utilizationRate', 'variance', 'overBudgetCategories']
        },
        name: 'Annual Budget Performance Review'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(customReportRequest)
        .expect(200);

      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(response.body.name).toBe(customReportRequest.name);
    });

    it('should support income analysis custom report', async () => {
      const customReportRequest = {
        reportType: 'income_analysis',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'quarter',
          filters: {
            incomeTypes: ['salary', 'bonus', 'investment'],
            includeRecurring: true
          },
          metrics: ['totalIncome', 'incomeVariance', 'reliability']
        },
        name: 'Quarterly Income Analysis 2024'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(customReportRequest)
        .expect(200);

      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(response.body.name).toBe(customReportRequest.name);
    });

    it('should support custom query report type', async () => {
      const customReportRequest = {
        reportType: 'custom_query',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          filters: {
            customConditions: {
              paymentAmount: { min: 50, max: 1000 },
              transactionType: 'debit',
              excludeTransfers: true
            }
          },
          metrics: ['count', 'sum', 'average', 'trends']
        },
        name: 'Custom Transaction Analysis'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(customReportRequest)
        .expect(200);

      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(response.body.name).toBe(customReportRequest.name);
    });

    it('should handle minimal required fields', async () => {
      const minimalRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(minimalRequest)
        .expect(200);

      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('data');
      // Name and description should be null or empty when not provided
      expect(response.body.name === null || response.body.name === undefined).toBe(true);
    });

    it('should enforce string length limits', async () => {
      const longNameRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        },
        name: 'a'.repeat(255), // Exactly at maximum length
        description: 'a'.repeat(1000) // Exactly at maximum length
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(longNameRequest)
        .expect(200);

      expect(response.body.name).toBe(longNameRequest.name);
      expect(response.body.description).toBe(longNameRequest.description);
    });
  });

  describe('Invalid Custom Report Requests', () => {
    it('should return 400 for missing required reportType', async () => {
      const invalidRequest = {
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for missing required parameters', async () => {
      const invalidRequest = {
        reportType: 'cash_flow'
        // Missing parameters
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid reportType', async () => {
      const invalidRequest = {
        reportType: 'invalid_report_type',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid groupBy values', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'invalid_group_by'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for name exceeding maximum length', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        },
        name: 'a'.repeat(256) // Exceeds maximum length of 255
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for description exceeding maximum length', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        },
        description: 'a'.repeat(1001) // Exceeds maximum length of 1000
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid date formats in parameters', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: 'invalid-date',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for conflicting parameters', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-12-31',
          toDate: '2024-01-01' // fromDate after toDate
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Content-Type and Request Validation', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', mockAccessToken)
        .send('reportType=cash_flow&parameters[fromDate]=2024-01-01')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const validRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const validRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const validRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/custom')
        .set('Authorization', 'Bearer limited-permissions-token')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});