/**
 * Contract Test: POST /api/auth/refresh
 * Task: T030 - Authentication refresh token endpoint contract validation
 *
 * This test validates the refresh token API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/refresh', () => {
  let authTokens: any;
  const testUser = {
    email: 'refresh@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Refresh',
    lastName: 'Test',
    familyName: 'Refresh Family'
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

  describe('Valid Refresh Request', () => {
    it('should return 200 with valid refresh token', async () => {
      const refreshRequest = {
        refreshToken: authTokens.refreshToken
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send(refreshRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('tokens');
      
      const { tokens } = response.body;
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens).toHaveProperty('tokenType', 'Bearer');

      // Validate data types
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
      expect(tokens.tokenType).toBe('Bearer');

      // New tokens should be different from old ones
      expect(tokens.accessToken).not.toBe(authTokens.accessToken);
      expect(tokens.refreshToken).not.toBe(authTokens.refreshToken);
    });

    it('should provide new valid access token', async () => {
      const refreshRequest = {
        refreshToken: authTokens.refreshToken
      };

      const refreshResponse = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send(refreshRequest)
        .expect(200);

      const newTokens = refreshResponse.body.tokens;

      // New access token should work for authenticated requests
      const profileResponse = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('id');
      expect(profileResponse.body.email).toBe(testUser.email);
    });

    it('should invalidate old refresh token after use', async () => {
      const refreshRequest = {
        refreshToken: authTokens.refreshToken
      };

      // Use refresh token once
      await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send(refreshRequest)
        .expect(200);

      // Try to use same refresh token again - should fail
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send(refreshRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should maintain same expiration time for new tokens', async () => {
      const refreshRequest = {
        refreshToken: authTokens.refreshToken
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send(refreshRequest)
        .expect(200);

      const newTokens = response.body.tokens;
      
      // New tokens should have similar expiration time as original
      expect(newTokens.expiresIn).toBeCloseTo(authTokens.expiresIn, -2); // Within ~100 seconds
    });
  });

  describe('Invalid Refresh Requests', () => {
    it('should return 400 for missing refresh token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 for invalid refresh token', async () => {
      const invalidTokens = [
        'invalid-refresh-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'null',
        '12345'
      ];

      for (const refreshToken of invalidTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/refresh')
          .send({ refreshToken })
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid refresh token');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 401 for expired refresh token', async () => {
      // Simulate expired refresh token (this would typically be handled by JWT expiration)
      const expiredRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxfQ.invalid';
      
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredRefreshToken })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('should return 401 for refresh token from different user', async () => {
      // Create second user and get their refresh token
      const secondUser = {
        email: 'second@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Second',
        lastName: 'User',
        familyName: 'Second Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(secondUser);

      const secondLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: secondUser.email,
          password: secondUser.password
        });

      const secondUserTokens = secondLoginResponse.body.tokens;

      // Try to use second user's refresh token - should fail
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: secondUserTokens.refreshToken })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });
  });

  describe('Token Rotation Security', () => {
    it('should rotate refresh token on each use', async () => {
      const firstRefresh = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken })
        .expect(200);

      const firstNewTokens = firstRefresh.body.tokens;

      const secondRefresh = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: firstNewTokens.refreshToken })
        .expect(200);

      const secondNewTokens = secondRefresh.body.tokens;

      // All refresh tokens should be different
      expect(authTokens.refreshToken).not.toBe(firstNewTokens.refreshToken);
      expect(firstNewTokens.refreshToken).not.toBe(secondNewTokens.refreshToken);
      expect(authTokens.refreshToken).not.toBe(secondNewTokens.refreshToken);
    });

    it('should detect refresh token reuse attempts', async () => {
      // Use refresh token once
      const refreshResponse = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken })
        .expect(200);

      // Try to reuse the old refresh token (potential security threat)
      const reuseResponse = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken })
        .expect(401);

      expect(reuseResponse.body.error).toBe('Invalid refresh token');

      // The new refresh token should also be invalidated as a security measure
      const newTokenReuseResponse = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshResponse.body.tokens.refreshToken })
        .expect(401);

      expect(newTokenReuseResponse.body.error).toBe('Invalid refresh token');
    });
  });

  describe('Content-Type and Security', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send(`refreshToken=${authTokens.refreshToken}`)
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should not require Bearer authentication (uses refresh token)', async () => {
      // This endpoint authenticates via refresh token in body, not Authorization header
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid refresh requests', async () => {
      // Make multiple refresh requests in quick succession
      const refreshPromises = [];
      for (let i = 0; i < 3; i++) {
        refreshPromises.push(
          request(API_BASE_URL)
            .post('/api/auth/refresh')
            .send({ refreshToken: authTokens.refreshToken })
        );
      }

      const responses = await Promise.all(refreshPromises);
      
      // Only one should succeed (first one), others should fail
      const successCount = responses.filter(r => r.status === 200).length;
      const failureCount = responses.filter(r => r.status === 401).length;
      
      expect(successCount).toBe(1);
      expect(failureCount).toBe(2);
    });
  });
});
