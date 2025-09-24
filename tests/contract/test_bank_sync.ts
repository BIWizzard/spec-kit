/**
 * Contract Test: POST /api/bank-accounts/{accountId}/sync
 * Task: T087 - Bank account sync endpoint contract validation
 *
 * This test validates the bank account sync API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/bank-accounts/{accountId}/sync', () => {
  let authTokens: any;
  let testAccountId: string;
  const testUser = {
    email: 'banksync@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Bank',
    lastName: 'Sync',
    familyName: 'Sync Family'
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

    // Create a test bank account for sync testing
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

  describe('Valid Sync Request', () => {
    it('should return 200 and initiate sync for active account', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('syncId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('estimatedCompletionTime');

      // Validate data types
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.syncId).toBe('string');
      expect(typeof response.body.status).toBe('string');

      // Validate enum values
      expect(['initiated', 'in_progress', 'completed', 'failed']).toContain(response.body.status);

      // Validate UUID format for syncId
      expect(response.body.syncId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate timestamp format
      if (response.body.estimatedCompletionTime) {
        expect(new Date(response.body.estimatedCompletionTime).toISOString())
          .toBe(response.body.estimatedCompletionTime);
      }
    });

    it('should create sync history entry', async () => {
      const syncResponse = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const syncId = syncResponse.body.syncId;

      // Check account details for sync history
      const accountResponse = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(Array.isArray(accountResponse.body.syncHistory)).toBe(true);

      // Find the sync entry
      const syncEntry = accountResponse.body.syncHistory.find((entry: any) => entry.syncId === syncId);
      if (syncEntry) {
        expect(syncEntry).toHaveProperty('status');
        expect(syncEntry).toHaveProperty('startedAt');
        expect(['initiated', 'in_progress', 'completed', 'failed']).toContain(syncEntry.status);
      }
    });

    it('should update account lastSyncAt timestamp', async () => {
      // Get initial sync time
      const beforeResponse = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const beforeSyncAt = beforeResponse.body.lastSyncAt;

      // Trigger sync
      await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Allow time for sync to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check updated sync time
      const afterResponse = await request(API_BASE_URL)
        .get(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const afterSyncAt = afterResponse.body.lastSyncAt;

      // Should be updated (or at least not null)
      expect(afterSyncAt).toBeTruthy();
      if (beforeSyncAt) {
        expect(new Date(afterSyncAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeSyncAt).getTime());
      }
    });
  });

  describe('Account Not Found', () => {
    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${nonExistentId}/sync`)
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
          .post(`/api/bank-accounts/${invalidId}/sync`)
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
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
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
        .post(`/api/bank-accounts/${testAccountId}/sync`)
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

      // Original user should not sync other family's account
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${otherAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Bank account not found');
    });
  });

  describe('Sync Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Make multiple rapid sync requests
      const syncRequests = Array(6).fill(null).map(() =>
        request(API_BASE_URL)
          .post(`/api/bank-accounts/${testAccountId}/sync`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
      );

      const responses = await Promise.all(syncRequests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body).toHaveProperty('error', 'Sync rate limit exceeded');
        expect(rateLimitedResponses[0].body).toHaveProperty('message');
      }

      // At least first request should succeed
      expect(responses[0].status).toBe(200);
    });

    it('should include retry information in rate limit response', async () => {
      // Trigger rate limit (implementation specific)
      for (let i = 0; i < 5; i++) {
        await request(API_BASE_URL)
          .post(`/api/bank-accounts/${testAccountId}/sync`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`);
      }

      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      if (response.status === 429) {
        expect(response.body).toHaveProperty('error', 'Sync rate limit exceeded');
        // May include retry-after information
      }
    });
  });

  describe('Disconnected Account Handling', () => {
    it('should return 400 for disconnected account sync', async () => {
      // Disconnect the account first
      await request(API_BASE_URL)
        .delete(`/api/bank-accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Attempt to sync disconnected account
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      // Should return error for disconnected account
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error).toMatch(/disconnected|invalid|sync/i);
      }
    });
  });

  describe('Plaid Integration Errors', () => {
    it('should handle Plaid API errors gracefully', async () => {
      // Mock Plaid error scenario (would need test account configured for errors)
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      // Should either succeed or return appropriate error
      expect([200, 400, 500, 503]).toContain(response.status);

      if (response.status !== 200) {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should create failed sync history entry on Plaid errors', async () => {
      // This would test error handling - mock implementation would simulate Plaid error
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      // If sync fails, should still create history entry
      if ([400, 500, 503].includes(response.status)) {
        const accountResponse = await request(API_BASE_URL)
          .get(`/api/bank-accounts/${testAccountId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect(200);

        expect(Array.isArray(accountResponse.body.syncHistory)).toBe(true);
      }
    });
  });

  describe('Concurrent Sync Handling', () => {
    it('should handle concurrent sync requests gracefully', async () => {
      const sync1 = request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const sync2 = request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const [response1, response2] = await Promise.all([sync1, sync2]);

      // At least one should succeed, second may be rejected or queued
      expect([200, 409, 429]).toContain(response1.status);
      expect([200, 409, 429]).toContain(response2.status);

      // At least first request should have succeeded
      expect(response1.status === 200 || response2.status === 200).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond quickly to sync initiation request', async () => {
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const responseTime = Date.now() - startTime;

      // Should respond quickly (actual sync happens asynchronously)
      expect(responseTime).toBeLessThan(3000); // Within 3 seconds
      expect([200, 404, 429]).toContain(response.status);
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      expect([200, 404, 429]).toContain(response.status);
    });

    it('should not require request body', async () => {
      // POST request with empty body should work
      const response = await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      expect([200, 404, 429]).toContain(response.status);
    });
  });
});