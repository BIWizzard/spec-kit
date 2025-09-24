/**
 * Contract Test: GET /api/auth/me
 * Task: T039 - Authentication profile endpoint contract validation
 *
 * This test validates the user profile API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/auth/me', () => {
  let authTokens: any;
  const testUser = {
    email: 'profile@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Profile',
    lastName: 'Test',
    familyName: 'Profile Family'
  };

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create and authenticate test user
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send(testUser);

    const loginResponse = await request(API_BASE_URL)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authTokens = loginResponse.body.tokens;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Profile Request', () => {
    it('should return 200 with user profile data', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('permissions');
      expect(response.body).toHaveProperty('mfaEnabled');
      expect(response.body).toHaveProperty('emailVerified');
      expect(response.body).toHaveProperty('lastLoginAt');
      expect(response.body).toHaveProperty('createdAt');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.email).toBe('string');
      expect(typeof response.body.firstName).toBe('string');
      expect(typeof response.body.lastName).toBe('string');
      expect(typeof response.body.role).toBe('string');
      expect(typeof response.body.permissions).toBe('object');
      expect(typeof response.body.mfaEnabled).toBe('boolean');
      expect(typeof response.body.emailVerified).toBe('boolean');
      expect(typeof response.body.lastLoginAt).toBe('string');
      expect(typeof response.body.createdAt).toBe('string');

      // Validate data values
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);
      expect(['admin', 'editor', 'viewer']).toContain(response.body.role);

      // Validate UUID format
      expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate date formats
      expect(new Date(response.body.lastLoginAt).toISOString()).toBe(response.body.lastLoginAt);
      expect(new Date(response.body.createdAt).toISOString()).toBe(response.body.createdAt);
    });

    it('should return valid permissions object', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const { permissions } = response.body;
      
      // Validate permissions structure per OpenAPI spec
      expect(permissions).toHaveProperty('canManageBankAccounts');
      expect(permissions).toHaveProperty('canEditPayments');
      expect(permissions).toHaveProperty('canViewReports');
      expect(permissions).toHaveProperty('canManageFamily');

      // Validate permission data types
      expect(typeof permissions.canManageBankAccounts).toBe('boolean');
      expect(typeof permissions.canEditPayments).toBe('boolean');
      expect(typeof permissions.canViewReports).toBe('boolean');
      expect(typeof permissions.canManageFamily).toBe('boolean');
    });

    it('should not expose sensitive data', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should not include sensitive fields
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('mfaSecret');
      expect(response.body).not.toHaveProperty('deletedAt');
    });

    it('should reflect current user state', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should match the user who was authenticated
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await request(API_BASE_URL)
          .get('/api/auth/me')
          .set('Authorization', token.startsWith('Bearer') ? token : `Bearer ${token}`)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body.error).toBe('Not authenticated');
      }
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxfQ.invalid';
      
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });

    it('should return 401 with malformed Authorization header', async () => {
      const malformedHeaders = [
        authTokens.accessToken, // Missing 'Bearer '
        `Basic ${authTokens.accessToken}`, // Wrong auth type
        `Bearer`, // Missing token
        `Bearer ${authTokens.accessToken} extra` // Extra content
      ];

      for (const header of malformedHeaders) {
        const response = await request(API_BASE_URL)
          .get('/api/auth/me')
          .set('Authorization', header)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body.error).toBe('Not authenticated');
      }
    });
  });

  describe('Token Validation', () => {
    it('should validate token signature', async () => {
      // Token with invalid signature
      const tamperedToken = authTokens.accessToken.slice(0, -10) + 'tampered123';
      
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });

    it('should require valid JWT structure', async () => {
      const invalidJWTs = [
        'not.a.jwt',
        'only-one-part',
        'two.parts',
        '.missing.header',
        'missing..payload',
        'missing.signature.',
        '...empty'
      ];

      for (const jwt of invalidJWTs) {
        const response = await request(API_BASE_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${jwt}`)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body.error).toBe('Not authenticated');
      }
    });
  });

  describe('Cross-User Token Validation', () => {
    it('should not accept token from different user', async () => {
      // Create second user
      const secondUser = {
        email: 'other@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'User',
        familyName: 'Other Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(secondUser);

      const otherLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: secondUser.email,
          password: secondUser.password
        });

      const otherTokens = otherLoginResponse.body.tokens;

      // Use other user's token to access first user's profile
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${otherTokens.accessToken}`)
        .expect(200);

      // Should return the OTHER user's profile, not the first user's
      expect(response.body.email).toBe(secondUser.email);
      expect(response.body.email).not.toBe(testUser.email);
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require Bearer token authentication', async () => {
      // Endpoint requires authentication per OpenAPI spec
      await request(API_BASE_URL)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });

    it('should include appropriate cache headers for profile data', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Profile data should be cacheable but with short TTL
      expect(response.headers['cache-control']).toMatch(/max-age=|no-cache/);
    });
  });

  describe('Response Performance', () => {
    it('should respond quickly for profile data', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
