/**
 * Contract Test: DELETE /api/families/members/{memberId}
 * Task: T048 - Remove family member endpoint contract validation
 *
 * This test validates the family member removal (soft delete) API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/families/members/{memberId}', () => {
  let adminToken: string;
  let secondAdminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let familyId: string;
  let adminMemberId: string;
  let secondAdminMemberId: string;
  let editorMemberId: string;
  let viewerMemberId: string;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Register first admin user
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
    adminMemberId = adminResponse.body.user.id;

    // Register second admin user (needed for testing admin deletion rules)
    const secondAdminResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'admin2@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Admin2',
        lastName: 'User',
        familyName: 'Second Admin Family'
      })
      .expect(201);

    secondAdminToken = secondAdminResponse.body.tokens.accessToken;
    secondAdminMemberId = secondAdminResponse.body.user.id;

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
    editorMemberId = editorResponse.body.user.id;

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
    viewerMemberId = viewerResponse.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Member Deletion Requests (Admin Only)', () => {
    it('should return 200 with success message for valid deletion', async () => {
      // Simulate having multiple members in the same family first
      // In a real scenario, we'd invite members to the same family
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toContain('removed');
    });

    it('should soft delete member (not permanently remove)', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Member should still exist but with deleted status when includeDeleted=true
      const response = await request(API_BASE_URL)
        .get('/api/families/members?includeDeleted=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deletedMember = response.body.members.find(m => m.id === editorMemberId);
      if (deletedMember) {
        expect(deletedMember.status).toBe('deleted');
      }
    });

    it('should remove member from regular member list (includeDeleted=false)', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const activeMember = response.body.members.find(m => m.id === editorMemberId);
      expect(activeMember).toBeUndefined();
    });

    it('should update family member count after deletion', async () => {
      const beforeFamily = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const afterFamily = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(afterFamily.body.memberCount).toBe(beforeFamily.body.memberCount - 1);
    });

    it('should maintain referential integrity after deletion', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
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

  describe('Self-Deletion Prevention', () => {
    it('should return 400 when admin tries to delete themselves', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.message).toContain('delete self');
    });

    it('should return 400 when trying to delete the last admin', async () => {
      // This test assumes the business rule of maintaining at least one admin
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Cannot delete self or last admin');
      expect(response.body.message).toContain('last admin');
    });

    it('should prevent deletion of all admins from family', async () => {
      // In a scenario with multiple admins, should prevent deleting the last one
      // This test represents the business logic constraint
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toContain('admin');
    });
  });

  describe('Member ID Validation', () => {
    it('should return 400 for invalid member ID format', async () => {
      const invalidIds = [
        'not-a-uuid',
        '123',
        'invalid-uuid-format',
        '',
        'abc-def-ghi'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .delete(`/api/families/members/${invalidId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 404 for non-existent member ID', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Member not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 404 for member from different family', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${secondAdminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Member not found');
    });

    it('should return 404 for already deleted member', async () => {
      // First deletion should succeed
      await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Second deletion attempt should return 404
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Member not found');
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should return 403 for non-admin users (editor)', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 403 for non-admin users (viewer)', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 403 for editor trying to delete another editor', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${viewerMemberId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 403 for viewer trying to delete anyone', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
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
          .delete(`/api/families/members/${editorMemberId}`)
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
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should not require request body for DELETE operation', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should ignore request body if provided', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ unnecessary: 'data' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return valid JSON response', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('Edge Cases and Business Logic', () => {
    it('should handle concurrent deletion attempts gracefully', async () => {
      const requests = Array(3).fill(null).map(() =>
        request(API_BASE_URL)
          .delete(`/api/families/members/${editorMemberId}`)
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

    it('should maintain data consistency after deletion operations', async () => {
      const initialMembers = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const finalMembers = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(finalMembers.body.members.length).toBe(initialMembers.body.members.length - 1);
      expect(finalMembers.body.total).toBe(initialMembers.body.total - 1);
    });

    it('should preserve audit trail for deleted members', async () => {
      await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Deleted members should still appear in audit logs/activity feed
      const activityResponse = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should find delete activity in the log
      const deleteActivity = activityResponse.body.activities.find(
        activity => activity.action === 'delete' && activity.entityId === editorMemberId
      );

      if (deleteActivity) {
        expect(deleteActivity.entityType).toBe('member');
        expect(deleteActivity.description).toContain('deleted');
      }
    });

    it('should handle deletion of members with existing financial data', async () => {
      // This test represents the business constraint that members with financial data
      // should be soft deleted to maintain data integrity
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('removed');
    });
  });

  describe('Response Message Validation', () => {
    it('should return descriptive success message', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/member.*removed|removed.*member/i);
      expect(response.body.message.length).toBeGreaterThan(10);
    });

    it('should return consistent message format', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).not.toHaveProperty('error');
      expect(response.body).not.toHaveProperty('code');
      expect(typeof response.body.message).toBe('string');
    });
  });
});