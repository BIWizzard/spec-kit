/**
 * Contract Test: POST /api/auth/reset-password
 * Task: T035 - Password reset endpoint contract validation
 *
 * This test validates the password reset API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/reset-password', () => {
  let testUserEmail: string = 'resettest@example.com';
  let validResetToken: string = 'valid-reset-token-12345';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user for password reset
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: testUserEmail,
        password: 'OldPassword123!@#',
        firstName: 'Reset',
        lastName: 'Test',
        familyName: 'Reset Test Family'
      })
      .expect(201);

    // Generate reset token (would be done via forgot-password endpoint)
    await request(API_BASE_URL)
      .post('/api/auth/forgot-password')
      .send({ email: testUserEmail })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Password Reset Request', () => {
    const validResetRequest = {
      token: validResetToken,
      newPassword: 'NewSecurePass123!@#'
    };

    it('should return 200 with valid token and password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send(validResetRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reset');
    });

    it('should allow login with new password after reset', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send(validResetRequest)
        .expect(200);

      // Try to login with new password
      const loginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: validResetRequest.newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('tokens');
    });

    it('should reject old password after reset', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send(validResetRequest)
        .expect(200);

      // Try to login with old password
      await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'OldPassword123!@#'
        })
        .expect(401);
    });

    it('should invalidate reset token after use', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send(validResetRequest)
        .expect(200);

      // Try to use same token again
      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: validResetToken,
          newPassword: 'AnotherNewPass123!@#'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('Invalid Password Reset Requests', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { newPassword: 'NewSecurePass123!@#' },  // Missing token
        { token: validResetToken },  // Missing newPassword
        {}  // Missing both
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/reset-password')
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for invalid token', async () => {
      const invalidTokens = [
        'invalid-token',
        'expired-token-12345',
        'malformed-token',
        '',
        'a'.repeat(1000)  // Extremely long token
      ];

      for (const token of invalidTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/reset-password')
          .send({
            token,
            newPassword: 'NewSecurePass123!@#'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid or expired token');
      }
    });

    it('should return 400 for weak new password', async () => {
      const weakPasswords = [
        'short',                           // Too short
        'nouppercase123!',                 // No uppercase
        'NOLOWERCASE123!',                 // No lowercase
        'NoNumbers!@#',                    // No numbers
        'NoSpecialChars123ABC',            // No special characters
        'a'.repeat(129)                    // Too long (exceeds maxLength 128)
      ];

      for (const newPassword of weakPasswords) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/reset-password')
          .send({
            token: validResetToken,
            newPassword
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('password');
      }
    });

    it('should return 400 for expired reset token', async () => {
      const expiredToken = 'expired-reset-token-12345';

      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'NewSecurePass123!@#'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired token');
      expect(response.body.message).toContain('expired');
    });

    it('should return 400 for same password as current', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: validResetToken,
          newPassword: 'OldPassword123!@#'  // Same as original password
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Password must be different');
      expect(response.body.message).toContain('different');
    });
  });

  describe('Token Security Validation', () => {
    it('should validate token format', async () => {
      const malformedTokens = [
        null,
        undefined,
        123,
        [],
        {},
        'token with spaces',
        'token\nwith\nnewlines'
      ];

      for (const token of malformedTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/reset-password')
          .send({
            token,
            newPassword: 'NewSecurePass123!@#'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should handle token case sensitivity correctly', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: validResetToken.toUpperCase(),  // Different case
          newPassword: 'NewSecurePass123!@#'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should reject tokens with embedded code injection attempts', async () => {
      const maliciousTokens = [
        'token; DROP TABLE users;',
        'token<script>alert("xss")</script>',
        'token${process.exit(1)}',
        'token\x00null-byte'
      ];

      for (const token of maliciousTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/reset-password')
          .send({
            token,
            newPassword: 'NewSecurePass123!@#'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid or expired token');
      }
    });
  });

  describe('Password Validation Edge Cases', () => {
    it('should enforce minimum password length of 12', async () => {
      const shortPassword = 'Short1!';  // Less than 12 characters

      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: validResetToken,
          newPassword: shortPassword
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('12');
    });

    it('should enforce maximum password length of 128', async () => {
      const longPassword = 'A1!' + 'a'.repeat(125);  // 129 characters

      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: validResetToken,
          newPassword: longPassword
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('128');
    });

    it('should handle unicode characters in password', async () => {
      const unicodePassword = 'PassWord123!@#测试';

      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: validResetToken,
          newPassword: unicodePassword
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('reset');
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send('token=test&newPassword=NewSecurePass123!@#')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should not require authentication (security: [])', async () => {
      // This endpoint should be accessible without Bearer token
      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: validResetToken,
          newPassword: 'NewSecurePass123!@#'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle empty request body gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });
});