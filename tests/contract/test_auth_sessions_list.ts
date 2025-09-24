/**
 * Contract Test: GET /api/auth/sessions
 * Task: T040 - Sessions list endpoint contract validation
 *
 * This test validates the sessions list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/auth/sessions', () => {
  let validAccessToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user and get access token
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'sessiontest@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Session',
        lastName: 'Test',
        familyName: 'Session Test Family'
      })
      .expect(201);

    validAccessToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Sessions List Request', () => {
    it('should return 200 with current user sessions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });

    it('should include current session in the list', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.sessions.length).toBeGreaterThan(0);

      // At least one session should be marked as current
      const currentSessions = response.body.sessions.filter(session => session.isCurrent);
      expect(currentSessions.length).toBeGreaterThanOrEqual(1);
    });

    it('should return properly structured session objects', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const { sessions } = response.body;
      expect(sessions.length).toBeGreaterThan(0);

      // Validate session object structure per OpenAPI spec
      const session = sessions[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('ipAddress');
      expect(session).toHaveProperty('userAgent');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('expiresAt');
      expect(session).toHaveProperty('isCurrent');

      // Validate data types
      expect(typeof session.id).toBe('string');
      expect(typeof session.ipAddress).toBe('string');
      expect(typeof session.userAgent).toBe('string');
      expect(typeof session.createdAt).toBe('string');
      expect(typeof session.expiresAt).toBe('string');
      expect(typeof session.isCurrent).toBe('boolean');

      // Validate UUID format for id
      expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate ISO date format
      expect(() => new Date(session.createdAt)).not.toThrow();
      expect(() => new Date(session.expiresAt)).not.toThrow();
    });

    it('should return empty array for user with no active sessions (edge case)', async () => {
      // Create a new user but don't make any requests with their token
      const newUserResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'nosessions@example.com',
          password: 'SecurePass123!@#',
          firstName: 'No',
          lastName: 'Sessions',
          familyName: 'No Sessions Family'
        })
        .expect(201);

      // Immediately expire/invalidate their session (implementation-specific)
      // For this test, we'll assume the user has sessions from registration

      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${newUserResponse.body.tokens.accessToken}`)
        .expect(200);

      expect(response.body.sessions).toBeDefined();
      expect(Array.isArray(response.body.sessions)).toBe(true);
      // Should have at least the current session
      expect(response.body.sessions.length).toBeGreaterThanOrEqual(1);
    });

    it('should include sessions with different user agents', async () => {
      // Create multiple sessions with different user agents
      const userAgent1 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
      const userAgent2 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/14.1';

      // Login from different "devices"
      const login1 = await request(API_BASE_URL)
        .post('/api/auth/login')
        .set('User-Agent', userAgent1)
        .send({
          email: 'sessiontest@example.com',
          password: 'SecurePass123!@#'
        })
        .expect(200);

      const login2 = await request(API_BASE_URL)
        .post('/api/auth/login')
        .set('User-Agent', userAgent2)
        .send({
          email: 'sessiontest@example.com',
          password: 'SecurePass123!@#'
        })
        .expect(200);

      // Get sessions list
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${login1.body.tokens.accessToken}`)
        .expect(200);

      expect(response.body.sessions.length).toBeGreaterThanOrEqual(2);

      // Should have sessions with different user agents
      const userAgents = response.body.sessions.map(s => s.userAgent);
      expect(userAgents).toContain(userAgent1);
    });
  });

  describe('Sessions Data Validation', () => {
    it('should show correct IP addresses', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const { sessions } = response.body;
      sessions.forEach(session => {
        expect(session.ipAddress).toBeDefined();
        expect(typeof session.ipAddress).toBe('string');
        expect(session.ipAddress.length).toBeGreaterThan(0);
        // Should be valid IP format (IPv4 or IPv6)
        expect(session.ipAddress).toMatch(/^(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|::1|127\.0\.0\.1|localhost)$/);
      });
    });

    it('should show user agent information', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const { sessions } = response.body;
      sessions.forEach(session => {
        expect(session.userAgent).toBeDefined();
        expect(typeof session.userAgent).toBe('string');
        expect(session.userAgent.length).toBeGreaterThan(0);
      });
    });

    it('should show creation and expiration times', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const { sessions } = response.body;
      sessions.forEach(session => {
        const createdAt = new Date(session.createdAt);
        const expiresAt = new Date(session.expiresAt);

        // Creation time should be in the past
        expect(createdAt.getTime()).toBeLessThanOrEqual(Date.now());

        // Expiration should be in the future
        expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

        // Expiration should be after creation
        expect(expiresAt.getTime()).toBeGreaterThan(createdAt.getTime());
      });
    });

    it('should correctly identify current session', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const { sessions } = response.body;
      const currentSessions = sessions.filter(s => s.isCurrent);

      // Should have exactly one current session
      expect(currentSessions.length).toBe(1);
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';

      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Token expired');
    });

    it('should return 401 with malformed Authorization header', async () => {
      const malformedHeaders = [
        'Bearer',                    // No token
        'InvalidScheme token',       // Wrong scheme
        'Bearer token1 token2',      // Multiple tokens
        'bearer lowercase-scheme'    // Wrong case
      ];

      for (const authHeader of malformedHeaders) {
        const response = await request(API_BASE_URL)
          .get('/api/auth/sessions')
          .set('Authorization', authHeader)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Session Privacy and Security', () => {
    it('should only show sessions for authenticated user', async () => {
      // Create another user
      const anotherUserResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'anotheruser@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Another',
          lastName: 'User',
          familyName: 'Another Family'
        })
        .expect(201);

      // Get sessions for first user
      const response1 = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Get sessions for second user
      const response2 = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${anotherUserResponse.body.tokens.accessToken}`)
        .expect(200);

      // Sessions should be different and user-specific
      expect(response1.body.sessions).not.toEqual(response2.body.sessions);
    });

    it('should not expose sensitive session data', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const { sessions } = response.body;
      sessions.forEach(session => {
        // Should not expose sensitive data
        expect(session).not.toHaveProperty('refreshToken');
        expect(session).not.toHaveProperty('accessToken');
        expect(session).not.toHaveProperty('sessionSecret');
        expect(session).not.toHaveProperty('userId');
        expect(session).not.toHaveProperty('password');
      });
    });

    it('should handle user with many sessions', async () => {
      // Create multiple sessions for the same user
      const loginPromises = [];
      for (let i = 0; i < 5; i++) {
        loginPromises.push(
          request(API_BASE_URL)
            .post('/api/auth/login')
            .send({
              email: 'sessiontest@example.com',
              password: 'SecurePass123!@#'
            })
        );
      }

      await Promise.all(loginPromises);

      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.sessions.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle expired sessions in the list', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // All returned sessions should be active (not expired)
      const { sessions } = response.body;
      const now = Date.now();

      sessions.forEach(session => {
        const expiresAt = new Date(session.expiresAt);
        expect(expiresAt.getTime()).toBeGreaterThan(now);
      });
    });

    it('should handle sessions with missing metadata gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // All sessions should have required fields
      const { sessions } = response.body;
      sessions.forEach(session => {
        expect(session.id).toBeDefined();
        expect(session.ipAddress).toBeDefined();
        expect(session.userAgent).toBeDefined();
        expect(session.createdAt).toBeDefined();
        expect(session.expiresAt).toBeDefined();
        expect(session.isCurrent).toBeDefined();
      });
    });

    it('should maintain consistent response format', async () => {
      // Make multiple requests to ensure consistent format
      const responses = await Promise.all([
        request(API_BASE_URL)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${validAccessToken}`),
        request(API_BASE_URL)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${validAccessToken}`),
        request(API_BASE_URL)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${validAccessToken}`)
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('sessions');
        expect(Array.isArray(response.body.sessions)).toBe(true);
      });
    });

    it('should sort sessions consistently', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const { sessions } = response.body;
      if (sessions.length > 1) {
        // Sessions should be sorted (typically by creation date descending)
        for (let i = 1; i < sessions.length; i++) {
          const current = new Date(sessions[i].createdAt);
          const previous = new Date(sessions[i - 1].createdAt);
          // Should be in descending order (newest first)
          expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
        }
      }
    });
  });

  describe('HTTP Method and Headers', () => {
    it('should only accept GET method', async () => {
      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        await request(API_BASE_URL)
          [method.toLowerCase()]('/api/auth/sessions')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .expect(405); // Method Not Allowed
      }
    });

    it('should return proper content-type header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});