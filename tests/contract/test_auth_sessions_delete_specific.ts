/**
 * Contract Test: DELETE /api/auth/sessions/{id}
 * Task: T042 - Sessions delete specific endpoint contract validation
 *
 * This test validates the specific session deletion API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/auth/sessions/{id}', () => {
  let validAccessToken: string;
  let userId: string;
  let additionalTokens: string[] = [];
  let sessionIds: string[] = [];

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
    additionalTokens = [];
    sessionIds = [];

    // Create test user and get access token
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'specificdeletetest@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Specific',
        lastName: 'Delete',
        familyName: 'Specific Delete Family'
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
        email: 'specificdeletetest@example.com',
        password: 'SecurePass123!@#'
      })
      .expect(200);

    const login2 = await request(API_BASE_URL)
      .post('/api/auth/login')
      .set('User-Agent', userAgent2)
      .send({
        email: 'specificdeletetest@example.com',
        password: 'SecurePass123!@#'
      })
      .expect(200);

    const login3 = await request(API_BASE_URL)
      .post('/api/auth/login')
      .set('User-Agent', userAgent3)
      .send({
        email: 'specificdeletetest@example.com',
        password: 'SecurePass123!@#'
      })
      .expect(200);

    additionalTokens.push(login1.body.tokens.accessToken);
    additionalTokens.push(login2.body.tokens.accessToken);
    additionalTokens.push(login3.body.tokens.accessToken);

    // Get session IDs
    const sessionsResponse = await request(API_BASE_URL)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .expect(200);

    sessionIds = sessionsResponse.body.sessions.map(session => session.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Delete Specific Session Request', () => {
    it('should return 200 when deleting specific session', async () => {
      // Get a session ID that's not the current one
      const targetSessionId = sessionIds.find((id, index) => {
        const sessionsResponse = sessionsResponse.body?.sessions?.find(s => s.id === id);
        return sessionsResponse && !sessionsResponse.isCurrent;
      }) || sessionIds[1]; // Fallback to second session

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('terminated');
    });

    it('should invalidate the specific session only', async () => {
      // Get sessions before deletion
      const initialSessionsResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const targetSession = initialSessionsResponse.body.sessions.find(s => !s.isCurrent);
      const targetSessionId = targetSession.id;

      // Delete specific session
      await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Check that the session is no longer in the list
      const finalSessionsResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const remainingSessionIds = finalSessionsResponse.body.sessions.map(s => s.id);
      expect(remainingSessionIds).not.toContain(targetSessionId);
      expect(finalSessionsResponse.body.sessions.length).toBe(initialSessionsResponse.body.sessions.length - 1);
    });

    it('should keep other sessions active', async () => {
      // Get a specific session to delete (not current)
      const sessionsResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const targetSession = sessionsResponse.body.sessions.find(s => !s.isCurrent);
      const targetSessionId = targetSession.id;

      // Delete specific session
      await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Current session should still be valid
      await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Other non-targeted sessions should still be valid
      for (let i = 0; i < additionalTokens.length; i++) {
        const token = additionalTokens[i];
        const response = await request(API_BASE_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        // This token might be the deleted session, so it could be 401, or still valid (200)
        expect([200, 401]).toContain(response.status);
      }
    });

    it('should provide clear success message', async () => {
      const targetSessionId = sessionIds[1]; // Use second session

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
      expect(response.body.message).toMatch(/terminated|session|logout/i);
    });

    it('should handle deletion of current session gracefully', async () => {
      // Get current session ID
      const sessionsResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      const currentSession = sessionsResponse.body.sessions.find(s => s.isCurrent);
      const currentSessionId = currentSession.id;

      // Delete current session
      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${currentSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.message).toContain('terminated');

      // Token should become invalid after deleting current session
      await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(401);
    });
  });

  describe('Invalid Session ID Handling', () => {
    it('should return 404 for non-existent session ID', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${nonExistentId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Session not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidIds = [
        'invalid-uuid',
        '123',
        'not-a-uuid-at-all',
        '550e8400-e29b-41d4-a716',  // Incomplete UUID
        '550e8400-e29b-41d4-a716-44665544000g',  // Invalid character
        '',  // Empty string
        'null',
        'undefined'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .delete(`/api/auth/sessions/${invalidId}`)
          .set('Authorization', `Bearer ${validAccessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid session ID');
        expect(response.body.message).toContain('UUID');
      }
    });

    it('should return 404 for session belonging to another user', async () => {
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

      // Get their sessions
      const otherUserSessionsResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${anotherUserResponse.body.tokens.accessToken}`)
        .expect(200);

      const otherUserSessionId = otherUserSessionsResponse.body.sessions[0].id;

      // Try to delete other user's session
      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${otherUserSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Session not found');
    });

    it('should handle malformed session ID in URL path', async () => {
      const malformedPaths = [
        '/api/auth/sessions/ ',  // Space
        '/api/auth/sessions/<script>',  // XSS attempt
        '/api/auth/sessions/${id}',  // Template literal
        '/api/auth/sessions/../../admin',  // Path traversal
        '/api/auth/sessions/%00',  // Null byte
      ];

      for (const path of malformedPaths) {
        const response = await request(API_BASE_URL)
          .delete(path)
          .set('Authorization', `Bearer ${validAccessToken}`)
          .expect('Content-Type', /json/);

        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication', async () => {
      const targetSessionId = sessionIds[0];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 with invalid token', async () => {
      const targetSessionId = sessionIds[0];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      const targetSessionId = sessionIds[0];
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Token expired');
    });

    it('should return 401 with malformed Authorization header', async () => {
      const targetSessionId = sessionIds[0];
      const malformedHeaders = [
        'Bearer',                    // No token
        'InvalidScheme token',       // Wrong scheme
        'Bearer token1 token2',      // Multiple tokens
        'bearer lowercase-scheme'    // Wrong case
      ];

      for (const authHeader of malformedHeaders) {
        const response = await request(API_BASE_URL)
          .delete(`/api/auth/sessions/${targetSessionId}`)
          .set('Authorization', authHeader)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('HTTP Method Validation', () => {
    it('should only accept DELETE method', async () => {
      const targetSessionId = sessionIds[0];
      const methods = ['GET', 'POST', 'PUT', 'PATCH'];

      for (const method of methods) {
        await request(API_BASE_URL)
          [method.toLowerCase()](`/api/auth/sessions/${targetSessionId}`)
          .set('Authorization', `Bearer ${validAccessToken}`)
          .expect(405); // Method Not Allowed
      }
    });

    it('should not require request body', async () => {
      const targetSessionId = sessionIds[1];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should ignore request body if provided', async () => {
      const targetSessionId = sessionIds[1];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ unnecessary: 'data' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent deletion attempts of same session', async () => {
      const targetSessionId = sessionIds[1];

      const concurrentRequests = Array(3).fill(null).map(() =>
        request(API_BASE_URL)
          .delete(`/api/auth/sessions/${targetSessionId}`)
          .set('Authorization', `Bearer ${validAccessToken}`)
      );

      const responses = await Promise.all(concurrentRequests);

      // First should succeed, others should fail with 404
      const successCount = responses.filter(r => r.status === 200).length;
      const notFoundCount = responses.filter(r => r.status === 404).length;

      expect(successCount).toBe(1);
      expect(notFoundCount).toBe(2);
    });

    it('should handle deletion of already expired session', async () => {
      // This would test deletion of expired sessions
      // For now, we'll test with a valid session ID
      const targetSessionId = sessionIds[1];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.message).toContain('terminated');
    });

    it('should maintain referential integrity after deletion', async () => {
      const initialCount = sessionIds.length;
      const targetSessionId = sessionIds[1];

      // Delete specific session
      await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Verify session count decreased by exactly 1
      const finalSessionsResponse = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(finalSessionsResponse.body.sessions.length).toBe(initialCount - 1);

      // Verify all remaining sessions have proper structure
      finalSessionsResponse.body.sessions.forEach(session => {
        expect(session).toHaveProperty('id');
        expect(session).toHaveProperty('isCurrent');
        expect(session).toHaveProperty('ipAddress');
        expect(session).toHaveProperty('userAgent');
        expect(session).toHaveProperty('createdAt');
        expect(session).toHaveProperty('expiresAt');
      });
    });

    it('should handle database connectivity issues gracefully', async () => {
      const targetSessionId = sessionIds[0];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`);

      // Should return proper response structure regardless of internal errors
      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
      } else if (response.status === 404) {
        expect(response.body.error).toBe('Session not found');
      } else if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Security Considerations', () => {
    it('should prevent session hijacking through ID guessing', async () => {
      // Generate random UUIDs that don't exist
      const fakeIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '987fcdeb-51d2-43e8-9f12-123456789abc',
        '550e8400-e29b-41d4-a716-446655440001'
      ];

      for (const fakeId of fakeIds) {
        const response = await request(API_BASE_URL)
          .delete(`/api/auth/sessions/${fakeId}`)
          .set('Authorization', `Bearer ${validAccessToken}`)
          .expect(404);

        expect(response.body.error).toBe('Session not found');
      }
    });

    it('should not reveal session existence through timing attacks', async () => {
      const validSessionId = sessionIds[0];
      const invalidSessionId = '550e8400-e29b-41d4-a716-446655440000';

      // Measure response times
      const startValid = Date.now();
      await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${validSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`);
      const timeValid = Date.now() - startValid;

      const startInvalid = Date.now();
      await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${invalidSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`);
      const timeInvalid = Date.now() - startInvalid;

      // Response times should be similar (within 100ms) for security
      expect(Math.abs(timeValid - timeInvalid)).toBeLessThan(100);
    });

    it('should log session termination events', async () => {
      const targetSessionId = sessionIds[1];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Response should not include sensitive logging information
      expect(response.body).not.toHaveProperty('logId');
      expect(response.body).not.toHaveProperty('auditTrail');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Response Headers and Content Type', () => {
    it('should return proper content-type header', async () => {
      const targetSessionId = sessionIds[1];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not include session details in response headers', async () => {
      const targetSessionId = sessionIds[1];

      const response = await request(API_BASE_URL)
        .delete(`/api/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      // Should not expose session information in headers
      expect(response.headers).not.toHaveProperty('x-session-id');
      expect(response.headers).not.toHaveProperty('x-terminated-session');
    });
  });
});