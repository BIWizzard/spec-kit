/**
 * Contract Test: PUT /api/bank-accounts/{accountId}
 * Task: T085 - Bank account update endpoint contract validation
 *
 * This test validates the bank account update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/bank-accounts/{accountId}', () => {
  let authTokens: any;
  let testAccountId: string;
  const testUser = {
    email: 'bankupdate@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Bank',
    lastName: 'Update',
    familyName: 'Update Family'
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

    // Create a test bank account for update testing
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

  describe('Valid Bank Account Update Request', () => {
    it('should return 200 when updating account name', async () => {
      const updateRequest = {
        accountName: 'My Custom Checking Account'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('id', testAccountId);
      expect(response.body).toHaveProperty('accountName', updateRequest.accountName);
      expect(response.body).toHaveProperty('updatedAt');

      // Validate all expected properties are present
      expect(response.body).toHaveProperty('institutionName');
      expect(response.body).toHaveProperty('accountType');
      expect(response.body).toHaveProperty('currentBalance');
      expect(response.body).toHaveProperty('syncStatus');

      // updatedAt should be recent
      const updatedAt = new Date(response.body.updatedAt);
      const now = new Date();
      expect(now.getTime() - updatedAt.getTime()).toBeLessThan(5000); // Within 5 seconds
    });

    it('should handle empty update request gracefully', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/);

      // Should either succeed with no changes or return validation error
      expect([200, 400]).toContain(response.status);
    });

    it('should update only provided fields', async () => {
      // Get original account details
      const originalResponse = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const originalData = originalResponse.body;

      const updateRequest = {
        accountName: 'Updated Name Only'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Only accountName should change
      expect(response.body.accountName).toBe(updateRequest.accountName);
      expect(response.body.institutionName).toBe(originalData.institutionName);
      expect(response.body.accountType).toBe(originalData.accountType);
      expect(response.body.currentBalance).toBe(originalData.currentBalance);
    });
  });

  describe('Invalid Update Requests', () => {
    it('should return 400 for invalid account name', async () => {
      const invalidNames = [
        '',                    // Empty string
        '   ',                 // Whitespace only
        'a'.repeat(256),      // Too long
        null,                 // Null value
      ];

      for (const accountName of invalidNames) {
        const response = await request(API_BASE_URL)
          .put(`/api/bank-accounts/${testAccountId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({ accountName })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for unsupported fields', async () => {
      const unsupportedFields = {
        institutionName: 'Cannot Change This',
        accountType: 'checking',
        currentBalance: 5000.00,
        plaidAccountId: 'cannot-change'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(unsupportedFields)
        .expect('Content-Type', /json/);

      // Should either ignore unsupported fields or return error
      expect([200, 400]).toContain(response.status);

      if (response.status === 400) {
        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Account Not Found', () => {
    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${nonExistentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ accountName: 'New Name' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Bank account not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 404 for invalid UUID format', async () => {
      const invalidIds = [
        'invalid-uuid',
        '12345',
        'not-a-uuid'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .put(`/api/bank-accounts/${invalidId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({ accountName: 'New Name' })
          .expect('Content-Type', /json/);

        expect([400, 404]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .send({ accountName: 'New Name' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ accountName: 'New Name' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Authorization', () => {
    it('should return 403 for insufficient permissions', async () => {
      // Create user with limited permissions (future role-based access)
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

      // For now, should work with default permissions
      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${limitedLoginResponse.body.tokens.accessToken}`)
        .send({ accountName: 'Limited Update' })
        .expect('Content-Type', /json/);

      // Could be 200 (allowed), 403 (forbidden), or 404 (not found - different family)
      expect([200, 403, 404]).toContain(response.status);
    });
  });

  describe('Family Data Isolation', () => {
    it('should return 404 for account belonging to different family', async () => {
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

      // Create bank account for other family
      const otherAccountResponse = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-other-family'
        });

      const otherAccountId = otherAccountResponse.body?.id || 'other-account-uuid';

      // Original user should not update other family's account
      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${otherAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ accountName: 'Unauthorized Update' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Bank account not found');
    });
  });

  describe('Content-Type Requirements', () => {
    it('should require JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send('accountName=Form Encoded Name')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ accountName: 'JSON Response Test' })
        .expect('Content-Type', /json/);

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Concurrent Update Handling', () => {
    it('should handle concurrent updates gracefully', async () => {
      const update1 = request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ accountName: 'Concurrent Update 1' });

      const update2 = request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ accountName: 'Concurrent Update 2' });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both should succeed or one should handle conflict
      expect([200, 409]).toContain(response1.status);
      expect([200, 409]).toContain(response2.status);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .put(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ accountName: 'Performance Test' });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});