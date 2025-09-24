/**
 * Contract Test: POST /api/auth/logout
 * Task: T029 - Authentication logout endpoint contract validation
 *
 * This test validates the logout API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/logout', () => {
  let authTokens: any;
  const testUser = {
    email: 'logout@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Logout',
    lastName: 'Test',
    familyName: 'Logout Family'
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

  describe('Valid Logout Request', () => {
    it('should return 200 with valid authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });

    it('should invalidate the current session', async () => {
      // First logout
      await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Try to use the same token - should be invalid
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should not affect other sessions', async () => {
      // Login again to create second session
      const secondLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const secondTokens = secondLoginResponse.body.tokens;

      // Logout first session
      await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Second session should still be valid
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${secondTokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Invalid Logout Requests', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
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
          .post('/api/auth/logout')
          .set('Authorization', token.startsWith('Bearer') ? token : `Bearer ${token}`)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body.error).toBe('Not authenticated');
      }
    });

    it('should return 401 with expired token', async () => {
      // This would need a way to generate expired tokens or wait for expiration
      // For now, we'll simulate with an obviously expired token structure
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxfQ.invalid';
      
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
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
          .post('/api/auth/logout')
          .set('Authorization', header)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body.error).toBe('Not authenticated');
      }
    });
  });

  describe('Idempotency', () => {
    it('should handle double logout gracefully', async () => {
      // First logout - should succeed
      await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Second logout - should fail with 401 (token invalid)
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require Bearer token authentication', async () => {
      // Endpoint requires authentication per OpenAPI spec
      await request(API_BASE_URL)
        .post('/api/auth/logout')
        .expect(401);
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Session Cleanup', () => {
    it('should remove session from database', async () => {
      // Logout should clean up session record
      await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Verify session is removed (indirect verification via token invalidation)
      const response = await request(API_BASE_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });
});
