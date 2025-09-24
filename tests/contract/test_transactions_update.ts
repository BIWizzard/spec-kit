/**
 * Contract Test: PUT /api/transactions/{transactionId}
 * Task: T091 - Transaction update endpoint contract validation
 *
 * This test validates the transaction update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/transactions/{transactionId}', () => {
  let authTokens: any;
  let testAccountId: string;
  let testTransactionId: string;
  let testCategoryId: string;
  const testUser = {
    email: 'transactionupdate@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Transaction',
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

    // Create a test bank account
    const accountResponse = await request(API_BASE_URL)
      .post('/api/bank-accounts')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
      });

    testAccountId = accountResponse.body?.id || 'test-account-uuid';

    // Create spending categories for testing
    const categoryResponse = await request(API_BASE_URL)
      .post('/api/spending-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Category',
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
      .set('Authorization', `Bearer ${authTokens.accessToken}`);

    testTransactionId = transactionsResponse.body?.transactions?.[0]?.id || 'test-transaction-uuid';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Transaction Update Request', () => {
    it('should return 200 when updating spending category', async () => {
      const updateRequest = {
        spendingCategoryId: testCategoryId
      };

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure matches TransactionResponse
      expect(response.body).toHaveProperty('id', testTransactionId);
      expect(response.body).toHaveProperty('spendingCategory');
      expect(response.body).toHaveProperty('userCategorized', true);
      expect(response.body).toHaveProperty('updatedAt');

      // Validate spending category details
      if (response.body.spendingCategory) {
        expect(response.body.spendingCategory.id).toBe(testCategoryId);
        expect(response.body.spendingCategory).toHaveProperty('name', 'Test Category');
        expect(response.body.spendingCategory).toHaveProperty('color', '#FF5733');
        expect(response.body.spendingCategory).toHaveProperty('icon', 'shopping-cart');
      }

      // updatedAt should be recent
      const updatedAt = new Date(response.body.updatedAt);
      const now = new Date();
      expect(now.getTime() - updatedAt.getTime()).toBeLessThan(5000); // Within 5 seconds
    });

    it('should return 200 when updating notes', async () => {
      const updateRequest = {
        notes: 'This is a test note for the transaction'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testTransactionId);
      expect(response.body).toHaveProperty('notes', updateRequest.notes);
      expect(response.body).toHaveProperty('updatedAt');

      // Notes should not affect categorization
      expect(typeof response.body.userCategorized).toBe('boolean');
    });

    it('should return 200 when updating both category and notes', async () => {
      const updateRequest = {
        spendingCategoryId: testCategoryId,
        notes: 'Updated category and added notes'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testTransactionId);
      expect(response.body).toHaveProperty('notes', updateRequest.notes);
      expect(response.body).toHaveProperty('userCategorized', true);
      expect(response.body.spendingCategory.id).toBe(testCategoryId);
    });

    it('should return 200 when removing category (set to null)', async () => {
      // First set a category
      await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ spendingCategoryId: testCategoryId });

      // Then remove it
      const updateRequest = {
        spendingCategoryId: null
      };

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testTransactionId);
      expect(response.body.spendingCategory).toBeNull();
      expect(response.body.userCategorized).toBe(false);
    });

    it('should handle empty update request gracefully', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/);

      // Should either succeed with no changes or return validation error
      expect([200, 400]).toContain(response.status);
    });

    it('should preserve other transaction data during update', async () => {
      // Get original transaction details
      const originalResponse = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const originalData = originalResponse.body;

      // Update only notes
      const updateRequest = {
        notes: 'Only updating notes'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Only notes should change, other fields preserved
      expect(response.body.notes).toBe(updateRequest.notes);
      expect(response.body.amount).toBe(originalData.amount);
      expect(response.body.description).toBe(originalData.description);
      expect(response.body.date).toBe(originalData.date);
      expect(response.body.pending).toBe(originalData.pending);
    });
  });

  describe('Invalid Update Requests', () => {
    it('should return 400 for invalid spending category ID', async () => {
      const invalidCategoryIds = [
        'invalid-uuid',
        '12345',
        'not-a-uuid',
        ''
      ];

      for (const spendingCategoryId of invalidCategoryIds) {
        const response = await request(API_BASE_URL)
          .put(`/api/transactions/${testTransactionId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({ spendingCategoryId })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for non-existent spending category', async () => {
      const nonExistentCategoryId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ spendingCategoryId: nonExistentCategoryId })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/category|not found/i);
    });

    it('should return 400 for notes exceeding maximum length', async () => {
      const longNotes = 'a'.repeat(1001); // Over 1000 character limit

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ notes: longNotes })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/notes|length|long/i);
    });

    it('should return 400 for invalid data types', async () => {
      const invalidRequests = [
        { spendingCategoryId: 123 },     // Number instead of string/null
        { notes: 123 },                 // Number instead of string
        { spendingCategoryId: [] },     // Array instead of string/null
        { notes: {} }                   // Object instead of string
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .put(`/api/transactions/${testTransactionId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for unsupported fields', async () => {
      const unsupportedFields = {
        amount: 100.50,
        description: 'Cannot change description',
        date: '2024-01-01',
        pending: false,
        plaidTransactionId: 'cannot-change'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
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

  describe('Transaction Not Found', () => {
    it('should return 404 for non-existent transaction', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${nonExistentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ notes: 'Test note' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Transaction not found');
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
          .put(`/api/transactions/${invalidId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({ notes: 'Test note' })
          .expect('Content-Type', /json/);

        expect([400, 404]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .send({ notes: 'Test note' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ notes: 'Test note' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should return 404 for transaction belonging to different family', async () => {
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

      const otherTransactionId = otherTransactionsResponse.body?.transactions?.[0]?.id || 'other-transaction-uuid';

      // Original user should not update other family's transaction
      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${otherTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ notes: 'Unauthorized update' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Transaction not found');
    });

    it('should only allow categories from same family', async () => {
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
      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ spendingCategoryId: otherCategoryId })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Content-Type Requirements', () => {
    it('should require JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send('notes=Form encoded notes')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ notes: 'JSON response test' })
        .expect('Content-Type', /json/);

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Concurrent Update Handling', () => {
    it('should handle concurrent updates gracefully', async () => {
      const update1 = request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ notes: 'Concurrent update 1' });

      const update2 = request(API_BASE_URL)
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ notes: 'Concurrent update 2' });

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
        .put(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ notes: 'Performance test' });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});