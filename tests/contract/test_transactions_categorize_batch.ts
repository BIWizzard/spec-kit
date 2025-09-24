/**
 * Contract Test: POST /api/transactions/categorize-batch
 * Task: T092 - Transaction batch categorize endpoint contract validation
 *
 * This test validates the transaction batch categorize API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/transactions/categorize-batch', () => {
  let authTokens: any;
  let testAccountId: string;
  let testTransactionIds: string[];
  let testCategoryId: string;
  const testUser = {
    email: 'batchcategorize@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Batch',
    lastName: 'Categorize',
    familyName: 'Categorize Family'
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

    // Create a test bank account
    const accountResponse = await request(API_BASE_URL)
      .post('/api/bank-accounts')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
      });

    testAccountId = accountResponse.body?.id || 'test-account-uuid';

    // Create spending category for testing
    const categoryResponse = await request(API_BASE_URL)
      .post('/api/spending-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Batch Test Category',
        color: '#FF5733',
        icon: 'shopping-cart'
      });

    testCategoryId = categoryResponse.body?.id || 'test-category-uuid';

    // Sync to create transactions
    await request(API_BASE_URL)
      .post(`/api/bank-accounts/${testAccountId}/sync`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`);

    const transactionsResponse = await request(API_BASE_URL)
      .get('/api/transactions')
      .query({ limit: 5 })
      .set('Authorization', `Bearer ${authTokens.accessToken}`);

    testTransactionIds = transactionsResponse.body?.transactions?.map((t: any) => t.id) || [
      'test-transaction-1', 'test-transaction-2', 'test-transaction-3'
    ];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Batch Categorize Request', () => {
    it('should return 200 when categorizing multiple transactions', async () => {
      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 3),
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('updated');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('summary');

      expect(Array.isArray(response.body.updated)).toBe(true);
      expect(Array.isArray(response.body.errors)).toBe(true);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalRequested');
      expect(summary).toHaveProperty('totalUpdated');
      expect(summary).toHaveProperty('totalErrors');

      expect(typeof summary.totalRequested).toBe('number');
      expect(typeof summary.totalUpdated).toBe('number');
      expect(typeof summary.totalErrors).toBe('number');

      // Validate data consistency
      expect(summary.totalRequested).toBe(batchRequest.transactionIds.length);
      expect(summary.totalUpdated + summary.totalErrors).toBe(summary.totalRequested);

      // Validate updated transaction IDs
      response.body.updated.forEach((id: string) => {
        expect(typeof id).toBe('string');
        expect(batchRequest.transactionIds).toContain(id);
      });

      // Validate error structure if any
      response.body.errors.forEach((error: any) => {
        expect(error).toHaveProperty('transactionId');
        expect(error).toHaveProperty('error');
        expect(typeof error.transactionId).toBe('string');
        expect(typeof error.error).toBe('string');
      });
    });

    it('should handle single transaction in batch', async () => {
      const batchRequest = {
        transactionIds: [testTransactionIds[0]],
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.summary.totalRequested).toBe(1);
      expect(response.body.updated.length + response.body.errors.length).toBe(1);
    });

    it('should handle maximum allowed batch size', async () => {
      // Create list with maximum allowed items (100)
      const maxTransactionIds = Array(100).fill(0).map((_, i) =>
        testTransactionIds[i % testTransactionIds.length] || `test-transaction-${i}`
      );

      const batchRequest = {
        transactionIds: maxTransactionIds,
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.summary.totalRequested).toBe(100);
    });

    it('should verify transactions are actually updated', async () => {
      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 2),
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect(200);

      // Verify updates by checking individual transactions
      for (const transactionId of response.body.updated) {
        const transactionResponse = await request(API_BASE_URL)
          .get(`/api/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect(200);

        expect(transactionResponse.body.spendingCategory.id).toBe(testCategoryId);
        expect(transactionResponse.body.userCategorized).toBe(true);
      }
    });
  });

  describe('Invalid Batch Requests', () => {
    it('should return 400 for missing transaction IDs', async () => {
      const batchRequest = {
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for missing spending category ID', async () => {
      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 2)
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for empty transaction IDs array', async () => {
      const batchRequest = {
        transactionIds: [],
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/empty|required|minimum/i);
    });

    it('should return 400 for exceeding maximum batch size', async () => {
      const oversizedBatch = Array(101).fill(0).map((_, i) => `transaction-${i}`);

      const batchRequest = {
        transactionIds: oversizedBatch,
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/maximum|limit|100/i);
    });

    it('should return 400 for invalid transaction ID formats', async () => {
      const batchRequest = {
        transactionIds: ['invalid-uuid', '12345', 'not-a-uuid'],
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/uuid|format|invalid/i);
    });

    it('should return 400 for invalid spending category ID', async () => {
      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 2),
        spendingCategoryId: 'invalid-category-uuid'
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for non-existent spending category', async () => {
      const nonExistentCategoryId = '00000000-0000-0000-0000-000000000000';

      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 2),
        spendingCategoryId: nonExistentCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/category|not found/i);
    });

    it('should return 400 for invalid data types', async () => {
      const invalidRequests = [
        { transactionIds: 'not-an-array', spendingCategoryId: testCategoryId },
        { transactionIds: testTransactionIds.slice(0, 2), spendingCategoryId: 123 },
        { transactionIds: [123, 456], spendingCategoryId: testCategoryId },
        { transactionIds: [null, undefined], spendingCategoryId: testCategoryId }
      ];

      for (const batchRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/transactions/categorize-batch')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(batchRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Mixed Results Handling', () => {
    it('should handle mix of valid and invalid transaction IDs', async () => {
      const batchRequest = {
        transactionIds: [
          testTransactionIds[0], // Valid
          '00000000-0000-0000-0000-000000000000', // Valid UUID but non-existent
          testTransactionIds[1] || 'test-transaction-2' // Valid or fallback
        ],
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.summary.totalRequested).toBe(3);
      expect(response.body.summary.totalUpdated + response.body.summary.totalErrors).toBe(3);

      // Should have some successful updates and some errors
      expect(response.body.updated.length).toBeGreaterThan(0);
      expect(response.body.errors.length).toBeGreaterThan(0);

      // Errors should specify which transactions failed
      response.body.errors.forEach((error: any) => {
        expect(batchRequest.transactionIds).toContain(error.transactionId);
        expect(typeof error.error).toBe('string');
      });
    });

    it('should handle duplicate transaction IDs', async () => {
      const batchRequest = {
        transactionIds: [
          testTransactionIds[0],
          testTransactionIds[0], // Duplicate
          testTransactionIds[1] || 'test-transaction-2'
        ],
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should handle duplicates gracefully
      expect(response.body.summary.totalRequested).toBe(3);

      // May either update duplicate once or report error
      expect(response.body.summary.totalUpdated + response.body.summary.totalErrors).toBe(3);
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 2),
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 2),
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', 'Bearer invalid-token')
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should not categorize transactions from different families', async () => {
      // Create second family with transactions
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

      // Create bank account and transactions for other family
      const otherAccountResponse = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-other-family'
        });

      await request(API_BASE_URL)
        .post(`/api/bank-accounts/${otherAccountResponse.body?.id}/sync`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`);

      const otherTransactionsResponse = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`);

      const otherTransactionIds = otherTransactionsResponse.body?.transactions?.map((t: any) => t.id) || ['other-tx-1'];

      // Original user should not categorize other family's transactions
      const batchRequest = {
        transactionIds: otherTransactionIds.slice(0, 1),
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should report errors for all transaction IDs from other family
      expect(response.body.summary.totalUpdated).toBe(0);
      expect(response.body.summary.totalErrors).toBe(batchRequest.transactionIds.length);
      expect(response.body.errors.length).toBe(batchRequest.transactionIds.length);
    });

    it('should not use categories from different families', async () => {
      // Create category for second family
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

      const otherCategoryResponse = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Family Category',
          color: '#FF0000',
          icon: 'home'
        });

      const otherCategoryId = otherCategoryResponse.body?.id || 'other-category-uuid';

      // Original user should not use other family's category
      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 2),
        spendingCategoryId: otherCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Content-Type Requirements', () => {
    it('should require JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send('transactionIds=123&spendingCategoryId=456')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });

    it('should return JSON content type', async () => {
      const batchRequest = {
        transactionIds: testTransactionIds.slice(0, 1),
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest)
        .expect('Content-Type', /json/);

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time for large batch', async () => {
      const largeBatch = Array(50).fill(0).map((_, i) =>
        testTransactionIds[i % testTransactionIds.length] || `test-transaction-${i}`
      );

      const batchRequest = {
        transactionIds: largeBatch,
        spendingCategoryId: testCategoryId
      };

      const startTime = Date.now();

      await request(API_BASE_URL)
        .post('/api/transactions/categorize-batch')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(batchRequest);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds for large batch
    });
  });
});