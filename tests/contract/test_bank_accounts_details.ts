/**
 * Contract Test: GET /api/bank-accounts/{accountId}
 * Task: T084 - Bank account details endpoint contract validation
 *
 * This test validates the bank account details API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/bank-accounts/{accountId}', () => {
  let authTokens: any;
  let testAccountId: string;
  const testUser = {
    email: 'bankdetails@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Bank',
    lastName: 'Details',
    familyName: 'Details Family'
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

    // Create a test bank account for details testing
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

  describe('Valid Bank Account Details Request', () => {
    it('should return 200 with account details for existing account', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate base account properties
      expect(response.body).toHaveProperty('id');
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

      // Validate detailed view properties
      expect(response.body).toHaveProperty('recentTransactions');
      expect(response.body).toHaveProperty('syncHistory');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.institutionName).toBe('string');
      expect(typeof response.body.accountName).toBe('string');
      expect(typeof response.body.currentBalance).toBe('number');
      expect(Array.isArray(response.body.recentTransactions)).toBe(true);
      expect(Array.isArray(response.body.syncHistory)).toBe(true);

      // Validate enums
      expect(['checking', 'savings', 'credit', 'loan']).toContain(response.body.accountType);
      expect(['active', 'error', 'disconnected']).toContain(response.body.syncStatus);
    });

    it('should include recent transactions in response', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.recentTransactions)).toBe(true);

      // If transactions exist, validate structure
      if (response.body.recentTransactions.length > 0) {
        const transaction = response.body.recentTransactions[0];
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('plaidTransactionId');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('date');
        expect(transaction).toHaveProperty('description');
        expect(transaction).toHaveProperty('merchantName');
        expect(transaction).toHaveProperty('pending');
        expect(transaction).toHaveProperty('spendingCategory');
        expect(transaction).toHaveProperty('categoryConfidence');
        expect(transaction).toHaveProperty('userCategorized');
        expect(transaction).toHaveProperty('bankAccount');

        // Validate data types
        expect(typeof transaction.id).toBe('string');
        expect(typeof transaction.amount).toBe('number');
        expect(typeof transaction.pending).toBe('boolean');
        expect(typeof transaction.categoryConfidence).toBe('number');
        expect(typeof transaction.userCategorized).toBe('boolean');
      }
    });

    it('should include sync history in response', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.syncHistory)).toBe(true);

      // If sync history exists, validate structure
      if (response.body.syncHistory.length > 0) {
        const syncEntry = response.body.syncHistory[0];
        expect(syncEntry).toHaveProperty('syncId');
        expect(syncEntry).toHaveProperty('status');
        expect(syncEntry).toHaveProperty('startedAt');
        expect(syncEntry).toHaveProperty('completedAt');
        expect(syncEntry).toHaveProperty('transactionsSynced');
        expect(syncEntry).toHaveProperty('error');

        // Validate data types
        expect(typeof syncEntry.syncId).toBe('string');
        expect(typeof syncEntry.status).toBe('string');
        expect(['initiated', 'in_progress', 'completed', 'failed']).toContain(syncEntry.status);
      }
    });
  });

  describe('Account Not Found', () => {
    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${nonExistentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
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
          .get(`/api/bank-accounts/${invalidId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/);

        expect([400, 404]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', 'Bearer invalid-token')
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

      // Original user should not access other family's account
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${otherAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Bank account not found');
    });
  });

  describe('Account Status Variations', () => {
    it('should return details for disconnected accounts', async () => {
      // First disconnect the account
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      // Should still be able to view details of disconnected account
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      // Could be 200 (show disconnected) or 404 (hide disconnected)
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.syncStatus).toBe('disconnected');
      }
    });

    it('should return details for accounts with sync errors', async () => {
      // Mock account with sync error status would be set up here
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should include error information if account has sync issues
      expect(response.body).toHaveProperty('syncStatus');
      if (response.body.syncStatus === 'error') {
        expect(response.body.syncHistory.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      expect([200, 404]).toContain(response.status);
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      // Account details should be cacheable but with short TTL
      if (response.status === 200) {
        expect(response.headers['cache-control']).toMatch(/max-age=|no-cache/);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });
  });

  describe('Data Freshness', () => {
    it('should show appropriate sync status and timestamps', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('lastSyncAt');
      expect(response.body).toHaveProperty('syncStatus');

      // Timestamps should be valid date strings or null
      if (response.body.lastSyncAt) {
        expect(new Date(response.body.lastSyncAt).toISOString()).toBe(response.body.lastSyncAt);
      }
    });
  });
});