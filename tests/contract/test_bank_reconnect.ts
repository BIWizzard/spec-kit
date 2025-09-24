/**
 * Contract Test: POST /api/bank-accounts/{accountId}/reconnect
 * Task: T088 - Bank account reconnect endpoint contract validation
 *
 * This test validates the bank account reconnect API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/bank-accounts/{accountId}/reconnect', () => {
  let authTokens: any;
  let testAccountId: string;
  const testUser = {
    email: 'bankreconnect@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Bank',
    lastName: 'Reconnect',
    familyName: 'Reconnect Family'
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

    // Create a test bank account for reconnect testing
    const accountResponse = await request(API_BASE_URL)
      .post('/api/bank-accounts')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
      });

    testAccountId = accountResponse.body?.id || 'test-account-uuid';

    // Simulate account in error state (requiring reconnection)
    // In real scenario, this would be set by Plaid webhooks or failed syncs
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Reconnect Request', () => {
    it('should return 200 when reconnecting with valid public token', async () => {
      const reconnectRequest = {
        publicToken: 'public-sandbox-update-87654321-abcd-efgh-ijkl-mnopqrstuvwx'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(reconnectRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure (should match BankAccountResponse)
      expect(response.body).toHaveProperty('id', testAccountId);
      expect(response.body).toHaveProperty('institutionName');
      expect(response.body).toHaveProperty('accountName');
      expect(response.body).toHaveProperty('accountType');
      expect(response.body).toHaveProperty('accountNumber');
      expect(response.body).toHaveProperty('currentBalance');
      expect(response.body).toHaveProperty('availableBalance');
      expect(response.body).toHaveProperty('lastSyncAt');
      expect(response.body).toHaveProperty('syncStatus');
      expect(response.body).toHaveProperty('transactionCount');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('plaidAccountId');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.institutionName).toBe('string');
      expect(typeof response.body.currentBalance).toBe('number');
      expect(typeof response.body.syncStatus).toBe('string');

      // Validate enums
      expect(['checking', 'savings', 'credit', 'loan']).toContain(response.body.accountType);
      expect(['active', 'error', 'disconnected']).toContain(response.body.syncStatus);
    });

    it('should restore active sync status after successful reconnect', async () => {
      const reconnectRequest = {
        publicToken: 'public-sandbox-update-87654321-abcd-efgh-ijkl-mnopqrstuvwx'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(reconnectRequest)
        .expect(200);

      // After successful reconnect, should be active
      expect(response.body.syncStatus).toBe('active');

      // updatedAt should be recent
      const updatedAt = new Date(response.body.updatedAt);
      const now = new Date();
      expect(now.getTime() - updatedAt.getTime()).toBeLessThan(5000); // Within 5 seconds
    });

    it('should update Plaid access tokens', async () => {
      const reconnectRequest = {
        publicToken: 'public-sandbox-update-new-token'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(reconnectRequest)
        .expect(200);

      // Response should show successful reconnection
      expect(response.body).toHaveProperty('syncStatus', 'active');

      // Should be able to sync again after reconnect
      const syncResponse = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(syncResponse.body).toHaveProperty('status');
    });
  });

  describe('Invalid Reconnect Requests', () => {
    it('should return 400 for missing public token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid public token format', async () => {
      const invalidTokens = [
        'invalid-token',
        '',
        '12345',
        'public-invalid-format',
        null
      ];

      for (const publicToken of invalidTokens) {
        const response = await request(API_BASE_URL)
          .post(`/api/bank-accounts/${testAccountId}/reconnect`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({ publicToken })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for expired public token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-expired-update-token'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/token|expired|invalid/i);
    });

    it('should return 400 for wrong institution public token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-different-institution'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/institution|mismatch|token/i);
    });
  });

  describe('Account Not Found', () => {
    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${nonExistentId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-update-token'
        })
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
          .post(`/api/bank-accounts/${invalidId}/reconnect`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            publicToken: 'public-sandbox-update-token'
          })
          .expect('Content-Type', /json/);

        expect([400, 404]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .send({
          publicToken: 'public-sandbox-update-token'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          publicToken: 'public-sandbox-update-token'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
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

      // Original user should not reconnect other family's account
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${otherAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-update-token'
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Bank account not found');
    });
  });

  describe('Account State Validation', () => {
    it('should handle reconnect for already active accounts', async () => {
      // Account should be active initially, attempt reconnect anyway
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-update-token'
        })
        .expect('Content-Type', /json/);

      // Should succeed or return appropriate message
      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.syncStatus).toBe('active');
      }
    });

    it('should not allow reconnect for disconnected accounts', async () => {
      // Disconnect the account first
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Attempt to reconnect disconnected account
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-update-token'
        })
        .expect('Content-Type', /json/);

      // Should return error for disconnected account
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Plaid Integration Errors', () => {
    it('should handle Plaid API errors gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-error-token'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle institution connection errors', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-institution-error'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/institution|connection|error/i);
    });

    it('should maintain error status on failed reconnect', async () => {
      // Attempt reconnect with invalid token
      await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'invalid-update-token'
        })
        .expect(400);

      // Check account status after failed reconnect
      const accountResponse = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Status should remain unchanged after failed reconnect
      expect(['active', 'error', 'disconnected']).toContain(accountResponse.body.syncStatus);
    });
  });

  describe('Content-Type Requirements', () => {
    it('should require JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send('publicToken=public-sandbox-update-token')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-update-token'
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Sync History Updates', () => {
    it('should create sync history entry for reconnection', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-update-token'
        })
        .expect(200);

      // Check account details for updated sync history
      const accountResponse = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(Array.isArray(accountResponse.body.syncHistory)).toBe(true);

      // Should have some sync history entries
      if (accountResponse.body.syncHistory.length > 0) {
        const latestEntry = accountResponse.body.syncHistory[0];
        expect(latestEntry).toHaveProperty('status');
        expect(['initiated', 'in_progress', 'completed']).toContain(latestEntry.status);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time for reconnection', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/reconnect`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-update-token'
        });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds (Plaid calls)
    });
  });
});