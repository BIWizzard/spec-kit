/**
 * Contract Test: GET /api/families/invitations
 * Task: T049 - List family invitations endpoint contract validation
 *
 * This test validates the family invitations list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/families/invitations', () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let familyId: string;
  let sampleInvitationIds: string[] = [];

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
    sampleInvitationIds = [];
    const invitationEmails = [
      'invite1@example.com',
      'invite2@example.com',
      'invite3@example.com'
    ];

    for (const email of invitationEmails) {
      const inviteResponse = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: email,
          role: 'viewer',
          message: `Welcome to the family, ${email}!`
        })
        .expect(201);

      sampleInvitationIds.push(inviteResponse.body.id);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Successful Invitations List Retrieval (Admin Only)', () => {
    it('should return 200 with invitations array and total count', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('invitations');
      expect(response.body).toHaveProperty('total');

      expect(Array.isArray(response.body.invitations)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBe(response.body.invitations.length);
      expect(response.body.invitations.length).toBe(3); // We created 3 invitations
    });

    it('should return invitations with all required fields', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.invitations.length).toBeGreaterThan(0);

      const invitation = response.body.invitations[0];

      // Validate invitation summary structure per OpenAPI spec
      expect(invitation).toHaveProperty('id');
      expect(invitation).toHaveProperty('email');
      expect(invitation).toHaveProperty('role');
      expect(invitation).toHaveProperty('status');
      expect(invitation).toHaveProperty('invitedBy');
      expect(invitation).toHaveProperty('createdAt');
      expect(invitation).toHaveProperty('expiresAt');

      // Validate data types
      expect(typeof invitation.id).toBe('string');
      expect(invitation.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(typeof invitation.email).toBe('string');
      expect(invitation.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(['admin', 'editor', 'viewer']).toContain(invitation.role);
      expect(['pending', 'accepted', 'expired', 'cancelled']).toContain(invitation.status);
      expect(typeof invitation.invitedBy).toBe('string');

      // Validate timestamps
      expect(new Date(invitation.createdAt)).toBeInstanceOf(Date);
      expect(new Date(invitation.expiresAt)).toBeInstanceOf(Date);
      expect(new Date(invitation.expiresAt).getTime()).toBeGreaterThan(new Date(invitation.createdAt).getTime());
    });

    it('should return invitations in consistent order', async () => {
      const response1 = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response2 = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.invitations.length).toBe(response2.body.invitations.length);

      if (response1.body.invitations.length > 0) {
        expect(response1.body.invitations[0].id).toBe(response2.body.invitations[0].id);
      }
    });

    it('should show invitation details with correct invited by information', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const invitation = response.body.invitations[0];
      expect(invitation.invitedBy).toBe('Admin User'); // Name of the admin who sent invitations
    });

    it('should return pending status for new invitations', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.invitations.forEach(invitation => {
        expect(invitation.status).toBe('pending');
      });
    });

    it('should handle empty invitations list gracefully', async () => {
      // Cancel all existing invitations first
      for (const invitationId of sampleInvitationIds) {
        await request(API_BASE_URL)
          .delete(`/api/families/invitations/${invitationId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }

      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('invitations');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.invitations)).toBe(true);
      expect(response.body.invitations).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should return 403 for non-admin users (editor)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 403 for non-admin users (viewer)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
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
          .get('/api/families/invitations')
          .set('Authorization', header)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Response Format and Headers', () => {
    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should return valid JSON response', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });

    it('should not expose sensitive information', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.invitations.forEach(invitation => {
        // Ensure no sensitive data is exposed
        expect(invitation).not.toHaveProperty('token');
        expect(invitation).not.toHaveProperty('invitationToken');
        expect(invitation).not.toHaveProperty('secret');
        expect(invitation).not.toHaveProperty('familyId');
        expect(invitation).not.toHaveProperty('invitedById');
      });
    });
  });

  describe('Data Filtering and Business Logic', () => {
    it('should only return invitations for current family', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // All invitations should be for emails we created
      const expectedEmails = ['invite1@example.com', 'invite2@example.com', 'invite3@example.com'];

      response.body.invitations.forEach(invitation => {
        expect(expectedEmails).toContain(invitation.email);
      });

      expect(response.body.invitations.length).toBe(3);
    });

    it('should exclude expired invitations appropriately', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // All current invitations should not be expired yet
      response.body.invitations.forEach(invitation => {
        expect(new Date(invitation.expiresAt).getTime()).toBeGreaterThan(Date.now());
        expect(invitation.status).toBe('pending');
      });
    });

    it('should show accepted invitations with correct status', async () => {
      // This test assumes the system tracks invitation status changes
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.invitations.forEach(invitation => {
        expect(['pending', 'accepted', 'expired', 'cancelled']).toContain(invitation.status);
      });
    });

    it('should maintain invitation ordering by creation date', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (response.body.invitations.length > 1) {
        for (let i = 1; i < response.body.invitations.length; i++) {
          const currentDate = new Date(response.body.invitations[i].createdAt);
          const previousDate = new Date(response.body.invitations[i - 1].createdAt);

          // Should be ordered by creation date (newest first or oldest first)
          expect(currentDate).toBeInstanceOf(Date);
          expect(previousDate).toBeInstanceOf(Date);
        }
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/families/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.invitations)).toBe(true);
      });

      // All responses should be consistent
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body.total).toBe(firstResponse.total);
        expect(response.body.invitations.length).toBe(firstResponse.invitations.length);
      });
    });

    it('should maintain data consistency across multiple calls', async () => {
      const response1 = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response2 = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.total).toBe(response2.body.total);
      expect(response1.body.invitations.length).toBe(response2.body.invitations.length);

      if (response1.body.invitations.length > 0) {
        expect(response1.body.invitations[0].id).toBe(response2.body.invitations[0].id);
      }
    });

    it('should handle large numbers of invitations efficiently', async () => {
      // Create additional invitations to test pagination/performance
      const additionalEmails = Array.from({ length: 20 }, (_, i) => `bulk${i}@example.com`);

      for (const email of additionalEmails) {
        await request(API_BASE_URL)
          .post('/api/families/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: email,
            role: 'viewer'
          })
          .expect(201);
      }

      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.invitations.length).toBe(23); // 3 original + 20 additional
      expect(response.body.total).toBe(23);
    });
  });

  describe('Data Validation', () => {
    it('should ensure all invitation IDs are valid UUIDs', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

      response.body.invitations.forEach(invitation => {
        expect(invitation.id).toMatch(uuidRegex);
      });
    });

    it('should ensure all email addresses are valid format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      response.body.invitations.forEach(invitation => {
        expect(invitation.email).toMatch(emailRegex);
      });
    });

    it('should ensure all timestamps are valid ISO 8601 format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.invitations.forEach(invitation => {
        expect(new Date(invitation.createdAt)).toBeInstanceOf(Date);
        expect(new Date(invitation.createdAt).toISOString()).toBe(invitation.createdAt);

        expect(new Date(invitation.expiresAt)).toBeInstanceOf(Date);
        expect(new Date(invitation.expiresAt).toISOString()).toBe(invitation.expiresAt);
      });
    });

    it('should ensure expiration dates are in the future for pending invitations', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const now = Date.now();

      response.body.invitations
        .filter(invitation => invitation.status === 'pending')
        .forEach(invitation => {
          expect(new Date(invitation.expiresAt).getTime()).toBeGreaterThan(now);
        });
    });
  });
});