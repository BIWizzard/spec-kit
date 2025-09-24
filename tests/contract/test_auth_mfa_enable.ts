/**
 * Contract Test: POST /api/auth/mfa/enable
 * Task: T032 - MFA enable endpoint contract validation
 *
 * This test validates the MFA enable API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/mfa/enable', () => {
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
        email: 'mfatest@example.com',
        password: 'SecurePass123!@#',
        firstName: 'MFA',
        lastName: 'Test',
        familyName: 'Test Family'
      })
      .expect(201);

    validAccessToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid MFA Enable Request', () => {
    const validMfaEnableRequest = {
      totpCode: '123456'
    };

    it('should return 200 with valid TOTP code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validMfaEnableRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('backupCodes');

      // Validate backup codes structure
      const { backupCodes } = response.body;
      expect(Array.isArray(backupCodes)).toBe(true);
      expect(backupCodes.length).toBeGreaterThan(0);
      backupCodes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });

      expect(response.body.message).toContain('enabled');
    });

    it('should enable MFA for the authenticated user', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validMfaEnableRequest)
        .expect(200);

      // Verify MFA is enabled by checking user profile
      const profileResponse = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(profileResponse.body.mfaEnabled).toBe(true);
    });

    it('should generate unique backup codes each time', async () => {
      const response1 = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(validMfaEnableRequest)
        .expect(200);

      // Create another user to test uniqueness
      const registerResponse2 = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'mfatest2@example.com',
          password: 'SecurePass123!@#',
          firstName: 'MFA2',
          lastName: 'Test2',
          familyName: 'Test Family 2'
        })
        .expect(201);

      const response2 = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${registerResponse2.body.tokens.accessToken}`)
        .send(validMfaEnableRequest)
        .expect(200);

      // Backup codes should be different for different users
      expect(response1.body.backupCodes).not.toEqual(response2.body.backupCodes);
    });
  });

  describe('Invalid MFA Enable Requests', () => {
    it('should return 400 for missing TOTP code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
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
          .post('/api/auth/mfa/enable')
          .set('Authorization', `Bearer ${validAccessToken}`)
          .send({ totpCode })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('totpCode');
      }
    });

    it('should return 400 for incorrect TOTP code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ totpCode: '999999' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid TOTP code');
      expect(response.body.message).toContain('verification');
    });

    it('should return 409 if MFA is already enabled', async () => {
      // Enable MFA first
      await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ totpCode: '123456' })
        .expect(200);

      // Try to enable again
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.error).toBe('MFA already enabled');
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .send({ totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', 'Bearer invalid-token')
        .send({ totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';

      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Token expired');
    });
  });

  describe('Content-Type Validation', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send('totpCode=123456')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should handle empty request body', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('MFA Setup State Validation', () => {
    it('should require MFA setup before enabling', async () => {
      // Create a new user without MFA setup
      const newUserResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'nomfa@example.com',
          password: 'SecurePass123!@#',
          firstName: 'No',
          lastName: 'MFA',
          familyName: 'No MFA Family'
        })
        .expect(201);

      // Try to enable MFA without setup
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${newUserResponse.body.tokens.accessToken}`)
        .send({ totpCode: '123456' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('MFA setup required');
      expect(response.body.message).toContain('setup');
    });
  });
});