/**
 * Contract Test: GET /api/reports/scheduled/{reportId}
 * Task: T126 - Scheduled report details endpoint contract validation
 *
 * This test validates the scheduled report details API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/scheduled/{reportId}', () => {
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

  describe('Valid Scheduled Report Details Requests', () => {
    it('should return 200 with scheduled report details', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per ScheduledReportDetailResponse schema
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
      expect(response.body).toHaveProperty('generationHistory');

      // Validate data types and formats
      expect(typeof response.body.id).toBe('string');
      expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      expect(typeof response.body.name).toBe('string');
      expect(typeof response.body.reportType).toBe('string');
      expect(typeof response.body.frequency).toBe('string');
      expect(typeof response.body.isActive).toBe('boolean');
      expect(typeof response.body.createdAt).toBe('string');
      expect(typeof response.body.nextGeneration).toBe('string');
      expect(typeof response.body.updatedAt).toBe('string');

      // Validate frequency enum
      expect(['weekly', 'monthly', 'quarterly', 'annually']).toContain(response.body.frequency);

      // Validate timestamp formats
      expect(response.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.nextGeneration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // lastGenerated can be null
      if (response.body.lastGenerated !== null) {
        expect(typeof response.body.lastGenerated).toBe('string');
        expect(response.body.lastGenerated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }

      // Validate parameters and deliverySettings are objects
      expect(typeof response.body.parameters).toBe('object');
      expect(response.body.parameters).not.toBeNull();
      expect(typeof response.body.deliverySettings).toBe('object');
      expect(response.body.deliverySettings).not.toBeNull();

      // Validate generation history array
      expect(Array.isArray(response.body.generationHistory)).toBe(true);

      if (response.body.generationHistory.length > 0) {
        const historyItem = response.body.generationHistory[0];
        expect(historyItem).toHaveProperty('generatedAt');
        expect(historyItem).toHaveProperty('status');
        expect(historyItem).toHaveProperty('downloadUrl');
        expect(historyItem).toHaveProperty('error');

        expect(typeof historyItem.generatedAt).toBe('string');
        expect(historyItem.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        expect(['success', 'failed']).toContain(historyItem.status);

        // downloadUrl can be null
        if (historyItem.downloadUrl !== null) {
          expect(typeof historyItem.downloadUrl).toBe('string');
          expect(historyItem.downloadUrl).toMatch(/^https?:\/\//);
        }

        // error can be null (should be null for successful generations)
        if (historyItem.error !== null) {
          expect(typeof historyItem.error).toBe('string');
        }
      }
    });

    it('should return complete parameters for cash flow report', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.reportType === 'cash_flow') {
        const { parameters } = response.body;
        expect(parameters).toHaveProperty('fromDate');
        expect(parameters).toHaveProperty('toDate');

        if (parameters.groupBy) {
          expect(['day', 'week', 'month', 'quarter', 'year']).toContain(parameters.groupBy);
        }

        if (parameters.includeProjections !== undefined) {
          expect(typeof parameters.includeProjections).toBe('boolean');
        }
      }
    });

    it('should return delivery settings with all fields', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      const { deliverySettings } = response.body;

      if (deliverySettings.emailAddresses) {
        expect(Array.isArray(deliverySettings.emailAddresses)).toBe(true);
        deliverySettings.emailAddresses.forEach(email => {
          expect(typeof email).toBe('string');
          expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });
      }

      if (deliverySettings.format) {
        expect(['pdf', 'xlsx']).toContain(deliverySettings.format);
      }

      if (deliverySettings.includeCharts !== undefined) {
        expect(typeof deliverySettings.includeCharts).toBe('boolean');
      }
    });

    it('should return generation history in chronological order', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.generationHistory.length > 1) {
        const history = response.body.generationHistory;

        // Should be ordered by generatedAt descending (most recent first)
        for (let i = 1; i < history.length; i++) {
          const prevTime = new Date(history[i - 1].generatedAt);
          const currentTime = new Date(history[i].generatedAt);
          expect(prevTime.getTime()).toBeGreaterThanOrEqual(currentTime.getTime());
        }
      }
    });

    it('should validate successful generation history entries', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      const successfulGenerations = response.body.generationHistory.filter(h => h.status === 'success');

      successfulGenerations.forEach(generation => {
        // Successful generations should have downloadUrl and no error
        expect(generation.downloadUrl).not.toBe(null);
        expect(generation.error).toBe(null);
      });
    });

    it('should validate failed generation history entries', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      const failedGenerations = response.body.generationHistory.filter(h => h.status === 'failed');

      failedGenerations.forEach(generation => {
        // Failed generations should have error message and no downloadUrl
        expect(generation.error).not.toBe(null);
        expect(generation.downloadUrl).toBe(null);
        expect(typeof generation.error).toBe('string');
        expect(generation.error.length).toBeGreaterThan(0);
      });
    });

    it('should handle reports with no generation history', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      // New reports might have empty generation history
      expect(Array.isArray(response.body.generationHistory)).toBe(true);

      if (response.body.generationHistory.length === 0) {
        // lastGenerated should be null if no history
        expect(response.body.lastGenerated).toBe(null);
      }
    });

    it('should validate consistency between lastGenerated and generation history', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.lastGenerated && response.body.generationHistory.length > 0) {
        const mostRecentGeneration = response.body.generationHistory[0];
        expect(response.body.lastGenerated).toBe(mostRecentGeneration.generatedAt);
      }
    });

    it('should validate timestamp relationships', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      const createdAt = new Date(response.body.createdAt);
      const updatedAt = new Date(response.body.updatedAt);
      const nextGeneration = new Date(response.body.nextGeneration);

      // updatedAt should be >= createdAt
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());

      // nextGeneration should be after createdAt
      expect(nextGeneration.getTime()).toBeGreaterThan(createdAt.getTime());

      // If lastGenerated exists, it should be after createdAt
      if (response.body.lastGenerated) {
        const lastGenerated = new Date(response.body.lastGenerated);
        expect(lastGenerated.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
      }
    });
  });

  describe('Invalid Scheduled Report Details Requests', () => {
    it('should return 404 for non-existent report ID', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099';

      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${nonExistentId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid-format';

      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${invalidId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for malformed UUID', async () => {
      const malformedId = '550e8400-e29b-41d4-a716-44665544000'; // Missing digit

      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${malformedId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for empty reportId', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled/')
        .set('Authorization', mockAccessToken)
        .expect(404); // Should be treated as different endpoint

      // This should hit the list endpoint or return 404
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', 'Bearer limited-permissions-token')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for accessing another family\'s scheduled report', async () => {
      const otherFamilyReportId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${otherFamilyReportId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});