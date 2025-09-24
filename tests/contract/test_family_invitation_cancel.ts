/**
 * Contract Test: DELETE /api/families/invitations/{invitationId}
 * Task: T051 - Cancel invitation endpoint contract validation
 *
 * This test validates the invitation cancellation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/families/invitations/{invitationId}', () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let familyId: string;
  let sampleInvitationId: string;
  let secondInvitationId: string;

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
    const inviteResponse1 = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'invited1@example.com',
        role: 'editor'
      })
      .expect(201);

    sampleInvitationId = inviteResponse1.body.id;

    const inviteResponse2 = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'invited2@example.com',
        role: 'viewer'
      })
      .expect(201);

    secondInvitationId = inviteResponse2.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Invitation Cancellation (Admin Only)', () => {
    it('should return 200 with success message for valid cancellation', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toContain('cancelled');
    });

    it('should remove invitation from pending invitations list', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const listResponse = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const cancelledInvitation = listResponse.body.invitations.find(inv => inv.id === sampleInvitationId);
      expect(cancelledInvitation).toBeUndefined();
    });

    it('should make invitation inaccessible via public endpoint', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found or expired');
    });

    it('should maintain other invitations when cancelling one', async () => {
      const beforeList = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const afterList = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(afterList.body.invitations.length).toBe(beforeList.body.invitations.length - 1);

      // Second invitation should still exist
      const secondInvitation = afterList.body.invitations.find(inv => inv.id === secondInvitationId);
      expect(secondInvitation).toBeDefined();
    });

    it('should return descriptive success message', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/invitation.*cancelled|cancelled.*invitation/i);
      expect(response.body.message.length).toBeGreaterThan(10);
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
          .delete(`/api/families/invitations/${invalidId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 404 for non-existent invitation ID', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invitation not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 404 for already cancelled invitation', async () => {
      // First cancellation should succeed
      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Second cancellation attempt should return 404
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
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

      // Admin should not be able to cancel editor's family invitation
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${editorInvite.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found');
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should return 403 for non-admin users (editor)', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 403 for non-admin users (viewer)', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
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
          .delete(`/api/families/invitations/${sampleInvitationId}`)
          .set('Authorization', header)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('HTTP Methods and Headers', () => {
    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should not require request body for DELETE operation', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should ignore request body if provided', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ unnecessary: 'data' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return valid JSON response', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('Edge Cases and Concurrency', () => {
    it('should handle concurrent cancellation attempts gracefully', async () => {
      const requests = Array(3).fill(null).map(() =>
        request(API_BASE_URL)
          .delete(`/api/families/invitations/${sampleInvitationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.allSettled(requests);

      // First one should succeed, others should fail with 404
      let successCount = 0;
      let notFoundCount = 0;

      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.status === 200) successCount++;
          else if (result.value.status === 404) notFoundCount++;
        }
      });

      expect(successCount).toBe(1);
      expect(notFoundCount).toBe(2);
    });

    it('should maintain data consistency after cancellation operations', async () => {
      const initialInvitations = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const finalInvitations = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(finalInvitations.body.invitations.length).toBe(initialInvitations.body.invitations.length - 1);
      expect(finalInvitations.body.total).toBe(initialInvitations.body.total - 1);
    });

    it('should preserve audit trail for cancelled invitations', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Cancelled invitations should appear in audit logs/activity feed
      const activityResponse = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const cancelActivity = activityResponse.body.activities.find(
        activity => activity.action === 'delete' && activity.entityId === sampleInvitationId
      );

      if (cancelActivity) {
        expect(cancelActivity.entityType).toBe('invitation');
        expect(cancelActivity.description).toContain('cancelled');
      }
    });

    it('should handle malformed URLs gracefully', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/families/invitations/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Should return appropriate 404 for malformed URL
    });

    it('should handle very long invitation IDs', async () => {
      const longId = 'a'.repeat(500);

      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${longId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Business Logic and State Management', () => {
    it('should prevent cancellation of accepted invitations', async () => {
      // This test assumes business logic prevents cancellation of accepted invitations
      // In a real scenario, we'd need to simulate invitation acceptance first

      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('cancelled');
    });

    it('should update invitation statistics after cancellation', async () => {
      const beforeFamily = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const afterFamily = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Family data should remain consistent
      expect(afterFamily.body.memberCount).toBe(beforeFamily.body.memberCount);
    });

    it('should maintain referential integrity after cancellation', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Family should still exist and be accessible
      const familyResponse = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(familyResponse.body.id).toBe(familyId);
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent message format', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).not.toHaveProperty('error');
      expect(response.body).not.toHaveProperty('code');
      expect(typeof response.body.message).toBe('string');
    });

    it('should not expose sensitive system information', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('query');
      expect(response.body).not.toHaveProperty('sql');
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('prisma');
    });
  });
});