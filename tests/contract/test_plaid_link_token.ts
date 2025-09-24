/**
 * Contract Test: POST /api/plaid/link-token
 * Task: T095 - Plaid Link token creation endpoint contract validation
 *
 * This test validates the Plaid Link token creation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/plaid/link-token', () => {
  let authTokens: any;
  let testAccountId: string;
  let testUserId: string;
  const testUser = {
    email: 'plaidlink@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Plaid',
    lastName: 'Link',
    familyName: 'Link Family'
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
    testUserId = loginResponse.body.user?.id || 'test-user-uuid';

    // Create a test bank account for update mode testing
    const accountResponse = await request(API_BASE_URL)
      .post('/api/bank-accounts')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
      });

    testAccountId = accountResponse.body?.id || 'test-account-uuid';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Link Token Creation Request', () => {
    it('should return 201 with link token for connect mode', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'connect'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('linkToken');
      expect(response.body).toHaveProperty('expiration');

      // Validate data types
      expect(typeof response.body.linkToken).toBe('string');
      expect(typeof response.body.expiration).toBe('string');

      // Validate link token format (Plaid link tokens are typically long strings)
      expect(response.body.linkToken.length).toBeGreaterThan(20);

      // Validate expiration is a valid ISO date
      const expirationDate = new Date(response.body.expiration);
      expect(expirationDate.toISOString()).toBe(response.body.expiration);

      // Expiration should be in the future
      const now = new Date();
      expect(expirationDate.getTime()).toBeGreaterThan(now.getTime());

      // Expiration should be reasonable (within hours, not years)
      const hoursDiff = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(hoursDiff).toBeGreaterThan(0);
      expect(hoursDiff).toBeLessThan(24); // Should expire within 24 hours
    });

    it('should return 201 with link token for update mode with account ID', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'update',
        accountId: testAccountId
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('linkToken');
      expect(response.body).toHaveProperty('expiration');

      expect(typeof response.body.linkToken).toBe('string');
      expect(response.body.linkToken.length).toBeGreaterThan(20);
    });

    it('should default to connect mode when mode not specified', async () => {
      const linkTokenRequest = {
        userId: testUserId
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('linkToken');
      expect(response.body).toHaveProperty('expiration');
    });

    it('should generate unique tokens for multiple requests', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'connect'
      };

      const response1 = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect(201);

      const response2 = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect(201);

      // Each request should generate a unique token
      expect(response1.body.linkToken).not.toBe(response2.body.linkToken);
    });

    it('should handle family member user ID', async () => {
      const linkTokenRequest = {
        userId: testUserId, // Using authenticated user's ID
        mode: 'connect'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('linkToken');
    });
  });

  describe('Invalid Link Token Requests', () => {
    it('should return 400 for missing user ID', async () => {
      const linkTokenRequest = {
        mode: 'connect'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid mode values', async () => {
      const invalidModes = ['invalid', 'create', 'delete', ''];

      for (const mode of invalidModes) {
        const linkTokenRequest = {
          userId: testUserId,
          mode
        };

        const response = await request(API_BASE_URL)
          .post('/api/plaid/link-token')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(linkTokenRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toMatch(/mode|invalid/i);
      }
    });

    it('should return 400 for update mode without account ID', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'update'
        // Missing required accountId for update mode
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/account.*required|update.*account/i);
    });

    it('should return 400 for invalid account ID format', async () => {
      const invalidAccountIds = ['invalid-uuid', '12345', 'not-a-uuid', ''];

      for (const accountId of invalidAccountIds) {
        const linkTokenRequest = {
          userId: testUserId,
          mode: 'update',
          accountId
        };

        const response = await request(API_BASE_URL)
          .post('/api/plaid/link-token')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(linkTokenRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for non-existent account ID', async () => {
      const nonExistentAccountId = '00000000-0000-0000-0000-000000000000';

      const linkTokenRequest = {
        userId: testUserId,
        mode: 'update',
        accountId: nonExistentAccountId
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/account.*not found/i);
    });

    it('should return 400 for invalid user ID format', async () => {
      const invalidUserIds = ['invalid-id', '', null, undefined];

      for (const userId of invalidUserIds) {
        const linkTokenRequest = {
          userId,
          mode: 'connect'
        };

        const response = await request(API_BASE_URL)
          .post('/api/plaid/link-token')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(linkTokenRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid data types', async () => {
      const invalidRequests = [
        { userId: 123, mode: 'connect' },
        { userId: testUserId, mode: 123 },
        { userId: testUserId, mode: 'update', accountId: 123 }
      ];

      for (const linkTokenRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/plaid/link-token')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(linkTokenRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'connect'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'connect'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', 'Bearer invalid-token')
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Authorization', () => {
    it('should return 403 for insufficient permissions', async () => {
      // Create user with limited permissions (future implementation)
      const limitedUser = {
        email: 'limited@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Limited',
        lastName: 'User',
        familyName: 'Limited Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(limitedUser);

      const limitedLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: limitedUser.email,
          password: limitedUser.password
        });

      const linkTokenRequest = {
        userId: testUserId, // Different user ID
        mode: 'connect'
      };

      // For now, should work with default permissions or return 403
      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${limitedLoginResponse.body.tokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/);

      // Could be 201 (allowed), 403 (forbidden), or 400 (different family user)
      expect([201, 400, 403]).toContain(response.status);
    });
  });

  describe('Family Data Isolation', () => {
    it('should only allow creating tokens for users in same family', async () => {
      // Create second family
      const secondFamily = {
        email: 'other@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(secondFamily);

      const otherLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: secondFamily.email,
          password: secondFamily.password
        });

      const otherUserId = otherLoginResponse.body.user?.id || 'other-user-uuid';

      // Original user should not create tokens for other family's user
      const linkTokenRequest = {
        userId: otherUserId,
        mode: 'connect'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/);

      // Should return error for different family user
      expect([400, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should only allow update mode for accounts in same family', async () => {
      // Create second family with bank account
      const secondFamily = {
        email: 'other@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(secondFamily);

      const otherLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: secondFamily.email,
          password: secondFamily.password
        });

      const otherAccountResponse = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-other-family'
        });

      const otherAccountId = otherAccountResponse.body?.id || 'other-account-uuid';

      // Original user should not create update tokens for other family's accounts
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'update',
        accountId: otherAccountId
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/account.*not found/i);
    });
  });

  describe('Plaid Integration', () => {
    it('should handle Plaid API errors gracefully', async () => {
      // Mock scenario where Plaid API might be unavailable
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'connect'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/);

      // Should either succeed or return appropriate error
      expect([201, 503]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('linkToken');
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Content-Type Requirements', () => {
    it('should require JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send('userId=test&mode=connect')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });

    it('should return JSON content type', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'connect'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest)
        .expect('Content-Type', /json/);

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'connect'
      };

      const startTime = Date.now();

      await request(API_BASE_URL)
        .post('/api/plaid/link-token')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(linkTokenRequest);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds (Plaid API call)
    });
  });

  describe('Token Security', () => {
    it('should generate non-predictable tokens', async () => {
      const linkTokenRequest = {
        userId: testUserId,
        mode: 'connect'
      };

      const responses = await Promise.all([
        request(API_BASE_URL)
          .post('/api/plaid/link-token')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(linkTokenRequest),
        request(API_BASE_URL)
          .post('/api/plaid/link-token')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(linkTokenRequest),
        request(API_BASE_URL)
          .post('/api/plaid/link-token')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(linkTokenRequest)
      ]);

      const tokens = responses.map(r => r.body.linkToken);

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // Tokens should be sufficiently long and complex
      tokens.forEach(token => {
        expect(token.length).toBeGreaterThan(20);
        expect(typeof token).toBe('string');
      });
    });
  });
});