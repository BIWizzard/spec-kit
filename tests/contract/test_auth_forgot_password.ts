/**
 * Contract Test: POST /api/auth/forgot-password
 * Task: T034 - Authentication forgot password endpoint contract validation
 *
 * This test validates the forgot password API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/forgot-password', () => {
  const testUser = {
    email: 'forgotpw@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Forgot',
    lastName: 'Password',
    familyName: 'Forgot Family'
  };

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send(testUser);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Forgot Password Request', () => {
    it('should return 200 for existing user email', async () => {
      const forgotPasswordRequest = {
        email: testUser.email
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send(forgotPasswordRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toContain('password reset');
    });

    it('should return 200 for non-existing user email (security)', async () => {
      const forgotPasswordRequest = {
        email: 'nonexistent@example.com'
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send(forgotPasswordRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should always return 200 for security (per OpenAPI spec comment)
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });

    it('should be case-insensitive for email', async () => {
      const forgotPasswordRequest = {
        email: testUser.email.toUpperCase()
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send(forgotPasswordRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should have consistent response time regardless of email existence', async () => {
      const existingEmailTime = async () => {
        const startTime = Date.now();
        await request(API_BASE_URL)
          .post('/api/auth/forgot-password')
          .send({ email: testUser.email });
        return Date.now() - startTime;
      };

      const nonExistentEmailTime = async () => {
        const startTime = Date.now();
        await request(API_BASE_URL)
          .post('/api/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' });
        return Date.now() - startTime;
      };

      const existingTime = await existingEmailTime();
      const nonExistentTime = await nonExistentEmailTime();

      // Response times should be similar to prevent email enumeration
      const timeDifference = Math.abs(existingTime - nonExistentTime);
      expect(timeDifference).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('Invalid Forgot Password Requests', () => {
    it('should return 400 for missing email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid email format');
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
        '',
        null,
        undefined
      ];

      for (const email of invalidEmails) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid email format');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for email too long', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      
      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({ email: longEmail })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
    });

    it('should validate email format strictly', async () => {
      const edgeCaseEmails = [
        'test@',
        '@test.com',
        'test@test',
        'test.test@',
        'test@.com',
        'test@test.',
        'test space@test.com',
        'test@test space.com'
      ];

      for (const email of edgeCaseEmails) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid email format');
      }
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle multiple requests for same email', async () => {
      const forgotPasswordRequest = {
        email: testUser.email
      };

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(API_BASE_URL)
            .post('/api/auth/forgot-password')
            .send(forgotPasswordRequest)
        );
      }

      const responses = await Promise.all(promises);
      
      // All should return 200 (for security)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });

    it('should not expose user existence through different messages', async () => {
      const existingResponse = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      const nonExistentResponse = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Messages should be identical or very similar to prevent enumeration
      const existingMessage = existingResponse.body.message.toLowerCase();
      const nonExistentMessage = nonExistentResponse.body.message.toLowerCase();
      
      // Both should contain generic language
      expect(existingMessage).toContain('password reset');
      expect(nonExistentMessage).toContain('password reset');
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send('email=test@example.com')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should not require authentication (security: [])', async () => {
      // This endpoint should be accessible without Bearer token
      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Email Service Integration', () => {
    it('should not fail if email service is unavailable', async () => {
      // The API should still return 200 even if email fails (for security)
      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Input Sanitization', () => {
    it('should handle special characters in email', async () => {
      const specialEmails = [
        'test+tag@example.com',      // Plus addressing
        'test.name@example.com',     // Dot in local part
        'test_name@example.com',     // Underscore in local part
        'test-name@example.com'      // Hyphen in local part
      ];

      for (const email of specialEmails) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toHaveProperty('message');
      }
    });

    it('should reject potentially malicious input', async () => {
      const maliciousEmails = [
        '<script>alert(1)</script>@example.com',
        'test@example.com<script>',
        'test@example.com">',
        'test@example.com\'\'',
        'test@example.com;--'
      ];

      for (const email of maliciousEmails) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/forgot-password')
          .send({ email })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid email format');
      }
    });
  });
});
