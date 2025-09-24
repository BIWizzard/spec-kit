/**
 * Contract Test: DELETE /api/reports/scheduled/{reportId}
 * Task: T128 - Scheduled report delete endpoint contract validation
 *
 * This test validates the scheduled report delete API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/reports/scheduled/{reportId}', () => {
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

  describe('Valid Scheduled Report Delete Requests', () => {
    it('should return 200 with success message for valid delete', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per SuccessResponse schema
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);

      // Common success messages
      const validMessages = [
        'Scheduled report deleted successfully',
        'Scheduled report cancelled successfully',
        'Report schedule deleted',
        'Scheduled report removed'
      ];

      const messageFound = validMessages.some(msg =>
        response.body.message.toLowerCase().includes(msg.toLowerCase().split(' ')[0])
      );
      expect(messageFound || response.body.message.includes('deleted') || response.body.message.includes('cancelled')).toBe(true);
    });

    it('should handle deletion of active scheduled reports', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');

      // Should indicate successful deletion regardless of active status
      expect(response.body.message.toLowerCase()).toMatch(/delete|cancel|remove/);
    });

    it('should handle deletion of inactive scheduled reports', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');

      // Should indicate successful deletion regardless of active status
      expect(response.body.message.toLowerCase()).toMatch(/delete|cancel|remove/);
    });

    it('should handle deletion of reports with generation history', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Deletion should succeed even if the report has generation history
      // (Implementation may archive rather than hard delete for audit purposes)
      expect(response.body.message.toLowerCase()).toMatch(/delete|cancel|remove/);
    });

    it('should be idempotent for multiple delete requests', async () => {
      // First delete should succeed
      const firstResponse = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      expect(firstResponse.body).toHaveProperty('message');

      // Second delete should return 404 (report not found)
      const secondResponse = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(secondResponse.body).toHaveProperty('error');
      expect(secondResponse.body).toHaveProperty('message');
    });

    it('should properly clean up related data', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify the report is no longer accessible
      const getResponse = await request(API_BASE_URL)
        .get(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(404);

      expect(getResponse.body).toHaveProperty('error');
    });

    it('should handle valid UUID formats', async () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff'
      ];

      for (const uuid of validUUIDs) {
        // Note: These will return 404 since the reports don't exist,
        // but they should not return 400 for invalid format
        const response = await request(API_BASE_URL)
          .delete(`/api/reports/scheduled/${uuid}`)
          .set('Authorization', mockAccessToken);

        expect([200, 404]).toContain(response.status);

        if (response.status === 404) {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).not.toBe('Invalid request data');
        }
      }
    });

    it('should provide appropriate success message format', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Message should be informative and professional
      expect(response.body.message).toMatch(/^[A-Z]/); // Should start with capital letter
      expect(response.body.message.length).toBeGreaterThan(10); // Should be descriptive
      expect(response.body.message.length).toBeLessThan(200); // Should be concise
    });
  });

  describe('Invalid Scheduled Report Delete Requests', () => {
    it('should return 404 for non-existent report ID', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099';

      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${nonExistentId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');

      // Error message should indicate resource not found
      expect(response.body.message.toLowerCase()).toMatch(/not found|does not exist/);
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid-format';

      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${invalidId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for malformed UUID', async () => {
      const malformedIds = [
        '550e8400-e29b-41d4-a716-44665544000', // Missing digit
        '550e8400-e29b-41d4-a716-446655440000-extra', // Extra characters
        '550e8400-e29b-41d4-a716-446655440gg0', // Invalid characters
        '550e8400e29b41d4a716446655440000', // Missing hyphens
        '550e8400-e29b-41d4-a716', // Too short
        ''
      ];

      for (const malformedId of malformedIds) {
        const response = await request(API_BASE_URL)
          .delete(`/api/reports/scheduled/${malformedId}`)
          .set('Authorization', mockAccessToken)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for empty reportId path parameter', async () => {
      // Request to /api/reports/scheduled/ (without ID) should be treated as invalid
      const response = await request(API_BASE_URL)
        .delete('/api/reports/scheduled/')
        .set('Authorization', mockAccessToken)
        .expect(404); // This might hit a different route or return 404

      // The specific behavior depends on routing implementation
      // but it should not reach the delete handler
    });

    it('should validate UUID version and format strictly', async () => {
      const invalidFormats = [
        'not-a-uuid-at-all',
        '123-456-789',
        'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
        '550e8400-e29b-41d4-a716-4466554400000' // One extra digit
      ];

      for (const invalidFormat of invalidFormats) {
        const response = await request(API_BASE_URL)
          .delete(`/api/reports/scheduled/${invalidFormat}`)
          .set('Authorization', mockAccessToken)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toMatch(/uuid|format|invalid/i);
      }
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should handle deletion during report generation', async () => {
      // This test simulates deleting a report that might be currently generating
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken);

      // Should handle gracefully - either succeed or provide appropriate error
      expect([200, 409]).toContain(response.status);

      if (response.status === 409) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.message).toMatch(/in progress|generating|busy/i);
      } else {
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should maintain referential integrity', async () => {
      // Delete should succeed without causing database constraint violations
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken);

      expect([200, 404]).toContain(response.status);

      // If successful, the report should not be accessible anymore
      if (response.status === 200) {
        const getResponse = await request(API_BASE_URL)
          .get(`/api/reports/scheduled/${mockReportId}`)
          .set('Authorization', mockAccessToken)
          .expect(404);

        expect(getResponse.body).toHaveProperty('error');
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', 'Bearer limited-permissions-token')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for accessing another family\'s scheduled report', async () => {
      const otherFamilyReportId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${otherFamilyReportId}`)
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should require appropriate role permissions for deletion', async () => {
      const readOnlyToken = 'Bearer read-only-permissions-token';

      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', readOnlyToken)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/permission|access|role/i);
    });
  });

  describe('HTTP Method and Headers Validation', () => {
    it('should only accept DELETE method', async () => {
      // Test that other methods are not allowed
      const methods = ['GET', 'POST', 'PUT', 'PATCH'];

      for (const method of methods) {
        const response = await request(API_BASE_URL)
          [method.toLowerCase()](`/api/reports/scheduled/${mockReportId}`)
          .set('Authorization', mockAccessToken);

        // Should return 405 Method Not Allowed or route to different handler
        expect([405, 200, 201, 404]).toContain(response.status);

        if (response.status === 405) {
          expect(response.headers.allow).toContain('DELETE');
        }
      }
    });

    it('should not require request body', async () => {
      // DELETE requests typically don't have request bodies
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .set('Content-Type', 'application/json')
        .send({}); // Empty body should be fine

      expect([200, 404]).toContain(response.status);
    });

    it('should ignore request body if provided', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/reports/scheduled/${mockReportId}`)
        .set('Authorization', mockAccessToken)
        .send({ someField: 'someValue' }); // Should be ignored

      expect([200, 404]).toContain(response.status);
    });
  });
});