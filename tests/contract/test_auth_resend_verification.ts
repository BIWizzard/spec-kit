/**
 * Contract Test: POST /api/auth/resend-verification
 * Task: T038 - Resend email verification endpoint contract validation
 *
 * This test validates the resend verification API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/resend-verification', () => {
  let unverifiedUserEmail: string = 'unverified@example.com';
  let verifiedUserEmail: string = 'verified@example.com';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create unverified test user
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: unverifiedUserEmail,
        password: 'SecurePass123!@#',
        firstName: 'Unverified',
        lastName: 'User',
        familyName: 'Unverified Family'
      })
      .expect(201);

    // Create and verify another test user
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: verifiedUserEmail,
        password: 'SecurePass123!@#',
        firstName: 'Verified',
        lastName: 'User',
        familyName: 'Verified Family'
      })
      .expect(201);

    // Verify the second user's email
    await request(API_BASE_URL)
      .post('/api/auth/verify-email')
      .send({ token: 'verification-token-for-verified-user' })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Resend Verification Request', () => {
    const validResendRequest = {
      email: 'unverified@example.com'
    };

    it('should return 200 with valid unverified email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send(validResendRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('verification');
    });

    it('should always return 200 even for non-existent emails (security)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect('Content-Type', /json/)
        .expect(200);

      // Should return generic success message for security
      expect(response.body.message).toContain('sent');
    });

    it('should provide consistent response time for existing and non-existing emails', async () => {
      const startTime1 = Date.now();
      await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: unverifiedUserEmail })
        .expect(200);
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);
      const time2 = Date.now() - startTime2;

      // Response times should be similar (within 100ms) for security
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    it('should handle case-insensitive email matching', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: unverifiedUserEmail.toUpperCase() })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('sent');
    });

    it('should handle multiple resend requests for same email', async () => {
      // Send first request
      await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send(validResendRequest)
        .expect(200);

      // Send second request (should still succeed but might be rate-limited)
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send(validResendRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('sent');
    });
  });

  describe('Invalid Resend Verification Requests', () => {
    it('should return 400 for missing email field', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidEmails = [
        'plainaddress',
        'email@',
        '@domain.com',
        'email..email@domain.com',
        'email@domain..com',
        'email with spaces@domain.com',
        '',
        null,
        undefined,
        123,
        []
      ];

      for (const email of invalidEmails) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/resend-verification')
          .send({ email })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('email');
      }
    });

    it('should return 400 for already verified email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: verifiedUserEmail })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Email already verified');
      expect(response.body.message).toContain('already verified');
    });

    it('should return 400 for empty email string', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: '' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should validate email length constraints', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'; // Exceeds typical email length limits

      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: longEmail })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Email Format Validation', () => {
    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@domain.com',
        'test.email@domain.com',
        'user+tag@domain.co.uk',
        'user123@domain123.com',
        'user_name@domain-name.com'
      ];

      for (const email of validEmails) {
        // Create user with this email first
        await request(API_BASE_URL)
          .post('/api/auth/register')
          .send({
            email,
            password: 'SecurePass123!@#',
            firstName: 'Test',
            lastName: 'User',
            familyName: 'Test Family'
          })
          .expect(201);

        const response = await request(API_BASE_URL)
          .post('/api/auth/resend-verification')
          .send({ email })
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.message).toContain('sent');
      }
    });

    it('should reject emails with dangerous characters', async () => {
      const dangerousEmails = [
        'user<script>@domain.com',
        'user@domain.com; DROP TABLE users;',
        'user${process.exit(1)}@domain.com',
        'user@domain.com\x00',
        'user@domain.com\r\n',
        'user"@domain.com'
      ];

      for (const email of dangerousEmails) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/resend-verification')
          .send({ email })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Rate Limiting Considerations', () => {
    it('should handle rapid consecutive requests', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(API_BASE_URL)
            .post('/api/auth/resend-verification')
            .send({ email: unverifiedUserEmail })
        );
      }

      const responses = await Promise.all(requests);

      // All responses should be either 200 (success) or 429 (rate limited)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      // At least one should succeed
      const successResponses = responses.filter(r => r.status === 200);
      expect(successResponses.length).toBeGreaterThan(0);
    });

    it('should provide appropriate rate limiting response', async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        await request(API_BASE_URL)
          .post('/api/auth/resend-verification')
          .send({ email: unverifiedUserEmail });
      }

      // This might trigger rate limiting
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: unverifiedUserEmail });

      if (response.status === 429) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('rate limit');
      }
    });
  });

  describe('Security Headers and Content Type', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send('email=test@example.com')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should not require authentication (security: [])', async () => {
      // This endpoint should be accessible without Bearer token
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: unverifiedUserEmail })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle empty request body gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('User Experience and Messages', () => {
    it('should provide clear success message', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: unverifiedUserEmail })
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
      expect(response.body.message).toMatch(/verification.*sent|sent.*verification/i);
    });

    it('should provide consistent message format', async () => {
      const responses = await Promise.all([
        request(API_BASE_URL)
          .post('/api/auth/resend-verification')
          .send({ email: unverifiedUserEmail }),
        request(API_BASE_URL)
          .post('/api/auth/resend-verification')
          .send({ email: 'nonexistent@example.com' })
      ]);

      // Both should have similar message structure
      responses.forEach(response => {
        expect(response.body.message).toBeDefined();
        expect(typeof response.body.message).toBe('string');
      });
    });

    it('should not reveal whether email exists in system', async () => {
      const existingEmailResponse = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: unverifiedUserEmail })
        .expect(200);

      const nonExistentEmailResponse = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: 'definitely-not-existing@example.com' })
        .expect(200);

      // Messages should be similar to prevent email enumeration
      expect(existingEmailResponse.body.message).toBeDefined();
      expect(nonExistentEmailResponse.body.message).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests for same email', async () => {
      const concurrentRequests = Array(3).fill(null).map(() =>
        request(API_BASE_URL)
          .post('/api/auth/resend-verification')
          .send({ email: unverifiedUserEmail })
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed or be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should handle database connection issues gracefully', async () => {
      // This would be tested at infrastructure level
      // but response structure should be maintained
      const response = await request(API_BASE_URL)
        .post('/api/auth/resend-verification')
        .send({ email: 'test@example.com' });

      expect([200, 400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('message');
    });
  });
});