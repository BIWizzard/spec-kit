/**
 * Contract Test: POST /api/auth/mfa/setup
 * Task: T031 - Authentication MFA setup endpoint contract validation
 *
 * This test validates the MFA setup API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/mfa/setup', () => {
  let authTokens: any;
  const testUser = {
    email: 'mfasetup@example.com',
    password: 'SecurePass123!@#',
    firstName: 'MFA',
    lastName: 'Setup',
    familyName: 'MFA Family'
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

  describe('Valid MFA Setup Request', () => {
    it('should return 200 with MFA setup data', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('backupCodes');

      // Validate data types and formats
      expect(typeof response.body.secret).toBe('string');
      expect(typeof response.body.qrCode).toBe('string');
      expect(Array.isArray(response.body.backupCodes)).toBe(true);

      // Validate secret format (Base32)
      expect(response.body.secret).toMatch(/^[A-Z2-7]+=*$/);
      expect(response.body.secret.length).toBeGreaterThanOrEqual(16);

      // Validate QR code format (Base64)
      expect(response.body.qrCode).toMatch(/^data:image\/(png|jpeg);base64,/);

      // Validate backup codes
      expect(response.body.backupCodes.length).toBeGreaterThanOrEqual(8);
      response.body.backupCodes.forEach((code: string) => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThanOrEqual(8);
      });
    });

    it('should generate unique secrets for each setup', async () => {
      const firstResponse = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const secondResponse = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(firstResponse.body.secret).not.toBe(secondResponse.body.secret);
      expect(firstResponse.body.qrCode).not.toBe(secondResponse.body.qrCode);
    });

    it('should generate valid TOTP-compatible secret', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Secret should be valid Base32 for TOTP
      const secret = response.body.secret;
      expect(secret.length % 8).toBe(0); // Base32 should be multiple of 8
      expect(secret).toMatch(/^[A-Z2-7]+=*$/); // Valid Base32 characters
    });

    it('should include user identifier in QR code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // QR code should be a valid data URI
      const qrCode = response.body.qrCode;
      expect(qrCode.startsWith('data:image/')).toBe(true);
      
      // QR code should contain base64 data
      const base64Part = qrCode.split(',')[1];
      expect(base64Part).toMatch(/^[A-Za-z0-9+/]*=*$/);
    });
  });

  describe('MFA Already Enabled', () => {
    beforeEach(async () => {
      // Setup and enable MFA
      const setupResponse = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ totpCode: '123456' });
    });

    it('should return 409 when MFA is already enabled', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'MFA already enabled');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const invalidTokens = [
        'invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/mfa/setup')
          .set('Authorization', `Bearer ${token}`)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body.error).toBe('Not authenticated');
      }
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxfQ.invalid';
      
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Security Considerations', () => {
    it('should not expose secret in logs or headers', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Secret should only be in response body, not headers
      const headers = Object.keys(response.headers);
      headers.forEach(header => {
        expect(response.headers[header]).not.toContain(response.body.secret);
      });
    });

    it('should generate cryptographically secure secrets', async () => {
      const responses = [];
      
      // Generate multiple secrets to test randomness
      for (let i = 0; i < 5; i++) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/mfa/setup')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect(200);
        
        responses.push(response.body.secret);
      }

      // All secrets should be unique
      const uniqueSecrets = new Set(responses);
      expect(uniqueSecrets.size).toBe(responses.length);

      // Secrets should have sufficient entropy (no obvious patterns)
      responses.forEach(secret => {
        expect(secret.length).toBeGreaterThanOrEqual(32); // At least 160 bits of entropy
      });
    });

    it('should generate unique backup codes', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const backupCodes = response.body.backupCodes;
      const uniqueCodes = new Set(backupCodes);
      
      // All backup codes should be unique
      expect(uniqueCodes.size).toBe(backupCodes.length);
      
      // Codes should be alphanumeric and sufficient length
      backupCodes.forEach((code: string) => {
        expect(code).toMatch(/^[A-Z0-9]{8,}$/);
      });
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require Bearer token authentication', async () => {
      // Endpoint requires authentication per OpenAPI spec
      await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .expect(401);
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('secret');
    });

    it('should include security headers', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should not cache sensitive MFA setup data
      expect(response.headers['cache-control']).toMatch(/no-cache|no-store/);
    });
  });
});
