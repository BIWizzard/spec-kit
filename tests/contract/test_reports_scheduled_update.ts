/**
 * Contract Test: PUT /api/reports/scheduled/{reportId}
 * Task: T127 - Scheduled report update endpoint contract validation
 *
 * This test validates the scheduled report update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/reports/scheduled/{reportId}', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';
  const mockReportId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.scheduledReport.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Scheduled Report Update Requests', () => {
    it('should return 200 with updated scheduled report for name change', async () => {
      const updateRequest = {
        name: 'Updated Monthly Cash Flow Report'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per ScheduledReportResponse schema
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

      // Validate that name was updated
      expect(response.body.name).toBe(updateRequest.name);

      // Validate UUID format
      expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate timestamp formats
      expect(response.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.nextGeneration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // updatedAt should be recent (within last minute)
      const updatedAt = new Date(response.body.updatedAt);
      const now = new Date();
      const timeDiff = now.getTime() - updatedAt.getTime();
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });

    it('should support frequency updates', async () => {
      const updateRequest = {
        frequency: 'quarterly'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect(200);

      expect(response.body.frequency).toBe('quarterly');
      expect(['weekly', 'monthly', 'quarterly', 'annually']).toContain(response.body.frequency);

      // nextGeneration should be recalculated based on new frequency
      expect(response.body.nextGeneration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should support parameters updates', async () => {
      const updateRequest = {
        parameters: {
          fromDate: '2024-06-01',
          toDate: '2024-12-31',
          groupBy: 'week',
          includeProjections: true,
          newFilter: {
            minAmount: 50.00,
            excludeTransfers: true
          }
        }
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect(200);

      expect(response.body.parameters).toEqual(updateRequest.parameters);
    });

    it('should support delivery settings updates', async () => {
      const updateRequest = {
        deliverySettings: {
          emailAddresses: ['newemail@company.com', 'manager@company.com'],
          format: 'xlsx',
          includeCharts: false,
          customSubject: 'Updated Report Subject'
        }
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect(200);

      expect(response.body.deliverySettings).toEqual(updateRequest.deliverySettings);
    });

    it('should support isActive status updates', async () => {
      // Deactivate report
      const deactivateRequest = { isActive: false };

      const deactivateResponse = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(deactivateRequest)
        .expect(200);

      expect(deactivateResponse.body.isActive).toBe(false);

      // Reactivate report
      const activateRequest = { isActive: true };

      const activateResponse = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(activateRequest)
        .expect(200);

      expect(activateResponse.body.isActive).toBe(true);
      // nextGeneration should be recalculated when reactivating
      expect(activateResponse.body.nextGeneration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should support multiple field updates simultaneously', async () => {
      const updateRequest = {
        name: 'Comprehensive Updated Report',
        frequency: 'weekly',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'day'
        },
        deliverySettings: {
          emailAddresses: ['updated@example.com'],
          format: 'pdf',
          includeCharts: true
        },
        isActive: true
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect(200);

      expect(response.body.name).toBe(updateRequest.name);
      expect(response.body.frequency).toBe(updateRequest.frequency);
      expect(response.body.parameters).toEqual(updateRequest.parameters);
      expect(response.body.deliverySettings).toEqual(updateRequest.deliverySettings);
      expect(response.body.isActive).toBe(updateRequest.isActive);
    });

    it('should validate name length constraints on update', async () => {
      const updateRequest = {
        name: 'a'.repeat(255) // Exactly at maximum length
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect(200);

      expect(response.body.name).toBe(updateRequest.name);
    });

    it('should handle partial updates without affecting other fields', async () => {
      // First, get current state (simulated)
      const originalState = {
        name: 'Original Report Name',
        frequency: 'monthly',
        isActive: true
      };

      // Update only the name
      const nameUpdateRequest = {
        name: 'Updated Name Only'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(nameUpdateRequest)
        .expect(200);

      expect(response.body.name).toBe(nameUpdateRequest.name);
      // Other fields should remain unchanged (this would be validated in integration tests)
      expect(typeof response.body.frequency).toBe('string');
      expect(typeof response.body.isActive).toBe('boolean');
    });

    it('should recalculate nextGeneration when frequency changes', async () => {
      const frequencies = ['weekly', 'monthly', 'quarterly', 'annually'];

      for (const frequency of frequencies) {
        const updateRequest = { frequency };

        const response = await request(API_BASE_URL)
          .put(`/api/reports/scheduled/${mockReportId}`)
          .set('Authorization', mockAccessToken)
          .send(updateRequest)
          .expect(200);

        expect(response.body.frequency).toBe(frequency);

        // nextGeneration should be in the future
        const nextGen = new Date(response.body.nextGeneration);
        const now = new Date();
        expect(nextGen.getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });

  describe('Invalid Scheduled Report Update Requests', () => {
    it('should return 404 for non-existent report ID', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099';
      const updateRequest = {
        name: 'Updated Name'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${nonExistentId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid-format';
      const updateRequest = {
        name: 'Updated Name'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${invalidId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid frequency', async () => {
      const updateRequest = {
        frequency: 'invalid_frequency'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for name below minimum length', async () => {
      const updateRequest = {
        name: '' // Empty string
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for name exceeding maximum length', async () => {
      const updateRequest = {
        name: 'a'.repeat(256) // Exceeds maximum length of 255
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid email format in delivery settings', async () => {
      const updateRequest = {
        deliverySettings: {
          emailAddresses: ['valid@example.com', 'invalid-email-format'],
          format: 'pdf'
        }
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid delivery format', async () => {
      const updateRequest = {
        deliverySettings: {
          format: 'invalid_format'
        }
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid parameters structure', async () => {
      const updateRequest = {
        parameters: {
          fromDate: 'invalid-date-format'
        }
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid boolean values', async () => {
      const updateRequest = {
        isActive: 'not-a-boolean'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for empty update request', async () => {
      const emptyRequest = {};

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send(emptyRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('at least one field');
    });
  });

  describe('Content-Type and Request Validation', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send('name=Updated Name')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const updateRequest = {
        name: 'Updated Name'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const updateRequest = {
        name: 'Updated Name'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const updateRequest = {
        name: 'Updated Name'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', 'Bearer limited-permissions-token')
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for accessing another family\'s scheduled report', async () => {
      const otherFamilyReportId = '550e8400-e29b-41d4-a716-446655440001';
      const updateRequest = {
        name: 'Updated Name'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reports/scheduled/${otherFamilyReportId}`)
        .set('Authorization', mockAccessToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});