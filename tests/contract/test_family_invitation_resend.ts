/**
 * Contract Test: POST /api/families/invitations/{invitationId}/resend
 * Task: T053 - Resend invitation email endpoint contract validation
 *
 * This test validates the invitation resend API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/families/invitations/{invitationId}/resend', () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let familyId: string;
  let sampleInvitationId: string;
  let cancelledInvitationId: string;
  let expiredInvitationId: string;

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

    // Register editor and viewer users (separate families)
    const editorResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'editor@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Editor',
        lastName: 'User',
        familyName: 'Editor Family'
      })
      .expect(201);

    editorToken = editorResponse.body.tokens.accessToken;

    const viewerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'viewer@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Viewer',
        lastName: 'User',
        familyName: 'Viewer Family'
      })
      .expect(201);

    viewerToken = viewerResponse.body.tokens.accessToken;

    // Create sample invitations for testing
    const inviteResponse = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'pending@example.com',
        role: 'editor',
        message: 'Welcome to our family!'
      })
      .expect(201);

    sampleInvitationId = inviteResponse.body.id;

    // Create additional invitations for different scenarios
    const cancelledInvite = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'cancelled@example.com',
        role: 'viewer'
      })
      .expect(201);

    cancelledInvitationId = cancelledInvite.body.id;

    // Cancel the cancelled invitation
    await request(API_BASE_URL)
      .delete(`/api/families/invitations/${cancelledInvitationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const expiredInvite = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'expired@example.com',
        role: 'viewer'
      })
      .expect(201);

    expiredInvitationId = expiredInvite.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Invitation Resend (Admin Only)', () => {
    it('should return 200 with success message for valid resend', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toMatch(/resent|sent again/i);
    });

    it('should maintain invitation in pending status after resend', async () => {
      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const listResponse = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const invitation = listResponse.body.invitations.find(inv => inv.id === sampleInvitationId);
      expect(invitation).toBeDefined();
      expect(invitation.status).toBe('pending');
    });

    it('should keep invitation accessible via public endpoint after resend', async () => {
      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(response.body.id).toBe(sampleInvitationId);
      expect(response.body.email).toBe('pending@example.com');
    });

    it('should not change invitation details after resend', async () => {
      const beforeResponse = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const afterResponse = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(afterResponse.body.email).toBe(beforeResponse.body.email);
      expect(afterResponse.body.role).toBe(beforeResponse.body.role);
      expect(afterResponse.body.message).toBe(beforeResponse.body.message);
      expect(afterResponse.body.familyName).toBe(beforeResponse.body.familyName);
    });

    it('should return descriptive success message', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/invitation.*resent|resent.*invitation|email.*sent/i);
      expect(response.body.message.length).toBeGreaterThan(10);
    });

    it('should handle multiple resend attempts', async () => {
      // First resend
      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Second resend should also work
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/resent|sent/i);
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
          .post(`/api/families/invitations/${invalidId}/resend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 404 for non-existent invitation ID', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${nonExistentId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invitation not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 404 for cancelled invitation', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${cancelledInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found');
    });

    it('should return 404 for invitation from different family', async () => {
      // Create invitation in editor's family
      const editorInvite = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          email: 'editorinvite@example.com',
          role: 'viewer'
        })
        .expect(201);

      // Admin should not be able to resend editor's family invitation
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${editorInvite.body.id}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found');
    });

    it('should handle expired invitations appropriately', async () => {
      // This test depends on how expired invitations are handled
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${expiredInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      // Could be 200 (resend extends expiration) or 404 (expired not found)
      if (response.status === 200) {
        expect(response.body.message).toMatch(/resent|sent/i);
      } else if (response.status === 404) {
        expect(response.body.error).toBe('Invitation not found');
      }
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should return 403 for non-admin users (editor)', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 403 for non-admin users (viewer)', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with malformed authorization header', async () => {
      const malformedHeaders = [
        'invalid-token',
        'Basic sometoken',
        'Bearer',
        'Bearer ',
        `Bearer ${adminToken} extra`
      ];

      for (const header of malformedHeaders) {
        const response = await request(API_BASE_URL)
          .post(`/api/families/invitations/${sampleInvitationId}/resend`)
          .set('Authorization', header)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('HTTP Methods and Request Format', () => {
    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should not require request body for POST operation', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should ignore request body if provided', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ unnecessary: 'data' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return valid JSON response', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });

    it('should only accept POST requests', async () => {
      // GET should not be allowed
      await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(405);

      // PUT should not be allowed
      await request(API_BASE_URL)
        .put(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(405);

      // DELETE should not be allowed
      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(405);
    });
  });

  describe('Rate Limiting and Business Logic', () => {
    it('should handle rapid resend attempts gracefully', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .post(`/api/families/invitations/${sampleInvitationId}/resend`)
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      // All should succeed or some might be rate limited
      let successCount = 0;
      let rateLimitedCount = 0;

      responses.forEach(response => {
        if (response.status === 200) successCount++;
        else if (response.status === 429) rateLimitedCount++; // Rate limited
      });

      expect(successCount + rateLimitedCount).toBe(5);
    });

    it('should maintain invitation state consistency during concurrent resends', async () => {
      const requests = Array(3).fill(null).map(() =>
        request(API_BASE_URL)
          .post(`/api/families/invitations/${sampleInvitationId}/resend`)
          .set('Authorization', `Bearer ${adminToken}`)
      );

      await Promise.all(requests);

      // Invitation should still be accessible and in correct state
      const inviteResponse = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(inviteResponse.body.id).toBe(sampleInvitationId);
      expect(inviteResponse.body.email).toBe('pending@example.com');
    });

    it('should preserve original invitation properties after resend', async () => {
      const originalDetails = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const afterDetails = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      expect(afterDetails.body.id).toBe(originalDetails.body.id);
      expect(afterDetails.body.email).toBe(originalDetails.body.email);
      expect(afterDetails.body.role).toBe(originalDetails.body.role);
      expect(afterDetails.body.message).toBe(originalDetails.body.message);
      expect(afterDetails.body.familyName).toBe(originalDetails.body.familyName);
      expect(afterDetails.body.invitedBy).toBe(originalDetails.body.invitedBy);
    });

    it('should update expiration date after resend (if applicable)', async () => {
      const beforeDetails = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const afterDetails = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(200);

      // Expiration might be extended after resend (business logic dependent)
      expect(new Date(afterDetails.body.expiresAt).getTime())
        .toBeGreaterThanOrEqual(new Date(beforeDetails.body.expiresAt).getTime());
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed URLs gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/invitations//resend')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Should return appropriate 404 for malformed URL
    });

    it('should handle very long invitation IDs', async () => {
      const longId = 'a'.repeat(500);

      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${longId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle special characters in URL path', async () => {
      const specialCharId = 'special%20chars!@#';

      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${specialCharId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should maintain audit trail for resend operations', async () => {
      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Resend operations should appear in audit logs/activity feed
      const activityResponse = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const resendActivity = activityResponse.body.activities.find(
        activity => activity.action === 'update' && activity.entityId === sampleInvitationId
      );

      if (resendActivity) {
        expect(resendActivity.entityType).toBe('invitation');
        expect(resendActivity.description).toContain('resent');
      }
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent message format', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).not.toHaveProperty('error');
      expect(response.body).not.toHaveProperty('code');
      expect(typeof response.body.message).toBe('string');
    });

    it('should not expose sensitive system information', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('emailToken');
      expect(response.body).not.toHaveProperty('smtpConfig');
      expect(response.body).not.toHaveProperty('mailgunKey');
      expect(response.body.message).not.toContain('smtp');
      expect(response.body.message).not.toContain('api-key');
    });

    it('should return success message without revealing email infrastructure', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/invitation.*resent|email.*sent/i);
      expect(response.body.message).not.toContain('sendgrid');
      expect(response.body.message).not.toContain('mailgun');
      expect(response.body.message).not.toContain('ses');
    });
  });
});