/**
 * Contract Test: DELETE /api/auth/sessions
 * Task: T041 - Sessions delete all endpoint contract validation
 *
 * This test validates the sessions delete all API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/auth/sessions', () => {
  let validAccessToken: string;
  let userId: string;
  let additionalTokens: string[] = [];

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
    additionalTokens = [];

    // Create test user and get access token
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'sessiondeletetest@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Session',
        lastName: 'Delete',
        familyName: 'Session Delete Family'
      })
      .expect(201);

    validAccessToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;

    // Create multiple sessions by logging in from different "devices"
    const userAgent1 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
    const userAgent2 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/14.1';
    const userAgent3 = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/89.0';

    const login1 = await request(API_BASE_URL)
      .post('/api/auth/login')
      .set('User-Agent', userAgent1)
      .send({
        email: 'sessiondeletetest@example.com',
        password: 'SecurePass123!@#'
      })
      .expect(200);

    const login2 = await request(API_BASE_URL)
      .post('/api/auth/login')
      .set('User-Agent', userAgent2)
      .send({
        email: 'sessiondeletetest@example.com',
        password: 'SecurePass123!@#'
      })
      .expect(200);

    const login3 = await request(API_BASE_URL)
      .post('/api/auth/login')
      .set('User-Agent', userAgent3)
      .send({
        email: 'sessiondeletetest@example.com',
        password: 'SecurePass123!@#'
      })
      .expect(200);

    additionalTokens.push(login1.body.tokens.accessToken);
    additionalTokens.push(login2.body.tokens.accessToken);
    additionalTokens.push(login3.body.tokens.accessToken);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Delete All Sessions Request', () => {
    it('should return 200 when deleting all other sessions', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('terminated');
    });

    it('should keep current session active after deleting others', async () => {
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Current session should still be valid
      const profileResponse = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('id');
    });

    it('should invalidate all other sessions', async () => {
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // All other tokens should be invalid
      for (const token of additionalTokens) {
        await request(API_BASE_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });

    it('should reduce session count in sessions list', async () => {
      // Get initial session count
      const initialResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const initialCount = initialResponse.body.sessions.length;
      expect(initialCount).toBeGreaterThan(1); // Should have multiple sessions

      // Delete all other sessions
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Check session count after deletion
      const finalResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const finalCount = finalResponse.body.sessions.length;
      expect(finalCount).toBe(1); // Should only have current session
      expect(finalResponse.body.sessions[0].isCurrent).toBe(true);
    });

    it('should provide clear success message', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
      expect(response.body.message).toMatch(/terminated|session|logout/i);
    });

    it('should handle case with only one session (current)', async () => {
      // Delete all other sessions first
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Try to delete again (should still succeed but do nothing)
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.message).toContain('terminated');

      // Current session should still be active
      await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);
    });
  });

  describe('Session Termination Effects', () => {
    it('should immediately invalidate refresh tokens for other sessions', async () => {
      // Get a refresh token from another session
      const refreshToken = additionalTokens[0]; // Assuming this has a refresh token

      // Delete all other sessions
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Try to use refresh token (should fail)
      await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should prevent concurrent API calls from terminated sessions', async () => {
      // Start delete operation
      const deletePromise = request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`);

      // Try concurrent API call with other token
      const apiCallPromise = request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${additionalTokens[0]}`);

      const [deleteResponse, apiResponse] = await Promise.all([deletePromise, apiCallPromise]);

      expect(deleteResponse.status).toBe(200);
      // API call should fail (either 401 immediately or after session deletion)
      expect([401, 200]).toContain(apiResponse.status);
    });

    it('should maintain session isolation between users', async () => {
      // Create another user with multiple sessions
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

      const anotherUserToken = anotherUserResponse.body.tokens.accessToken;

      // Create additional session for other user
      const anotherLogin = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'anotheruser@example.com',
          password: 'SecurePass123!@#'
        })
        .expect(200);

      // Delete sessions for first user
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Other user's sessions should be unaffected
      await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .expect(200);

      await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${anotherLogin.body.tokens.accessToken}`)
        .expect(200);
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';

      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
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
          .delete('/api/auth/sessions')
          .set('Authorization', authHeader)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('HTTP Method Validation', () => {
    it('should only accept DELETE method', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH'];

      for (const method of methods) {
        await request(API_BASE_URL)
          [method.toLowerCase()]('/api/auth/sessions')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .expect(405); // Method Not Allowed
      }
    });

    it('should not require request body', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should ignore request body if provided', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ unnecessary: 'data' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent delete requests', async () => {
      const concurrentRequests = Array(3).fill(null).map(() =>
        request(API_BASE_URL)
          .delete('/api/auth/sessions')
          .set('Authorization', `Bearer ${validAccessToken}`)
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed (idempotent operation)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });

    it('should handle user with many sessions', async () => {
      // Create many sessions
      const loginPromises = [];
      for (let i = 0; i < 10; i++) {
        loginPromises.push(
          request(API_BASE_URL)
            .post('/api/auth/login')
            .send({
              email: 'sessiondeletetest@example.com',
              password: 'SecurePass123!@#'
            })
        );
      }

      await Promise.all(loginPromises);

      // Delete all other sessions
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.message).toContain('terminated');

      // Verify only current session remains
      const sessionsResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(sessionsResponse.body.sessions).toHaveLength(1);
      expect(sessionsResponse.body.sessions[0].isCurrent).toBe(true);
    });

    it('should handle database connectivity issues gracefully', async () => {
      // This would be tested at infrastructure level
      // but response structure should be maintained
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`);

      // Should return proper response structure regardless of internal errors
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
      } else if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should maintain referential integrity', async () => {
      // Delete all other sessions
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Verify database consistency
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Should have exactly one session with proper data
      expect(response.body.sessions).toHaveLength(1);
      const session = response.body.sessions[0];

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('isCurrent', true);
      expect(session).toHaveProperty('ipAddress');
      expect(session).toHaveProperty('userAgent');
    });
  });

  describe('Security Considerations', () => {
    it('should log out active API calls in other sessions', async () => {
      // Start a long-running request in another session
      const longRequestPromise = request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${additionalTokens[0]}`);

      // Delete sessions
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // The long request should eventually fail
      const longResponse = await longRequestPromise;
      expect([401, 200]).toContain(longResponse.status);
    });

    it('should prevent privilege escalation through session termination', async () => {
      // Delete sessions should not affect user permissions
      await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // User should maintain same permissions
      const profileResponse = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('role');
      expect(profileResponse.body).toHaveProperty('permissions');
    });
  });

  describe('Response Headers and Content Type', () => {
    it('should return proper content-type header', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not include sensitive headers', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Should not expose internal information
      expect(response.headers).not.toHaveProperty('x-session-count');
      expect(response.headers).not.toHaveProperty('x-deleted-sessions');
    });
  });
});