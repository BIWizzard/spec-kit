/**
 * Contract Test: POST /api/bank-accounts/sync-all
 * Task: T096a - Sync all connected bank accounts
 *
 * This test validates the bulk bank sync API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/bank-accounts/sync-all', () => {
  let userToken: string;
  let familyId: string;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.transaction.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.session.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user and family
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'synctest@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Sync',
        lastName: 'Test',
        familyName: 'Sync Family'
      });

    userToken = registerResponse.body.tokens.accessToken;
    familyId = registerResponse.body.family.id;

    // Create some test bank accounts
    await prisma.bankAccount.createMany({
      data: [
        {
          id: 'bank-account-1',
          familyId,
          plaidAccountId: 'plaid-account-1',
          plaidItemId: 'plaid-item-1',
          institutionName: 'Test Bank 1',
          accountName: 'Checking',
          accountType: 'checking',
          accountNumber: '1234',
          currentBalance: 1000.00,
          availableBalance: 950.00,
          syncStatus: 'active',
          lastSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        },
        {
          id: 'bank-account-2',
          familyId,
          plaidAccountId: 'plaid-account-2',
          plaidItemId: 'plaid-item-2',
          institutionName: 'Test Bank 2',
          accountName: 'Savings',
          accountType: 'savings',
          accountNumber: '5678',
          currentBalance: 5000.00,
          availableBalance: 5000.00,
          syncStatus: 'error',
          lastSyncAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Sync All Requests', () => {
    it('should return 200 and sync all active bank accounts', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send()
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message', 'Sync initiated for all bank accounts');
      expect(response.body).toHaveProperty('totalAccounts');
      expect(response.body).toHaveProperty('syncedAccounts');
      expect(response.body).toHaveProperty('failedAccounts');
      expect(response.body).toHaveProperty('results');

      // Validate sync results array
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);

      // Validate each result object
      response.body.results.forEach((result: any) => {
        expect(result).toHaveProperty('accountId');
        expect(result).toHaveProperty('status'); // 'success', 'error', 'skipped'
        expect(result).toHaveProperty('message');
        expect(['string']).toContain(typeof result.accountId);
        expect(['success', 'error', 'skipped']).toContain(result.status);
      });

      // Validate summary counts
      expect(typeof response.body.totalAccounts).toBe('number');
      expect(typeof response.body.syncedAccounts).toBe('number');
      expect(typeof response.body.failedAccounts).toBe('number');
      expect(response.body.totalAccounts).toBe(response.body.syncedAccounts + response.body.failedAccounts);
    });

    it('should handle force sync parameter', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          force: true
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toBe('Sync initiated for all bank accounts');
      expect(response.body).toHaveProperty('force', true);
    });

    it('should sync only accounts with error status when specified', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          errorAccountsOnly: true
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toBe('Sync initiated for all bank accounts');
      expect(response.body).toHaveProperty('errorAccountsOnly', true);
    });

    it('should return 200 even when no accounts exist', async () => {
      // Delete all bank accounts
      await prisma.bankAccount.deleteMany();

      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send()
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.totalAccounts).toBe(0);
      expect(response.body.syncedAccounts).toBe(0);
      expect(response.body.failedAccounts).toBe(0);
      expect(response.body.results).toEqual([]);
    });
  });

  describe('Invalid Sync All Requests', () => {
    it('should return 400 for invalid request body', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          force: 'not-a-boolean',
          errorAccountsOnly: 'invalid'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for unsupported parameters', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          unsupportedParam: 'value'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .send()
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', 'Bearer invalid-token')
        .send()
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send()
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only sync accounts belonging to the authenticated family', async () => {
      // Create another family with bank accounts
      const otherFamilyResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'otherfamily@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Other',
          lastName: 'Family',
          familyName: 'Other Family'
        });

      const otherFamilyId = otherFamilyResponse.body.family.id;

      await prisma.bankAccount.create({
        data: {
          id: 'other-family-account',
          familyId: otherFamilyId,
          plaidAccountId: 'other-plaid-account',
          plaidItemId: 'other-plaid-item',
          institutionName: 'Other Bank',
          accountName: 'Other Account',
          accountType: 'checking',
          accountNumber: '9999',
          currentBalance: 2000.00,
          availableBalance: 1800.00,
          syncStatus: 'active',
          lastSyncAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
        }
      });

      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send()
        .expect(200);

      // Should only sync accounts from the authenticated user's family (2 accounts)
      expect(response.body.totalAccounts).toBe(2);

      // Verify no other family accounts are included
      response.body.results.forEach((result: any) => {
        expect(result.accountId).not.toBe('other-family-account');
      });
    });
  });

  describe('Concurrent Sync Prevention', () => {
    it('should handle concurrent sync requests gracefully', async () => {
      // Make multiple concurrent requests
      const promises = Array(3).fill(0).map(() =>
        request(API_BASE_URL)
          .post('/api/bank-accounts/sync-all')
          .set('Authorization', `Bearer ${userToken}`)
          .send()
      );

      const responses = await Promise.all(promises);

      // All should return 200, but might have different messages about concurrent operations
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('Content-Type Validation', () => {
    it('should accept empty request body', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send()
        .expect(200);

      expect(response.body.message).toBe('Sync initiated for all bank accounts');
    });

    it('should require application/json when body is provided', async () => {
      await request(API_BASE_URL)
        .post('/api/bank-accounts/sync-all')
        .set('Authorization', `Bearer ${userToken}`)
        .send('force=true')
        .expect(400);
    });
  });
});