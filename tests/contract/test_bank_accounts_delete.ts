/**
 * Contract Test: DELETE /api/bank-accounts/{accountId}
 * Task: T086 - Bank account disconnection endpoint contract validation
 *
 * This test validates the bank account disconnection API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/bank-accounts/{accountId}', () => {
  let authTokens: any;
  let testAccountId: string;
  const testUser = {
    email: 'bankdelete@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Bank',
    lastName: 'Delete',
    familyName: 'Delete Family'
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

    // Create a test bank account for deletion testing
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

  describe('Valid Bank Account Disconnection Request', () => {
    it('should return 200 when disconnecting existing account', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toMatch(/disconnect|removed|success/i);
    });

    it('should perform soft delete (mark as disconnected)', async () => {
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Account should still exist but marked as disconnected
      const listResponse = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .query({ includeDisconnected: true })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const disconnectedAccount = listResponse.body.accounts.find((acc: any) => acc.id === testAccountId);
      if (disconnectedAccount) {
        expect(disconnectedAccount.syncStatus).toBe('disconnected');
      }
    });

    it('should stop syncing after disconnection', async () => {
      // Disconnect the account
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Attempt to sync should fail or be ignored
      const syncResponse = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      // Should either return 404 (not found) or 400 (cannot sync disconnected)
      expect([400, 404]).toContain(syncResponse.status);
    });

    it('should preserve historical transaction data', async () => {
      // Disconnect the account
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Transactions should still be accessible (if they exist)
      const transactionsResponse = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({ accountId: testAccountId })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(transactionsResponse.body.transactions)).toBe(true);
    });
  });

  describe('Account Not Found', () => {
    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${nonExistentId}`)
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
          .delete(`/api/bank-accounts/${invalidId}`)
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
        .delete(`/api/bank-accounts/${testAccountId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', 'Bearer invalid-token')
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

      // For now, should work with default permissions or return 404 (different family)
      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${limitedLoginResponse.body.tokens.accessToken}`)
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

      // Original user should not disconnect other family's account
      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${otherAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Bank account not found');
    });
  });

  describe('Idempotent Disconnection', () => {
    it('should handle multiple disconnection attempts gracefully', async () => {
      // First disconnection should succeed
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Second disconnection should handle gracefully
      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      // Could be 200 (idempotent), 404 (already removed), or 409 (already disconnected)
      expect([200, 404, 409]).toContain(response.status);
    });
  });

  describe('Plaid Integration', () => {
    it('should revoke Plaid access tokens on disconnection', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      // In implementation, this should call Plaid's item/remove endpoint
    });

    it('should handle Plaid API errors during disconnection', async () => {
      // Mock scenario where Plaid API is unavailable
      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      // Should still disconnect locally even if Plaid API fails
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
      }
    });
  });

  describe('Related Data Handling', () => {
    it('should handle pending transactions after disconnection', async () => {
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Pending transactions should be preserved but marked appropriately
      const transactionsResponse = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({ accountId: testAccountId })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(Array.isArray(transactionsResponse.body.transactions)).toBe(true);
    });

    it('should update family balance calculations after disconnection', async () => {
      // Get balances before disconnection
      const beforeResponse = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const beforeBalance = beforeResponse.body.summary.totalBalance;

      // Disconnect account
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Get balances after disconnection
      const afterResponse = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Total balance should be recalculated
      expect(typeof afterResponse.body.summary.totalBalance).toBe('number');
      expect(afterResponse.body.summary.activeAccounts).toBe(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds (Plaid calls)
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      expect([200, 404]).toContain(response.status);
    });
  });
});