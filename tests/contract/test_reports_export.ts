/**
 * Contract Test: POST /api/reports/export
 * Task: T123 - Report export endpoint contract validation
 *
 * This test validates the report export API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/reports/export', () => {
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

  describe('Valid Report Export Requests', () => {
    it('should return 200 for CSV export request', async () => {
      const exportRequest = {
        reportType: 'cash_flow',
        format: 'csv',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month'
        },
        includeCharts: false // CSV doesn't support charts
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(exportRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('exportId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('downloadUrl');
      expect(response.body).toHaveProperty('estimatedCompletionTime');
      expect(response.body).toHaveProperty('expiresAt');

      // Validate export ID format
      expect(typeof response.body.exportId).toBe('string');
      expect(response.body.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate status enum
      expect(['pending', 'processing', 'completed', 'failed']).toContain(response.body.status);

      // Download URL can be null if not ready yet
      if (response.body.downloadUrl !== null) {
        expect(typeof response.body.downloadUrl).toBe('string');
        expect(response.body.downloadUrl).toMatch(/^https?:\/\//);
      }

      // Validate timestamp formats
      expect(response.body.estimatedCompletionTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return 200 for Excel export request', async () => {
      const exportRequest = {
        reportType: 'spending_analysis',
        format: 'xlsx',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-06-30',
          groupBy: 'week',
          categoryId: '550e8400-e29b-41d4-a716-446655440000'
        },
        includeCharts: true
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(exportRequest)
        .expect(200);

      expect(response.body.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(['pending', 'processing', 'completed', 'failed']).toContain(response.body.status);
    });

    it('should return 200 for PDF export request with charts', async () => {
      const exportRequest = {
        reportType: 'budget_performance',
        format: 'pdf',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          budgetCategoryId: '550e8400-e29b-41d4-a716-446655440001'
        },
        includeCharts: true,
        email: 'user@example.com'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(exportRequest)
        .expect(200);

      expect(response.body.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(['pending', 'processing', 'completed', 'failed']).toContain(response.body.status);
    });

    it('should support all valid report types', async () => {
      const reportTypes = ['cash_flow', 'spending_analysis', 'budget_performance', 'income_analysis', 'monthly_summary', 'annual_summary'];

      for (const reportType of reportTypes) {
        const exportRequest = {
          reportType,
          format: 'csv',
          parameters: reportType === 'monthly_summary'
            ? { year: 2024, month: 6 }
            : reportType === 'annual_summary'
            ? { year: 2024 }
            : {
                fromDate: '2024-01-01',
                toDate: '2024-12-31'
              }
        };

        const response = await request(API_BASE_URL)
          .post('/api/reports/export')
          .set('Authorization', mockAccessToken)
          .send(exportRequest)
          .expect(200);

        expect(response.body.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it('should support all valid export formats', async () => {
      const formats = ['csv', 'xlsx', 'pdf'];

      for (const format of formats) {
        const exportRequest = {
          reportType: 'cash_flow',
          format,
          parameters: {
            fromDate: '2024-01-01',
            toDate: '2024-12-31'
          },
          includeCharts: format === 'pdf' // Only PDF supports charts meaningfully
        };

        const response = await request(API_BASE_URL)
          .post('/api/reports/export')
          .set('Authorization', mockAccessToken)
          .send(exportRequest)
          .expect(200);

        expect(response.body.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it('should use default values for optional parameters', async () => {
      const minimalRequest = {
        reportType: 'cash_flow',
        format: 'csv',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(minimalRequest)
        .expect(200);

      expect(response.body.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      // Default includeCharts should be true
    });

    it('should handle email delivery option', async () => {
      const exportRequestWithEmail = {
        reportType: 'income_analysis',
        format: 'pdf',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'quarter'
        },
        includeCharts: true,
        email: 'finance@company.com'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(exportRequestWithEmail)
        .expect(200);

      expect(response.body.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should handle complex parameters for different report types', async () => {
      const complexRequest = {
        reportType: 'spending_analysis',
        format: 'xlsx',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          includeSubcategories: true,
          filters: {
            minAmount: 100,
            merchants: ['Amazon', 'Walmart'],
            paymentMethods: ['credit_card', 'debit_card']
          }
        },
        includeCharts: true
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(complexRequest)
        .expect(200);

      expect(response.body.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('Invalid Report Export Requests', () => {
    it('should return 400 for missing required reportType', async () => {
      const invalidRequest = {
        format: 'csv',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for missing required format', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for missing required parameters', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        format: 'csv'
        // Missing parameters
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid reportType', async () => {
      const invalidRequest = {
        reportType: 'invalid_report_type',
        format: 'csv',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid format', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        format: 'invalid_format',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        format: 'pdf',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        },
        email: 'invalid-email-format'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid parameters structure', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        format: 'csv',
        parameters: {
          fromDate: 'invalid-date',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for charts with incompatible format', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        format: 'csv', // CSV doesn't support charts
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        },
        includeCharts: true
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('charts');
    });

    it('should return 400 for wrong parameters for report type', async () => {
      const invalidRequest = {
        reportType: 'monthly_summary',
        format: 'csv',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
          // Missing required year and month for monthly_summary
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
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
        .post('/api/reports/export')
        .set('Authorization', mockAccessToken)
        .send('reportType=cash_flow&format=csv')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const validRequest = {
        reportType: 'cash_flow',
        format: 'csv',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const validRequest = {
        reportType: 'cash_flow',
        format: 'csv',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const validRequest = {
        reportType: 'cash_flow',
        format: 'csv',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/export')
        .set('Authorization', 'Bearer limited-permissions-token')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});