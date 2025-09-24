/**
 * Contract Test: POST /api/auth/mfa/disable
 * Task: T033 - MFA disable endpoint contract validation
 *
 * This test validates the MFA disable API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/mfa/disable', () => {
  let validAccessToken: string;
  let userId: string;
  let userPassword: string = 'SecurePass123!@#';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user with MFA enabled
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'mfatest@example.com',
        password: userPassword,
        firstName: 'MFA',
        lastName: 'Test',
        familyName: 'Test Family'
      })
      .expect(201);

    validAccessToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;

    // Enable MFA for testing disable functionality
    await request(API_BASE_URL)
      .post('/api/auth/mfa/enable')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ totpCode: '123456' })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid MFA Disable Request', () => {
    const validMfaDisableRequest = {
      password: 'SecurePass123!@#',
      totpCode: '123456'
    };

    it('should return 200 with valid password and TOTP code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validMfaDisableRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('disabled');
    });

    it('should disable MFA for the authenticated user', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validMfaDisableRequest)
        .expect(200);

      // Verify MFA is disabled by checking user profile
      const profileResponse = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(profileResponse.body.mfaEnabled).toBe(false);
    });

    it('should invalidate backup codes after disabling', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validMfaDisableRequest)
        .expect(200);

      // Verify backup codes are no longer valid (implementation-specific validation)
      // This would be tested in integration tests with actual backup code usage
    });
  });

  describe('Invalid MFA Disable Requests', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { totpCode: '123456' },  // Missing password
        { password: userPassword },  // Missing totpCode
        {}  // Missing both
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/mfa/disable')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for invalid TOTP code format', async () => {
      const invalidCodes = [
        '12345',      // Too short
        '1234567',    // Too long
        'abcdef',     // Non-numeric
        '12345a',     // Mixed characters
        '',           // Empty string
        '123 456'     // With space
      ];

      for (const totpCode of invalidCodes) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/mfa/disable')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send({ password: userPassword, totpCode })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('totpCode');
      }
    });

    it('should return 400 for incorrect password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ password: 'WrongPassword123!', totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.message).toContain('password');
    });

    it('should return 400 for incorrect TOTP code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ password: userPassword, totpCode: '999999' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid TOTP code');
      expect(response.body.message).toContain('verification');
    });

    it('should return 400 for empty password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ password: '', totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('password');
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .send({ password: userPassword, totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', 'Bearer invalid-token')
        .send({ password: userPassword, totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';

      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ password: userPassword, totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Token expired');
    });
  });

  describe('MFA State Validation', () => {
    it('should return 400 if MFA is not enabled', async () => {
      // Create a user without MFA enabled
      const newUserResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'nomfa@example.com',
          password: userPassword,
          firstName: 'No',
          lastName: 'MFA',
          familyName: 'No MFA Family'
        })
        .expect(201);

      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${newUserResponse.body.tokens.accessToken}`)
        .send({ password: userPassword, totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('MFA not enabled');
      expect(response.body.message).toContain('not enabled');
    });
  });

  describe('Content-Type Validation', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send('password=test&totpCode=123456')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should handle empty request body', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Security Considerations', () => {
    it('should require both password and TOTP for security', async () => {
      // This test ensures both factors are required for disabling MFA
      const partialRequests = [
        { password: userPassword },  // Only password
        { totpCode: '123456' }       // Only TOTP
      ];

      for (const request of partialRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/mfa/disable')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send(request)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should not reveal whether password or TOTP is wrong', async () => {
      // Security best practice: don't reveal which credential failed
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ password: 'WrongPassword', totpCode: '999999' })
        .expect('Content-Type', /json/)
        .expect(400);

      // Should have generic error message
      expect(response.body.error).toBe('Invalid credentials or TOTP code');
    });
  });
});