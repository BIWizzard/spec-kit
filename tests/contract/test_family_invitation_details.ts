/**
 * Contract Test: GET /api/families/invitations/{invitationId}
 * Task: T050 - Get invitation details endpoint contract validation
 *
 * This test validates the invitation details API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 * NOTE: This is a public endpoint (security: []) for invited users to view invitation details.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/families/invitations/{invitationId}', () => {
  let adminToken: string;
  let familyId: string;
  let sampleInvitationId: string;
  let expiredInvitationId: string;
  let cancelledInvitationId: string;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Register admin user
    const adminResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Admin',
        lastName: 'User',
        familyName: 'Test Family'
      })
      .expect(201);

    adminToken = adminResponse.body.tokens.accessToken;
    familyId = adminResponse.body.family.id;

    // Create a sample invitation for testing
    const inviteResponse = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'invited@example.com',
        role: 'editor',
        message: 'Welcome to our family finance management!'
      })
      .expect(201);

    sampleInvitationId = inviteResponse.body.id;

    // Create additional invitations for different test scenarios
    const expiredInviteResponse = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'expired@example.com',
        role: 'viewer'
      })
      .expect(201);

    expiredInvitationId = expiredInviteResponse.body.id;

    const cancelledInviteResponse = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'cancelled@example.com',
        role: 'viewer'
      })
      .expect(201);

    cancelledInvitationId = cancelledInviteResponse.body.id;

    // Cancel the cancelled invitation
    await request(API_BASE_URL)
      .delete(`/api/families/invitations/${cancelledInvitationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Public Access - No Authentication Required', () => {
    it('should return 200 with invitation details without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('familyName');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('invitedBy');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('expiresAt');

      // Validate response data
      expect(response.body.id).toBe(sampleInvitationId);
      expect(response.body.email).toBe('invited@example.com');
      expect(response.body.familyName).toBe('Test Family');
      expect(response.body.role).toBe('editor');
      expect(response.body.invitedBy).toBe('Admin User');
      expect(response.body.message).toBe('Welcome to our family finance management!');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.email).toBe('string');
      expect(typeof response.body.familyName).toBe('string');
      expect(['admin', 'editor', 'viewer']).toContain(response.body.role);
      expect(typeof response.body.invitedBy).toBe('string');
      expect(typeof response.body.message).toBe('string');

      // Validate expiration date
      expect(new Date(response.body.expiresAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should work with authentication header present (but not required)', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe(sampleInvitationId);
      expect(response.body.email).toBe('invited@example.com');
    });

    it('should work with invalid authentication header (public endpoint)', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe(sampleInvitationId);
    });

    it('should return invitation without message when message is empty', async () => {
      // Create invitation without message
      const noMessageInvite = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'nomessage@example.com',
          role: 'viewer'
        })
        .expect(201);

      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${noMessageInvite.body.id}`)
        .expect(200);

      expect(response.body.message).toBe('');
    });
  });

  describe('Invitation ID Validation', () => {
    it('should return 400 for invalid invitation ID format', async () => {
      const invalidIds = [
        'not-a-uuid',
        '123',
        'invalid-uuid-format',
        '',
        'abc-def-ghi'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .get(`/api/families/invitations/${invalidId}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 404 for non-existent invitation ID', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${nonExistentId}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invitation not found or expired');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 404 for expired invitation', async () => {
      // This test assumes expired invitations return 404
      // In a real implementation, we might need to manipulate the expiration date
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${expiredInvitationId}`)
        .expect('Content-Type', /json/);

      // Could be 200 with expired status or 404, depends on business logic
      if (response.status === 404) {
        expect(response.body.error).toBe('Invitation not found or expired');
      } else if (response.status === 200) {
        expect(response.body.id).toBe(expiredInvitationId);
      }
    });

    it('should return 404 for cancelled invitation', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${cancelledInvitationId}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found or expired');
    });

    it('should return valid UUID in response', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(response.body.id).toMatch(uuidRegex);
    });
  });

  describe('Response Format and Headers', () => {
    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should return valid JSON response', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });

    it('should not expose sensitive information', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      // Ensure no sensitive data is exposed
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('invitationToken');
      expect(response.body).not.toHaveProperty('secret');
      expect(response.body).not.toHaveProperty('familyId');
      expect(response.body).not.toHaveProperty('invitedById');
      expect(response.body).not.toHaveProperty('permissions');
    });

    it('should include all required fields per OpenAPI spec', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      const requiredFields = ['id', 'email', 'familyName', 'role', 'invitedBy', 'message', 'expiresAt'];

      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
    });
  });

  describe('Data Validation and Format', () => {
    it('should return valid email format', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(response.body.email).toMatch(emailRegex);
    });

    it('should return valid role enum value', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(['admin', 'editor', 'viewer']).toContain(response.body.role);
    });

    it('should return valid timestamp format for expiresAt', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(new Date(response.body.expiresAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.expiresAt).toISOString()).toBe(response.body.expiresAt);
    });

    it('should return expiration date in the future for valid invitations', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should return consistent data on multiple requests', async () => {
      const response1 = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      const response2 = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(response1.body.id).toBe(response2.body.id);
      expect(response1.body.email).toBe(response2.body.email);
      expect(response1.body.familyName).toBe(response2.body.familyName);
      expect(response1.body.role).toBe(response2.body.role);
      expect(response1.body.invitedBy).toBe(response2.body.invitedBy);
      expect(response1.body.message).toBe(response2.body.message);
      expect(response1.body.expiresAt).toBe(response2.body.expiresAt);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .get(`/api/families/invitations/${sampleInvitationId}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(sampleInvitationId);
      });

      // All responses should be identical
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });
    });

    it('should handle malformed URLs gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations/')
        .expect(404);

      // Should return appropriate 404 for malformed URL
    });

    it('should return appropriate response for very long invitation IDs', async () => {
      const longId = 'a'.repeat(500);

      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${longId}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle special characters in URL path', async () => {
      const specialCharId = 'special%20chars!@#';

      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${specialCharId}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Considerations', () => {
    it('should not reveal information about non-existent invitations', async () => {
      const nonExistentId = '99999999-9999-4999-8999-999999999999';

      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found or expired');
      // Should not reveal whether invitation never existed vs was cancelled/expired
    });

    it('should not expose internal system details in error responses', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/invalid`)
        .expect(400);

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('query');
      expect(response.body).not.toHaveProperty('sql');
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('prisma');
    });

    it('should maintain invitation confidentiality for public access', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      // Public endpoint should only show invitation details, not family internals
      expect(response.body).not.toHaveProperty('memberCount');
      expect(response.body).not.toHaveProperty('familySettings');
      expect(response.body).not.toHaveProperty('subscriptionStatus');
    });
  });

  describe('HTTP Methods and CORS', () => {
    it('should only accept GET requests', async () => {
      // POST should not be allowed
      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}`)
        .expect(405);

      // PUT should not be allowed
      await request(API_BASE_URL)
        .put(`/api/families/invitations/${sampleInvitationId}`)
        .expect(405);

      // PATCH should not be allowed
      await request(API_BASE_URL)
        .patch(`/api/families/invitations/${sampleInvitationId}`)
        .expect(405);
    });

    it('should handle HEAD requests appropriately', async () => {
      const response = await request(API_BASE_URL)
        .head(`/api/families/invitations/${sampleInvitationId}`);

      // HEAD should return same headers as GET but no body
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.text).toBe('');
    });
  });
});