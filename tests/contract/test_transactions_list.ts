/**
 * Contract Test: GET /api/transactions
 * Task: T089 - Transactions list endpoint contract validation
 *
 * This test validates the transactions list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/transactions', () => {
  let authTokens: any;
  let testAccountId: string;
  const testUser = {
    email: 'transactions@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Transaction',
    lastName: 'Test',
    familyName: 'Transaction Family'
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

    // Create a test bank account for transaction testing
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

  describe('Valid Transactions List Request', () => {
    it('should return 200 with empty list when no transactions exist', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('summary');

      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBe(0);

      // Validate pagination structure
      const { pagination } = response.body;
      expect(pagination).toHaveProperty('total', 0);
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('offset');
      expect(pagination).toHaveProperty('hasMore', false);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalAmount');
      expect(summary).toHaveProperty('incomeAmount');
      expect(summary).toHaveProperty('expenseAmount');
      expect(typeof summary.totalAmount).toBe('number');
      expect(typeof summary.incomeAmount).toBe('number');
      expect(typeof summary.expenseAmount).toBe('number');
    });

    it('should return 200 with transactions when they exist', async () => {
      // Trigger sync to create transactions (mock scenario)
      await request(API_BASE_URL)
        .post(`/api/bank-accounts/${testAccountId}/sync`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);

      // If transactions exist, validate structure
      if (response.body.transactions.length > 0) {
        const transaction = response.body.transactions[0];
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
        expect(typeof transaction.description).toBe('string');
        expect(typeof transaction.pending).toBe('boolean');
        expect(typeof transaction.categoryConfidence).toBe('number');
        expect(typeof transaction.userCategorized).toBe('boolean');

        // Validate nested objects
        expect(transaction.bankAccount).toHaveProperty('id');
        expect(transaction.bankAccount).toHaveProperty('institutionName');
        expect(transaction.bankAccount).toHaveProperty('accountName');

        // Validate ranges
        expect(transaction.categoryConfidence).toBeGreaterThanOrEqual(0);
        expect(transaction.categoryConfidence).toBeLessThanOrEqual(1);
      }
    });

    it('should use default pagination parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.pagination.limit).toBe(50); // Default limit
      expect(response.body.pagination.offset).toBe(0);  // Default offset
    });
  });

  describe('Query Parameters', () => {
    it('should support pagination parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({
          limit: 25,
          offset: 10
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.pagination.limit).toBe(25);
      expect(response.body.pagination.offset).toBe(10);
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeLessThanOrEqual(25);
    });

    it('should support account filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({ accountId: testAccountId })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      // All returned transactions should belong to the specified account
      response.body.transactions.forEach((transaction: any) => {
        expect(transaction.bankAccount.id).toBe(testAccountId);
      });
    });

    it('should support date range filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      // All returned transactions should be within date range
      response.body.transactions.forEach((transaction: any) => {
        const transactionDate = new Date(transaction.date);
        expect(transactionDate.getTime()).toBeGreaterThanOrEqual(new Date('2024-01-01').getTime());
        expect(transactionDate.getTime()).toBeLessThanOrEqual(new Date('2024-12-31').getTime());
      });
    });

    it('should support amount range filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({
          minAmount: 10.00,
          maxAmount: 1000.00
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      response.body.transactions.forEach((transaction: any) => {
        expect(Math.abs(transaction.amount)).toBeGreaterThanOrEqual(10.00);
        expect(Math.abs(transaction.amount)).toBeLessThanOrEqual(1000.00);
      });
    });

    it('should support pending status filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({ pending: true })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      response.body.transactions.forEach((transaction: any) => {
        expect(transaction.pending).toBe(true);
      });
    });

    it('should support search functionality', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({ search: 'coffee' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      // Results should contain search term in description or merchant name
      response.body.transactions.forEach((transaction: any) => {
        const searchFields = [transaction.description, transaction.merchantName].join(' ').toLowerCase();
        expect(searchFields).toMatch(/coffee/i);
      });
    });

    it('should support sorting parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({
          sortBy: 'amount',
          sortOrder: 'desc'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);

      // Check if results are sorted by amount descending
      if (response.body.transactions.length > 1) {
        for (let i = 1; i < response.body.transactions.length; i++) {
          expect(Math.abs(response.body.transactions[i-1].amount))
            .toBeGreaterThanOrEqual(Math.abs(response.body.transactions[i].amount));
        }
      }
    });

    it('should use default sorting (date desc)', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should be sorted by date descending by default
      if (response.body.transactions.length > 1) {
        for (let i = 1; i < response.body.transactions.length; i++) {
          const prevDate = new Date(response.body.transactions[i-1].date);
          const currDate = new Date(response.body.transactions[i].date);
          expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
        }
      }
    });
  });

  describe('Invalid Query Parameters', () => {
    it('should return 400 for invalid pagination parameters', async () => {
      const invalidQueries = [
        { limit: -1 },
        { limit: 'invalid' },
        { limit: 1000 }, // Too large
        { offset: -1 },
        { offset: 'invalid' }
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/transactions')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid date formats', async () => {
      const invalidDates = [
        { fromDate: 'invalid-date' },
        { toDate: 'not-a-date' },
        { fromDate: '2024-13-01' }, // Invalid month
        { toDate: '2024-02-30' }    // Invalid day
      ];

      for (const query of invalidDates) {
        const response = await request(API_BASE_URL)
          .get('/api/transactions')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid amount parameters', async () => {
      const invalidAmounts = [
        { minAmount: 'not-a-number' },
        { maxAmount: 'invalid' },
        { minAmount: -1 },     // Negative minimum
        { maxAmount: -100 }    // Negative maximum
      ];

      for (const query of invalidAmounts) {
        const response = await request(API_BASE_URL)
          .get('/api/transactions')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid sort parameters', async () => {
      const invalidSorts = [
        { sortBy: 'invalid-field' },
        { sortOrder: 'invalid-order' },
        { sortBy: 'date', sortOrder: 'random' }
      ];

      for (const query of invalidSorts) {
        const response = await request(API_BASE_URL)
          .get('/api/transactions')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid UUID in accountId', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({ accountId: 'invalid-uuid' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return transactions for authenticated user\'s family', async () => {
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
      await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-other-family'
        });

      // Original user should not see other family's transactions
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      // Should only show transactions from user's own accounts
      response.body.transactions.forEach((transaction: any) => {
        expect(transaction.bankAccount.id).toBe(testAccountId);
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });

    it('should enforce reasonable result limits', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .query({ limit: 500 }) // Maximum allowed
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.transactions.length).toBeLessThanOrEqual(500);
      expect(response.body.pagination.limit).toBeLessThanOrEqual(500);
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Transaction data should be cacheable but with short TTL
      expect(response.headers['cache-control']).toMatch(/max-age=|no-cache/);
    });
  });
});