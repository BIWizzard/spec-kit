/**
 * Contract Test: POST /api/reports/scheduled
 * Task: T125 - Scheduled report creation endpoint contract validation
 *
 * This test validates the scheduled report creation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/reports/scheduled', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.scheduledReport.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Scheduled Report Creation Requests', () => {
    it('should return 201 with created scheduled report for cash flow', async () => {
      const createRequest = {
        name: 'Monthly Cash Flow Report',
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          includeProjections: true
        },
        deliverySettings: {
          emailAddresses: ['finance@company.com', 'manager@company.com'],
          format: 'pdf',
          includeCharts: true
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(createRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec (ScheduledReportResponse)
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('reportType');
      expect(response.body).toHaveProperty('frequency');
      expect(response.body).toHaveProperty('isActive');
      expect(response.body).toHaveProperty('lastGenerated');
      expect(response.body).toHaveProperty('nextGeneration');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('parameters');
      expect(response.body).toHaveProperty('deliverySettings');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate data types and formats
      expect(typeof response.body.id).toBe('string');
      expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      expect(response.body.name).toBe(createRequest.name);
      expect(response.body.reportType).toBe(createRequest.reportType);
      expect(response.body.frequency).toBe(createRequest.frequency);

      // New scheduled reports should be active by default
      expect(response.body.isActive).toBe(true);

      // lastGenerated should be null for new reports
      expect(response.body.lastGenerated).toBe(null);

      // nextGeneration should be a future timestamp
      expect(response.body.nextGeneration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const nextGen = new Date(response.body.nextGeneration);
      const now = new Date();
      expect(nextGen.getTime()).toBeGreaterThan(now.getTime());

      // Timestamps should be valid
      expect(response.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Parameters should match request
      expect(response.body.parameters).toEqual(createRequest.parameters);

      // Delivery settings should match request
      expect(response.body.deliverySettings).toEqual(createRequest.deliverySettings);
    });

    it('should support spending analysis scheduled report', async () => {
      const createRequest = {
        name: 'Weekly Spending Analysis',
        reportType: 'spending_analysis',
        frequency: 'weekly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'week',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          includeSubcategories: true
        },
        deliverySettings: {
          emailAddresses: ['user@example.com'],
          format: 'xlsx',
          includeCharts: false
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(createRequest)
        .expect(201);

      expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(response.body.reportType).toBe('spending_analysis');
      expect(response.body.frequency).toBe('weekly');
    });

    it('should support budget performance scheduled report', async () => {
      const createRequest = {
        name: 'Quarterly Budget Review',
        reportType: 'budget_performance',
        frequency: 'quarterly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          budgetCategoryId: '550e8400-e29b-41d4-a716-446655440001'
        },
        deliverySettings: {
          emailAddresses: ['budget@company.com'],
          format: 'pdf',
          includeCharts: true
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(createRequest)
        .expect(201);

      expect(response.body.reportType).toBe('budget_performance');
      expect(response.body.frequency).toBe('quarterly');
    });

    it('should support income analysis scheduled report', async () => {
      const createRequest = {
        name: 'Monthly Income Tracking',
        reportType: 'income_analysis',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          includeAttributions: true
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(createRequest)
        .expect(201);

      expect(response.body.reportType).toBe('income_analysis');
      expect(response.body.frequency).toBe('monthly');
    });

    it('should support monthly summary scheduled report', async () => {
      const createRequest = {
        name: 'Annual Monthly Summaries',
        reportType: 'monthly_summary',
        frequency: 'annually',
        parameters: {
          year: 2024,
          generateForAllMonths: true
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(createRequest)
        .expect(201);

      expect(response.body.reportType).toBe('monthly_summary');
      expect(response.body.frequency).toBe('annually');
    });

    it('should use default delivery settings when not provided', async () => {
      const createRequest = {
        name: 'Simple Cash Flow Report',
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(createRequest)
        .expect(201);

      // Should have default delivery settings
      expect(response.body.deliverySettings).toHaveProperty('format', 'pdf');
      expect(response.body.deliverySettings).toHaveProperty('includeCharts', true);
    });

    it('should validate frequency-based next generation calculation', async () => {
      const frequencies = [
        { freq: 'weekly', expectedDays: 7 },
        { freq: 'monthly', expectedDays: 30 },
        { freq: 'quarterly', expectedDays: 90 },
        { freq: 'annually', expectedDays: 365 }
      ];

      for (const { freq, expectedDays } of frequencies) {
        const createRequest = {
          name: `Test ${freq} Report`,
          reportType: 'cash_flow',
          frequency: freq,
          parameters: {
            fromDate: '2024-01-01',
            toDate: '2024-12-31'
          }
        };

        const response = await request(API_BASE_URL)
          .post('/api/reports/scheduled')
          .set('Authorization', mockAccessToken)
          .send(createRequest)
          .expect(201);

        const nextGen = new Date(response.body.nextGeneration);
        const created = new Date(response.body.createdAt);
        const daysDiff = (nextGen.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

        // Allow some flexibility in the calculation (±2 days)
        expect(Math.abs(daysDiff - expectedDays)).toBeLessThan(2);
      }
    });

    it('should handle complex parameters and delivery settings', async () => {
      const createRequest = {
        name: 'Complex Scheduled Report',
        reportType: 'spending_analysis',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'month',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          includeSubcategories: true,
          filters: {
            minAmount: 100.00,
            maxAmount: 5000.00,
            excludeTransfers: true
          }
        },
        deliverySettings: {
          emailAddresses: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
          format: 'xlsx',
          includeCharts: false,
          customSubject: 'Monthly Spending Report',
          attachmentName: 'spending_report_{date}.xlsx'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(createRequest)
        .expect(201);

      expect(response.body.parameters).toEqual(createRequest.parameters);
      expect(response.body.deliverySettings).toEqual(createRequest.deliverySettings);
    });
  });

  describe('Invalid Scheduled Report Creation Requests', () => {
    it('should return 400 for missing required name', async () => {
      const invalidRequest = {
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for missing required reportType', async () => {
      const invalidRequest = {
        name: 'Test Report',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for missing required frequency', async () => {
      const invalidRequest = {
        name: 'Test Report',
        reportType: 'cash_flow',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for missing required parameters', async () => {
      const invalidRequest = {
        name: 'Test Report',
        reportType: 'cash_flow',
        frequency: 'monthly'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid reportType', async () => {
      const invalidRequest = {
        name: 'Test Report',
        reportType: 'invalid_report_type',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid frequency', async () => {
      const invalidRequest = {
        name: 'Test Report',
        reportType: 'cash_flow',
        frequency: 'invalid_frequency',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for name below minimum length', async () => {
      const invalidRequest = {
        name: '', // Empty string
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for name exceeding maximum length', async () => {
      const invalidRequest = {
        name: 'a'.repeat(256), // Exceeds maximum length of 255
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid email format in delivery settings', async () => {
      const invalidRequest = {
        name: 'Test Report',
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        },
        deliverySettings: {
          emailAddresses: ['valid@example.com', 'invalid-email-format'],
          format: 'pdf'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid delivery format', async () => {
      const invalidRequest = {
        name: 'Test Report',
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        },
        deliverySettings: {
          emailAddresses: ['user@example.com'],
          format: 'invalid_format'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid parameters for report type', async () => {
      const invalidRequest = {
        name: 'Test Report',
        reportType: 'monthly_summary',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01', // Wrong parameters for monthly_summary
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
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
        .post('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .send('name=Test&reportType=cash_flow&frequency=monthly')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const validRequest = {
        name: 'Test Report',
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const validRequest = {
        name: 'Test Report',
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const validRequest = {
        name: 'Test Report',
        reportType: 'cash_flow',
        frequency: 'monthly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/reports/scheduled')
        .set('Authorization', 'Bearer limited-permissions-token')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});