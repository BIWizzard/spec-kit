/**
 * Contract Test: GET /api/payments
 * Task: T066 - Payments list endpoint contract validation
 *
 * This test validates the payments list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/payments', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  const testUser = {
    email: 'payments.list@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Test',
    familyName: 'Payment List Family'
  };

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.payment.deleteMany();
    await prisma.spendingCategory.deleteMany();
    await prisma.budgetCategory.deleteMany();
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

    // Create budget category and spending category for test payments
    const budgetCategoryResponse = await request(API_BASE_URL)
      .post('/api/budget-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Budget Category',
        targetAmount: 1000.00,
        period: 'monthly'
      });

    const spendingCategoryResponse = await request(API_BASE_URL)
      .post('/api/spending-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Spending Category',
        budgetCategoryId: budgetCategoryResponse.body.id,
        color: '#FF0000',
        icon: 'bill'
      });

    spendingCategoryId = spendingCategoryResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Payments List Request', () => {
    it('should return 200 with paginated payments list structure', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('payments');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('summary');

      expect(Array.isArray(response.body.payments)).toBe(true);

      // Validate pagination structure
      const pagination = response.body.pagination;
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('offset');
      expect(pagination).toHaveProperty('hasMore');

      // Validate summary structure
      const summary = response.body.summary;
      expect(summary).toHaveProperty('totalScheduled');
      expect(summary).toHaveProperty('totalPaid');
      expect(summary).toHaveProperty('totalOverdue');
      expect(summary).toHaveProperty('totalAttributed');
    });

    it('should return payments with correct structure when they exist', async () => {
      // Create a test payment
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Electric Company',
          amount: 125.50,
          dueDate: '2024-02-01',
          paymentType: 'recurring',
          frequency: 'monthly',
          spendingCategoryId: spendingCategoryId,
          autoPayEnabled: false,
          notes: 'Monthly electric bill'
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.payments.length).toBeGreaterThan(0);

      // Validate payment summary structure per OpenAPI spec
      const payment = response.body.payments[0];
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('payee');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('dueDate');
      expect(payment).toHaveProperty('paidDate');
      expect(payment).toHaveProperty('paidAmount');
      expect(payment).toHaveProperty('paymentType');
      expect(payment).toHaveProperty('frequency');
      expect(payment).toHaveProperty('status');
      expect(payment).toHaveProperty('spendingCategory');
      expect(payment).toHaveProperty('autoPayEnabled');
      expect(payment).toHaveProperty('attributedAmount');
      expect(payment).toHaveProperty('remainingAmount');
      expect(payment).toHaveProperty('nextDueDate');

      // Validate data types
      expect(typeof payment.id).toBe('string');
      expect(typeof payment.payee).toBe('string');
      expect(typeof payment.amount).toBe('number');
      expect(typeof payment.dueDate).toBe('string');
      expect(typeof payment.paymentType).toBe('string');
      expect(typeof payment.status).toBe('string');
      expect(typeof payment.autoPayEnabled).toBe('boolean');

      // Validate enum values
      expect(['once', 'recurring', 'variable']).toContain(payment.paymentType);
      expect(['scheduled', 'paid', 'overdue', 'cancelled', 'partial']).toContain(payment.status);
      expect(['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual']).toContain(payment.frequency);

      // Validate spending category structure
      expect(payment.spendingCategory).toHaveProperty('id');
      expect(payment.spendingCategory).toHaveProperty('name');
      expect(payment.spendingCategory).toHaveProperty('color');
      expect(payment.spendingCategory).toHaveProperty('icon');
    });
  });

  describe('Query Parameters and Filtering', () => {
    it('should support pagination parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({
          limit: 10,
          offset: 0
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should support status filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({ status: 'scheduled' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    it('should support payment type filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({ paymentType: 'recurring' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    it('should support spending category filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({ spendingCategoryId: spendingCategoryId })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    it('should support date range filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({
          fromDueDate: '2024-01-01',
          toDueDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    it('should support sorting parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({
          sortBy: 'dueDate',
          sortOrder: 'desc'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.payments)).toBe(true);
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return payments for authenticated user\'s family', async () => {
      // Create second family with payment
      const secondFamily = {
        email: 'other.payments@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Payment Family'
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

      // Create budget and spending category for other family
      const otherBudgetResponse = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Budget Category',
          targetAmount: 1500.00,
          period: 'monthly'
        });

      const otherSpendingResponse = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Spending Category',
          budgetCategoryId: otherBudgetResponse.body.id,
          color: '#00FF00',
          icon: 'food'
        });

      // Create payment for other family
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          payee: 'Other Family Expense',
          amount: 200.00,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: otherSpendingResponse.body.id
        });

      // Original user should not see other family's payments
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.payments.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid status filter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({ status: 'invalid-status' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });

    it('should return 400 for invalid payment type filter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({ paymentType: 'invalid-type' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .query({ fromDueDate: 'invalid-date' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const invalidQueries = [
        { limit: -1 },
        { limit: 'invalid' },
        { limit: 101 }, // Over max limit
        { offset: -1 },
        { offset: 'invalid' }
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/payments')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid sorting parameters', async () => {
      const invalidQueries = [
        { sortBy: 'invalid-field' },
        { sortOrder: 'invalid-order' }
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/payments')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Performance and Limits', () => {
    it('should enforce default limit of 20', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.pagination.limit).toBe(20);
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);
    });
  });
});