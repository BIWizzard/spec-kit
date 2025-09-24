/**
 * Contract Test: POST /api/auth/verify-email
 * Task: T037 - Email verification endpoint contract validation
 *
 * This test validates the email verification API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/verify-email', () => {
  let testUserEmail: string = 'verifytest@example.com';
  let validVerificationToken: string = 'valid-verification-token-12345';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user with unverified email
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: testUserEmail,
        password: 'SecurePass123!@#',
        firstName: 'Verify',
        lastName: 'Test',
        familyName: 'Verify Test Family'
      })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Email Verification Request', () => {
    const validVerifyRequest = {
      token: validVerificationToken
    };

    it('should return 200 with valid verification token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send(validVerifyRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('verified');
    });

    it('should mark email as verified in user profile', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send(validVerifyRequest)
        .expect(200);

      // Login and check user profile
      const loginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'SecurePass123!@#'
        })
        .expect(200);

      const profileResponse = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.tokens.accessToken}`)
        .expect(200);

      expect(profileResponse.body.emailVerified).toBe(true);
    });

    it('should accept verification token only once', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send(validVerifyRequest)
        .expect(200);

      // Try to use same token again
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send(validVerifyRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired verification token');
    });

    it('should handle successful verification with descriptive message', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send(validVerifyRequest)
        .expect(200);

      expect(response.body.message).toMatch(/email.*verified|verified.*email/i);
    });
  });

  describe('Invalid Email Verification Requests', () => {
    it('should return 400 for missing token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid token format', async () => {
      const invalidTokens = [
        '',                           // Empty string
        null,                         // Null value
        undefined,                    // Undefined value
        123,                          // Number
        [],                           // Array
        {},                           // Object
        'token with spaces',          // Spaces
        'token\nwith\nnewlines',      // Newlines
        'a'.repeat(1000)              // Extremely long
      ];

      for (const token of invalidTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/verify-email')
          .send({ token })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for non-existent token', async () => {
      const nonExistentTokens = [
        'non-existent-token',
        'fake-token-12345',
        'malformed-token',
        'expired-but-formatted-token'
      ];

      for (const token of nonExistentTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/verify-email')
          .send({ token })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid or expired verification token');
      }
    });

    it('should return 400 for expired verification token', async () => {
      const expiredToken = 'expired-verification-token-12345';

      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: expiredToken })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired verification token');
      expect(response.body.message).toContain('expired');
    });

    it('should return 400 for already verified email', async () => {
      // Verify email first
      await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: validVerificationToken })
        .expect(200);

      // Try to verify again with different token (for same user)
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: 'another-token-12345' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Email already verified');
      expect(response.body.message).toContain('already verified');
    });
  });

  describe('Token Security Validation', () => {
    it('should reject tokens with malicious content', async () => {
      const maliciousTokens = [
        'token; DROP TABLE users;',
        'token<script>alert("xss")</script>',
        'token${process.exit(1)}',
        'token\x00null-byte',
        '../../../etc/passwd',
        'token||rm -rf /',
        'token`whoami`'
      ];

      for (const token of maliciousTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/verify-email')
          .send({ token })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should handle token case sensitivity correctly', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: validVerificationToken.toUpperCase() })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired verification token');
    });

    it('should validate token length constraints', async () => {
      const constraintTests = [
        { token: 'a', description: 'too short' },
        { token: 'a'.repeat(1024), description: 'too long' }
      ];

      for (const test of constraintTests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/verify-email')
          .send({ token: test.token })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent verification attempts', async () => {
      // Simulate multiple concurrent requests with same token
      const requests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .post('/api/auth/verify-email')
          .send({ token: validVerificationToken })
      );

      const responses = await Promise.all(requests);

      // Only one should succeed, others should fail
      const successfulResponses = responses.filter(r => r.status === 200);
      const failedResponses = responses.filter(r => r.status === 400);

      expect(successfulResponses).toHaveLength(1);
      expect(failedResponses).toHaveLength(4);
    });

    it('should provide consistent error messages for invalid tokens', async () => {
      const invalidTokens = [
        'invalid-token-1',
        'invalid-token-2',
        'different-invalid-format'
      ];

      const errorMessages = [];
      for (const token of invalidTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/verify-email')
          .send({ token })
          .expect(400);

        errorMessages.push(response.body.error);
      }

      // All error messages should be consistent
      const uniqueErrors = [...new Set(errorMessages)];
      expect(uniqueErrors).toHaveLength(1);
      expect(uniqueErrors[0]).toBe('Invalid or expired verification token');
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would be handled at the infrastructure level
      // but we can test that the error response structure is maintained
      // even when internal errors occur
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: 'test-token-for-db-error' })
        .expect('Content-Type', /json/);

      // Should always return proper error structure
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send('token=test-token')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should not require authentication (security: [])', async () => {
      // This endpoint should be accessible without Bearer token
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: validVerificationToken })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle empty request body gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should maintain security headers in responses', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: validVerificationToken });

      // Security headers should be present (implementation-specific)
      expect(response.headers).toHaveProperty('content-type');
    });
  });

  describe('User Experience Validation', () => {
    it('should provide clear success message', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: validVerificationToken })
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it('should provide helpful error messages', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });
  });
});