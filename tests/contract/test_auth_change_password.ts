/**
 * Contract Test: POST /api/auth/change-password
 * Task: T036 - Change password endpoint contract validation
 *
 * This test validates the change password API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/change-password', () => {
  let validAccessToken: string;
  let userId: string;
  let currentPassword: string = 'CurrentPass123!@#';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'changepasstest@example.com',
        password: currentPassword,
        firstName: 'Change',
        lastName: 'Password',
        familyName: 'Change Password Family'
      })
      .expect(201);

    validAccessToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Change Password Request', () => {
    const validChangeRequest = {
      currentPassword: 'CurrentPass123!@#',
      newPassword: 'NewSecurePass123!@#'
    };

    it('should return 200 with valid current and new password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validChangeRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('changed');
    });

    it('should allow login with new password after change', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validChangeRequest)
        .expect(200);

      // Try to login with new password
      const loginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'changepasstest@example.com',
          password: validChangeRequest.newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('tokens');
    });

    it('should reject old password after change', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validChangeRequest)
        .expect(200);

      // Try to login with old password
      await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'changepasstest@example.com',
          password: currentPassword
        })
        .expect(401);
    });

    it('should maintain user session after password change', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validChangeRequest)
        .expect(200);

      // Current token should still be valid
      const profileResponse = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('id');
    });

    it('should accept minimum valid password length (12 characters)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          currentPassword,
          newPassword: 'NewPass123!@'  // Exactly 12 characters
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('changed');
    });

    it('should accept maximum valid password length (128 characters)', async () => {
      const maxPassword = 'A1!' + 'a'.repeat(125);  // Exactly 128 characters

      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          currentPassword,
          newPassword: maxPassword
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('changed');
    });
  });

  describe('Invalid Change Password Requests', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { newPassword: 'NewSecurePass123!@#' },  // Missing currentPassword
        { currentPassword },  // Missing newPassword
        {}  // Missing both
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for incorrect current password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          currentPassword: 'WrongCurrentPass123!',
          newPassword: 'NewSecurePass123!@#'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid current password');
      expect(response.body.message).toContain('current password');
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
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send({
            currentPassword,
            newPassword
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('password');
      }
    });

    it('should return 400 for same current and new password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          currentPassword,
          newPassword: currentPassword  // Same password
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Password must be different');
      expect(response.body.message).toContain('different');
    });

    it('should return 400 for empty passwords', async () => {
      const emptyPasswordTests = [
        { currentPassword: '', newPassword: 'NewSecurePass123!@#' },
        { currentPassword, newPassword: '' },
        { currentPassword: '', newPassword: '' }
      ];

      for (const testCase of emptyPasswordTests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send(testCase)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .send({
          currentPassword,
          newPassword: 'NewSecurePass123!@#'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          currentPassword,
          newPassword: 'NewSecurePass123!@#'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';

      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          currentPassword,
          newPassword: 'NewSecurePass123!@#'
        })
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
          .post('/api/auth/change-password')
          .set('Authorization', authHeader)
          .send({
            currentPassword,
            newPassword: 'NewSecurePass123!@#'
          })
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Password Validation Edge Cases', () => {
    it('should handle unicode characters in passwords', async () => {
      const unicodePassword = 'NewPassWord123!@#测试';

      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          currentPassword,
          newPassword: unicodePassword
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('changed');
    });

    it('should handle special characters in passwords', async () => {
      const specialCharPassword = 'NewPass123!@#$%^&*()_+-=[]{}|;:,.<>?';

      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          currentPassword,
          newPassword: specialCharPassword
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('changed');
    });

    it('should enforce password complexity requirements', async () => {
      const complexityTests = [
        { password: 'NoUpperCase123!@#', missing: 'uppercase' },
        { password: 'NOLOWERCASE123!@#', missing: 'lowercase' },
        { password: 'NoNumbersTest!@#', missing: 'numbers' },
        { password: 'NoSpecialChars123ABC', missing: 'special characters' }
      ];

      for (const test of complexityTests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send({
            currentPassword,
            newPassword: test.password
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('password');
      }
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send('currentPassword=test&newPassword=NewSecurePass123!@#')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should handle empty request body gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Rate Limiting Considerations', () => {
    it('should handle multiple password change attempts', async () => {
      // Test that multiple valid password changes work
      let currentPass = currentPassword;

      for (let i = 1; i <= 3; i++) {
        const newPass = `NewPassword${i}123!@#`;

        await request(API_BASE_URL)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send({
            currentPassword: currentPass,
            newPassword: newPass
          })
          .expect(200);

        currentPass = newPass;
      }
    });
  });
});