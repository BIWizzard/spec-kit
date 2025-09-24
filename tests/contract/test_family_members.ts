/**
 * Contract Test: GET /api/families/members
 * Task: T045 - List family members endpoint contract validation
 *
 * This test validates the family members list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/families/members', () => {
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
        familyName: 'Test Family',
        timezone: 'America/New_York',
        currency: 'USD'
      })
      .expect(201);

    adminToken = adminResponse.body.tokens.accessToken;
    familyId = adminResponse.body.family.id;
    adminMemberId = adminResponse.body.user.id;

    // Register editor and viewer users (would be through invitation in real scenario)
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Successful Member List Retrieval', () => {
    it('should return 200 with members array and total count', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('members');
      expect(response.body).toHaveProperty('total');

      expect(Array.isArray(response.body.members)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBe(response.body.members.length);
    });

    it('should return single admin member for new family', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.members).toHaveLength(1);
      expect(response.body.total).toBe(1);

      const member = response.body.members[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('email');
      expect(member).toHaveProperty('firstName');
      expect(member).toHaveProperty('lastName');
      expect(member).toHaveProperty('role');
      expect(member).toHaveProperty('status');
      expect(member).toHaveProperty('lastLoginAt');
      expect(member).toHaveProperty('createdAt');

      // Validate member data
      expect(member.id).toBe(adminMemberId);
      expect(member.email).toBe('admin@example.com');
      expect(member.firstName).toBe('Admin');
      expect(member.lastName).toBe('User');
      expect(member.role).toBe('admin');
      expect(['active', 'inactive', 'deleted']).toContain(member.status);
    });

    it('should validate member summary structure for all fields', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const member = response.body.members[0];

      // Validate all required fields per OpenAPI spec
      expect(typeof member.id).toBe('string');
      expect(member.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(typeof member.email).toBe('string');
      expect(member.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(typeof member.firstName).toBe('string');
      expect(typeof member.lastName).toBe('string');
      expect(['admin', 'editor', 'viewer']).toContain(member.role);
      expect(['active', 'inactive', 'deleted']).toContain(member.status);

      // Validate optional fields
      if (member.lastLoginAt !== null) {
        expect(new Date(member.lastLoginAt)).toBeInstanceOf(Date);
      }
      expect(new Date(member.createdAt)).toBeInstanceOf(Date);
    });

    it('should return members in consistent order', async () => {
      const response1 = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response2 = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.members.length).toBe(response2.body.members.length);

      if (response1.body.members.length > 0) {
        expect(response1.body.members[0].id).toBe(response2.body.members[0].id);
      }
    });

    it('should not expose sensitive member information', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const member = response.body.members[0];

      // Ensure sensitive data is not exposed
      expect(member).not.toHaveProperty('password');
      expect(member).not.toHaveProperty('passwordHash');
      expect(member).not.toHaveProperty('tokens');
      expect(member).not.toHaveProperty('refreshToken');
      expect(member).not.toHaveProperty('mfaSecret');
    });
  });

  describe('Query Parameters', () => {
    it('should accept includeDeleted=false (default behavior)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members?includeDeleted=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.members)).toBe(true);
      expect(typeof response.body.total).toBe('number');

      // Should only include active members
      response.body.members.forEach(member => {
        expect(member.status).not.toBe('deleted');
      });
    });

    it('should accept includeDeleted=true', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members?includeDeleted=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.members)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    it('should handle invalid includeDeleted parameter gracefully', async () => {
      const invalidValues = ['invalid', '1', 'yes', 'no'];

      for (const value of invalidValues) {
        const response = await request(API_BASE_URL)
          .get(`/api/families/members?includeDeleted=${value}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should ignore unknown query parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members?unknownParam=value&anotherParam=test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.members)).toBe(true);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should allow admin users to view member list', async () => {
      await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow editor users to view member list', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(Array.isArray(response.body.members)).toBe(true);
    });

    it('should allow viewer users to view member list', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.members)).toBe(true);
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
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
          .get('/api/families/members')
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
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should return valid JSON response', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });

    it('should handle empty member list gracefully', async () => {
      // This test assumes a scenario where members might be deleted
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('members');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.members)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/families/members')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.members)).toBe(true);
      });

      // All responses should be consistent
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body.total).toBe(firstResponse.total);
        expect(response.body.members.length).toBe(firstResponse.members.length);
      });
    });

    it('should maintain data consistency across multiple calls', async () => {
      const response1 = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response2 = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.total).toBe(response2.body.total);
      expect(response1.body.members.length).toBe(response2.body.members.length);

      if (response1.body.members.length > 0) {
        expect(response1.body.members[0].id).toBe(response2.body.members[0].id);
      }
    });

    it('should return appropriate response for family with only one member', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0].role).toBe('admin');
    });
  });

  describe('Data Validation', () => {
    it('should ensure all returned member IDs are valid UUIDs', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

      response.body.members.forEach(member => {
        expect(member.id).toMatch(uuidRegex);
      });
    });

    it('should ensure all email addresses are valid format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      response.body.members.forEach(member => {
        expect(member.email).toMatch(emailRegex);
      });
    });

    it('should ensure all timestamps are valid ISO 8601 format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.members.forEach(member => {
        expect(new Date(member.createdAt)).toBeInstanceOf(Date);
        expect(new Date(member.createdAt).toISOString()).toBe(member.createdAt);

        if (member.lastLoginAt) {
          expect(new Date(member.lastLoginAt)).toBeInstanceOf(Date);
          expect(new Date(member.lastLoginAt).toISOString()).toBe(member.lastLoginAt);
        }
      });
    });
  });
});