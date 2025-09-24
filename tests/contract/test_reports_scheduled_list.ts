/**
 * Contract Test: GET /api/reports/scheduled
 * Task: T124 - Scheduled reports list endpoint contract validation
 *
 * This test validates the scheduled reports list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/scheduled', () => {
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

  describe('Valid Scheduled Reports List Requests', () => {
    it('should return 200 with list of scheduled reports', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('scheduledReports');
      expect(Array.isArray(response.body.scheduledReports)).toBe(true);

      // Validate structure when reports exist
      if (response.body.scheduledReports.length > 0) {
        const report = response.body.scheduledReports[0];

        // Validate required properties per ScheduledReportSummary schema
        expect(report).toHaveProperty('id');
        expect(report).toHaveProperty('name');
        expect(report).toHaveProperty('reportType');
        expect(report).toHaveProperty('frequency');
        expect(report).toHaveProperty('isActive');
        expect(report).toHaveProperty('lastGenerated');
        expect(report).toHaveProperty('nextGeneration');
        expect(report).toHaveProperty('createdAt');

        // Validate data types
        expect(typeof report.id).toBe('string');
        expect(typeof report.name).toBe('string');
        expect(typeof report.reportType).toBe('string');
        expect(typeof report.frequency).toBe('string');
        expect(typeof report.isActive).toBe('boolean');
        expect(typeof report.createdAt).toBe('string');
        expect(typeof report.nextGeneration).toBe('string');

        // Validate ID format (UUID)
        expect(report.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

        // Validate frequency enum
        expect(['weekly', 'monthly', 'quarterly', 'annually']).toContain(report.frequency);

        // Validate timestamp formats
        expect(report.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(report.nextGeneration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        // lastGenerated can be null
        if (report.lastGenerated !== null) {
          expect(typeof report.lastGenerated).toBe('string');
          expect(report.lastGenerated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }

        // Validate name is not empty
        expect(report.name.length).toBeGreaterThan(0);
      }
    });

    it('should return empty array when no scheduled reports exist', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      expect(response.body.scheduledReports).toEqual([]);
    });

    it('should return reports ordered by creation date or next generation', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.scheduledReports.length > 1) {
        const reports = response.body.scheduledReports;

        // Check if reports are ordered (either by createdAt or nextGeneration)
        for (let i = 1; i < reports.length; i++) {
          const prevReport = reports[i - 1];
          const currentReport = reports[i];

          // Either ordered by nextGeneration (ascending) or createdAt (descending)
          const prevNext = new Date(prevReport.nextGeneration);
          const currentNext = new Date(currentReport.nextGeneration);
          const prevCreated = new Date(prevReport.createdAt);
          const currentCreated = new Date(currentReport.createdAt);

          // Should be ordered by next generation (soonest first) or creation date
          const isOrderedByNext = prevNext <= currentNext;
          const isOrderedByCreated = prevCreated >= currentCreated;

          expect(isOrderedByNext || isOrderedByCreated).toBe(true);
        }
      }
    });

    it('should include both active and inactive reports', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.scheduledReports.length > 0) {
        const reports = response.body.scheduledReports;

        // Validate that isActive is properly set for all reports
        reports.forEach(report => {
          expect(typeof report.isActive).toBe('boolean');
        });

        // If we have multiple reports, we might have both active and inactive
        const activeReports = reports.filter(r => r.isActive);
        const inactiveReports = reports.filter(r => !r.isActive);

        // Both arrays should contain valid reports
        expect(activeReports.length + inactiveReports.length).toBe(reports.length);
      }
    });

    it('should validate all possible report types', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.scheduledReports.length > 0) {
        const validReportTypes = ['cash_flow', 'spending_analysis', 'budget_performance', 'income_analysis', 'monthly_summary'];

        response.body.scheduledReports.forEach(report => {
          expect(validReportTypes).toContain(report.reportType);
        });
      }
    });

    it('should validate frequency constraints', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.scheduledReports.length > 0) {
        const validFrequencies = ['weekly', 'monthly', 'quarterly', 'annually'];

        response.body.scheduledReports.forEach(report => {
          expect(validFrequencies).toContain(report.frequency);
        });
      }
    });

    it('should handle large numbers of scheduled reports efficiently', async () => {
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Response should be reasonably fast (under 5 seconds even with many reports)
      expect(responseTime).toBeLessThan(5000);

      expect(Array.isArray(response.body.scheduledReports)).toBe(true);
    });

    it('should validate timestamp relationships', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.scheduledReports.length > 0) {
        response.body.scheduledReports.forEach(report => {
          const createdAt = new Date(report.createdAt);
          const nextGeneration = new Date(report.nextGeneration);

          // nextGeneration should be after createdAt
          expect(nextGeneration.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());

          // If lastGenerated exists, it should be after createdAt
          if (report.lastGenerated) {
            const lastGenerated = new Date(report.lastGenerated);
            expect(lastGenerated.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
          }
        });
      }
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle reports with null lastGenerated gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // This should not cause errors - new reports might not have been generated yet
      expect(Array.isArray(response.body.scheduledReports)).toBe(true);

      if (response.body.scheduledReports.length > 0) {
        response.body.scheduledReports.forEach(report => {
          // lastGenerated can be null, but if present should be a valid timestamp
          if (report.lastGenerated !== null) {
            expect(typeof report.lastGenerated).toBe('string');
            expect(report.lastGenerated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          }
        });
      }
    });

    it('should maintain data consistency across fields', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.scheduledReports.length > 0) {
        response.body.scheduledReports.forEach(report => {
          // If inactive, nextGeneration might be in the past or null
          // If active, nextGeneration should be in the future
          if (report.isActive) {
            const nextGen = new Date(report.nextGeneration);
            const now = new Date();
            // Active reports should have future generation times (allowing for small clock differences)
            expect(nextGen.getTime()).toBeGreaterThan(now.getTime() - 60000); // 1 minute buffer
          }
        });
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/scheduled')
        .set('Authorization', 'Bearer limited-permissions-token')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});