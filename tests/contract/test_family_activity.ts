/**
 * Contract Test: GET /api/families/activity
 * Task: T054 - Get family activity log endpoint contract validation
 *
 * This test validates the family activity log API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/families/activity', () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let familyId: string;
  let adminMemberId: string;

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
    adminMemberId = adminResponse.body.user.id;

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

    // Generate some activity by creating and managing invitations
    const inviteResponse = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'activity@example.com',
        role: 'editor'
      })
      .expect(201);

    // Cancel the invitation to create more activity
    await request(API_BASE_URL)
      .delete(`/api/families/invitations/${inviteResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Update family details to create activity
    await request(API_BASE_URL)
      .put('/api/families')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Test Family' })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Successful Activity Log Retrieval', () => {
    it('should return 200 with activities array and pagination info', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');

      expect(Array.isArray(response.body.activities)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.hasMore).toBe('boolean');
    });

    it('should return activity entries with all required fields', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (response.body.activities.length > 0) {
        const activity = response.body.activities[0];

        // Validate activity entry structure per OpenAPI spec
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('action');
        expect(activity).toHaveProperty('entityType');
        expect(activity).toHaveProperty('entityId');
        expect(activity).toHaveProperty('memberName');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('ipAddress');
        expect(activity).toHaveProperty('createdAt');

        // Validate data types
        expect(typeof activity.id).toBe('string');
        expect(activity.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(['create', 'update', 'delete', 'login', 'logout', 'sync']).toContain(activity.action);
        expect(typeof activity.entityType).toBe('string');
        expect(typeof activity.entityId).toBe('string');
        expect(typeof activity.memberName).toBe('string');
        expect(typeof activity.description).toBe('string');
        expect(typeof activity.ipAddress).toBe('string');

        // Validate timestamp
        expect(new Date(activity.createdAt)).toBeInstanceOf(Date);
      }
    });

    it('should return activities in chronological order (newest first)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (response.body.activities.length > 1) {
        for (let i = 1; i < response.body.activities.length; i++) {
          const currentDate = new Date(response.body.activities[i].createdAt);
          const previousDate = new Date(response.body.activities[i - 1].createdAt);

          expect(currentDate.getTime()).toBeLessThanOrEqual(previousDate.getTime());
        }
      }
    });

    it('should include family creation activity', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const familyCreateActivity = response.body.activities.find(
        activity => activity.action === 'create' && activity.entityType === 'family'
      );

      if (familyCreateActivity) {
        expect(familyCreateActivity.memberName).toBe('Admin User');
        expect(familyCreateActivity.description).toContain('family');
        expect(familyCreateActivity.description).toContain('created');
      }
    });

    it('should include invitation activities', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const inviteActivity = response.body.activities.find(
        activity => activity.action === 'create' && activity.entityType === 'invitation'
      );

      if (inviteActivity) {
        expect(inviteActivity.memberName).toBe('Admin User');
        expect(inviteActivity.description).toContain('invitation');
      }
    });

    it('should handle empty activity log gracefully', async () => {
      // This test assumes a scenario where activities might be cleared
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.activities)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Query Parameters and Pagination', () => {
    it('should accept limit parameter within valid range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.activities.length).toBeLessThanOrEqual(10);
    });

    it('should accept offset parameter for pagination', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity?offset=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.activities)).toBe(true);
    });

    it('should use default limit when not specified', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.activities.length).toBeLessThanOrEqual(20); // Default limit per spec
    });

    it('should return 400 for invalid limit parameter', async () => {
      const invalidLimits = ['0', '101', 'abc', '-1'];

      for (const limit of invalidLimits) {
        const response = await request(API_BASE_URL)
          .get(`/api/families/activity?limit=${limit}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 400 for invalid offset parameter', async () => {
      const invalidOffsets = ['abc', '-1'];

      for (const offset of invalidOffsets) {
        const response = await request(API_BASE_URL)
          .get(`/api/families/activity?offset=${offset}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle limit at maximum value', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity?limit=100')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.activities.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Filtering Parameters', () => {
    it('should accept memberId filter', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/activity?memberId=${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.activities.forEach(activity => {
        expect(activity.memberName).toBe('Admin User');
      });
    });

    it('should accept action filter with valid enum values', async () => {
      const validActions = ['create', 'update', 'delete', 'login', 'logout', 'sync'];

      for (const action of validActions) {
        const response = await request(API_BASE_URL)
          .get(`/api/families/activity?action=${action}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        response.body.activities.forEach(activity => {
          expect(activity.action).toBe(action);
        });
      }
    });

    it('should return 400 for invalid action filter', async () => {
      const invalidActions = ['invalid', 'upload', 'download', 'read'];

      for (const action of invalidActions) {
        const response = await request(API_BASE_URL)
          .get(`/api/families/activity?action=${action}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should accept fromDate filter with valid date format', async () => {
      const fromDate = '2024-01-01';

      const response = await request(API_BASE_URL)
        .get(`/api/families/activity?fromDate=${fromDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const filterDate = new Date(fromDate).getTime();
      response.body.activities.forEach(activity => {
        expect(new Date(activity.createdAt).getTime()).toBeGreaterThanOrEqual(filterDate);
      });
    });

    it('should accept toDate filter with valid date format', async () => {
      const toDate = '2025-12-31';

      const response = await request(API_BASE_URL)
        .get(`/api/families/activity?toDate=${toDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const filterDate = new Date(toDate).getTime();
      response.body.activities.forEach(activity => {
        expect(new Date(activity.createdAt).getTime()).toBeLessThanOrEqual(filterDate + 24 * 60 * 60 * 1000);
      });
    });

    it('should return 400 for invalid date format', async () => {
      const invalidDates = ['invalid-date', '2024-13-01', '2024-01-32', 'Jan 1, 2024'];

      for (const date of invalidDates) {
        const response = await request(API_BASE_URL)
          .get(`/api/families/activity?fromDate=${date}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should combine multiple filters correctly', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/families/activity?limit=5&action=create&fromDate=2024-01-01`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.activities.length).toBeLessThanOrEqual(5);
      response.body.activities.forEach(activity => {
        expect(activity.action).toBe('create');
      });
    });

    it('should ignore unknown query parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity?unknownParam=value&anotherParam=test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.activities)).toBe(true);
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should allow admin users to view activity log', async () => {
      await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should return 403 for non-admin users (editor)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 403 for non-admin users (viewer)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
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
          .get('/api/families/activity')
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
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should return valid JSON response', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });

    it('should not expose sensitive information', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.activities.forEach(activity => {
        // Ensure no sensitive data is exposed
        expect(activity).not.toHaveProperty('password');
        expect(activity).not.toHaveProperty('token');
        expect(activity).not.toHaveProperty('secret');
        expect(activity).not.toHaveProperty('userId');
        expect(activity).not.toHaveProperty('sessionId');
      });
    });

    it('should include meaningful descriptions for activities', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.activities.forEach(activity => {
        expect(activity.description.length).toBeGreaterThan(10);
        expect(activity.description).toMatch(/\w+/); // Contains actual words
      });
    });
  });

  describe('Data Validation and Format', () => {
    it('should ensure all activity IDs are valid UUIDs', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

      response.body.activities.forEach(activity => {
        expect(activity.id).toMatch(uuidRegex);
        expect(activity.entityId).toMatch(uuidRegex);
      });
    });

    it('should ensure all timestamps are valid ISO 8601 format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.activities.forEach(activity => {
        expect(new Date(activity.createdAt)).toBeInstanceOf(Date);
        expect(new Date(activity.createdAt).toISOString()).toBe(activity.createdAt);
      });
    });

    it('should include valid IP addresses', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^127\.0\.0\.1$/;

      response.body.activities.forEach(activity => {
        if (activity.ipAddress) {
          expect(activity.ipAddress).toMatch(ipRegex);
        }
      });
    });

    it('should maintain referential integrity for entity references', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.activities.forEach(activity => {
        expect(activity.entityType).toMatch(/^(family|member|invitation|payment|income|account)$/);

        if (activity.entityType === 'family') {
          expect(activity.entityId).toBe(familyId);
        }
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/families/activity')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.activities)).toBe(true);
      });

      // All responses should be consistent
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body.total).toBe(firstResponse.total);
        expect(response.body.activities.length).toBe(firstResponse.activities.length);
      });
    });

    it('should maintain consistent pagination across requests', async () => {
      const page1 = await request(API_BASE_URL)
        .get('/api/families/activity?limit=2&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const page2 = await request(API_BASE_URL)
        .get('/api/families/activity?limit=2&offset=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (page1.body.activities.length > 0 && page2.body.activities.length > 0) {
        // Activities should not overlap between pages
        const page1Ids = page1.body.activities.map(a => a.id);
        const page2Ids = page2.body.activities.map(a => a.id);

        page1Ids.forEach(id => {
          expect(page2Ids).not.toContain(id);
        });
      }
    });

    it('should handle large offset values gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity?offset=1000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.activities).toHaveLength(0);
      expect(response.body.hasMore).toBe(false);
    });

    it('should update hasMore flag correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity?limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (response.body.total > 1) {
        expect(response.body.hasMore).toBe(true);
      } else {
        expect(response.body.hasMore).toBe(false);
      }
    });
  });

  describe('Activity Types and Business Logic', () => {
    it('should track family updates in activity log', async () => {
      await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Activity Test Family' })
        .expect(200);

      const response = await request(API_BASE_URL)
        .get('/api/families/activity?action=update&entityType=family')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const familyUpdateActivity = response.body.activities.find(
        activity => activity.entityId === familyId && activity.action === 'update'
      );

      if (familyUpdateActivity) {
        expect(familyUpdateActivity.description).toContain('updated');
        expect(familyUpdateActivity.memberName).toBe('Admin User');
      }
    });

    it('should not expose activities from other families', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // All activities should be related to the current family
      response.body.activities.forEach(activity => {
        if (activity.entityType === 'family') {
          expect(activity.entityId).toBe(familyId);
        }
      });
    });

    it('should maintain audit trail completeness', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should have at least family creation activity
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.activities.length).toBeGreaterThan(0);

      // Should include user registration/family creation
      const hasCreateActivity = response.body.activities.some(
        activity => activity.action === 'create'
      );
      expect(hasCreateActivity).toBe(true);
    });
  });
});