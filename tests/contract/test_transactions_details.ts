/**
 * Contract Test: GET /api/transactions/{transactionId}
 * Task: T090 - Transaction details endpoint contract validation
 *
 * This test validates the transaction details API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/transactions/{transactionId}', () => {
  let authTokens: any;
  let testAccountId: string;
  let testTransactionId: string;
  const testUser = {
    email: 'transactiondetails@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Transaction',
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

    // Create a test bank account
    const accountResponse = await request(API_BASE_URL)
      .post('/api/bank-accounts')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
      });

    testAccountId = accountResponse.body?.id || 'test-account-uuid';

    // Trigger sync to create transactions and get a transaction ID
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

  describe('Valid Transaction Details Request', () => {
    it('should return 200 with transaction details for existing transaction', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate base transaction properties
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('plaidTransactionId');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('merchantName');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('spendingCategory');
      expect(response.body).toHaveProperty('categoryConfidence');
      expect(response.body).toHaveProperty('userCategorized');
      expect(response.body).toHaveProperty('bankAccount');

      // Validate detailed view properties (additional to summary)
      expect(response.body).toHaveProperty('notes');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.amount).toBe('number');
      expect(typeof response.body.description).toBe('string');
      expect(typeof response.body.pending).toBe('boolean');
      expect(typeof response.body.categoryConfidence).toBe('number');
      expect(typeof response.body.userCategorized).toBe('boolean');

      // Validate ranges
      expect(response.body.categoryConfidence).toBeGreaterThanOrEqual(0);
      expect(response.body.categoryConfidence).toBeLessThanOrEqual(1);

      // Validate nested bank account object
      expect(response.body.bankAccount).toHaveProperty('id');
      expect(response.body.bankAccount).toHaveProperty('institutionName');
      expect(response.body.bankAccount).toHaveProperty('accountName');
      expect(typeof response.body.bankAccount.id).toBe('string');
      expect(typeof response.body.bankAccount.institutionName).toBe('string');
      expect(typeof response.body.bankAccount.accountName).toBe('string');

      // Validate date formats
      expect(new Date(response.body.date)).toBeInstanceOf(Date);
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);
    });

    it('should include spending category details if categorized', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      if (response.body.spendingCategory) {
        expect(response.body.spendingCategory).toHaveProperty('id');
        expect(response.body.spendingCategory).toHaveProperty('name');
        expect(response.body.spendingCategory).toHaveProperty('color');
        expect(response.body.spendingCategory).toHaveProperty('icon');

        expect(typeof response.body.spendingCategory.id).toBe('string');
        expect(typeof response.body.spendingCategory.name).toBe('string');
        expect(typeof response.body.spendingCategory.color).toBe('string');
        expect(typeof response.body.spendingCategory.icon).toBe('string');
      }
    });

    it('should handle null/empty optional fields correctly', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Optional fields can be null or undefined
      if (response.body.merchantName !== null) {
        expect(typeof response.body.merchantName).toBe('string');
      }

      if (response.body.notes !== null) {
        expect(typeof response.body.notes).toBe('string');
      }

      if (response.body.spendingCategory === null) {
        expect(response.body.categoryConfidence).toBe(0);
        expect(response.body.userCategorized).toBe(false);
      }
    });
  });

  describe('Transaction Not Found', () => {
    it('should return 404 for non-existent transaction', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${nonExistentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
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
        'not-a-uuid',
        'transaction-123'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .get(`/api/transactions/${invalidId}`)
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
        .get(`/api/transactions/${testTransactionId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should return 404 for transaction belonging to different family', async () => {
      // Create second family with bank account and transactions
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

      // Sync to create transactions for other family
      await request(API_BASE_URL)
        .post(`/api/bank-accounts/${otherAccountResponse.body?.id}/sync`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`);

      // Get other family's transaction ID
      const otherTransactionsResponse = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`);

      const otherTransactionId = otherTransactionsResponse.body?.transactions?.[0]?.id || 'other-transaction-uuid';

      // Original user should not access other family's transaction
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${otherTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Transaction not found');
    });
  });

  describe('Transaction States', () => {
    it('should return details for pending transactions', async () => {
      // Find or create a pending transaction
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate pending flag
      expect(typeof response.body.pending).toBe('boolean');

      if (response.body.pending) {
        // Pending transactions may have limited information
        expect(response.body).toHaveProperty('amount');
        expect(response.body).toHaveProperty('description');
        expect(response.body).toHaveProperty('date');
      }
    });

    it('should return details for categorized transactions', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      if (response.body.spendingCategory) {
        expect(response.body.userCategorized).toBe(true);
        expect(response.body.categoryConfidence).toBeGreaterThan(0);
      } else {
        expect(response.body.categoryConfidence).toBe(0);
      }
    });

    it('should return details for uncategorized transactions', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      if (!response.body.spendingCategory) {
        expect(response.body.userCategorized).toBe(false);
        expect(response.body.categoryConfidence).toBe(0);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent transaction amounts', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Amount should be a valid number with reasonable precision
      expect(typeof response.body.amount).toBe('number');
      expect(isFinite(response.body.amount)).toBe(true);

      // Should have at most 2 decimal places for currency
      const decimalPlaces = (response.body.amount.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should have valid date formats and order', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const transactionDate = new Date(response.body.date);
      const createdAt = new Date(response.body.createdAt);
      const updatedAt = new Date(response.body.updatedAt);

      // All dates should be valid
      expect(transactionDate.getTime()).not.toBeNaN();
      expect(createdAt.getTime()).not.toBeNaN();
      expect(updatedAt.getTime()).not.toBeNaN();

      // updatedAt should be >= createdAt
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());

      // Transaction date should be reasonable (not in future beyond today)
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      expect(transactionDate.getTime()).toBeLessThanOrEqual(today.getTime());
    });

    it('should have valid merchant and description data', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Description should be a non-empty string
      expect(typeof response.body.description).toBe('string');
      expect(response.body.description.length).toBeGreaterThan(0);

      // Merchant name can be null or string
      if (response.body.merchantName) {
        expect(typeof response.body.merchantName).toBe('string');
        expect(response.body.merchantName.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      expect([200, 404]).toContain(response.status);
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      if (response.status === 200) {
        // Transaction details should be cacheable but with short TTL
        expect(response.headers['cache-control']).toMatch(/max-age=|no-cache/);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  describe('Related Data Consistency', () => {
    it('should have consistent bank account information', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Bank account ID should match an existing account
      const accountResponse = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const accountIds = accountResponse.body.accounts.map((acc: any) => acc.id);
      expect(accountIds).toContain(response.body.bankAccount.id);

      // Bank account details should be consistent
      const matchingAccount = accountResponse.body.accounts.find((acc: any) =>
        acc.id === response.body.bankAccount.id
      );

      if (matchingAccount) {
        expect(response.body.bankAccount.institutionName).toBe(matchingAccount.institutionName);
        expect(response.body.bankAccount.accountName).toBe(matchingAccount.accountName);
      }
    });
  });
});