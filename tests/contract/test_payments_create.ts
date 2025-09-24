/**
 * Contract Test: POST /api/payments
 * Task: T067 - Payment creation endpoint contract validation
 *
 * This test validates the payment creation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/payments', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  const testUser = {
    email: 'payments.create@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Create',
    familyName: 'Payment Create Family'
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

  describe('Valid Payment Creation', () => {
    it('should create one-time payment and return 201', async () => {
      const paymentData = {
        payee: 'Electric Company',
        amount: 125.50,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId: spendingCategoryId,
        autoPayEnabled: false,
        notes: 'Monthly electric bill',
        autoAttribute: true
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('payee', paymentData.payee);
      expect(response.body).toHaveProperty('amount', paymentData.amount);
      expect(response.body).toHaveProperty('dueDate', paymentData.dueDate);
      expect(response.body).toHaveProperty('paymentType', paymentData.paymentType);
      expect(response.body).toHaveProperty('frequency', null);
      expect(response.body).toHaveProperty('status', 'scheduled');
      expect(response.body).toHaveProperty('spendingCategory');
      expect(response.body).toHaveProperty('autoPayEnabled', paymentData.autoPayEnabled);
      expect(response.body).toHaveProperty('attributedAmount', 0);
      expect(response.body).toHaveProperty('remainingAmount', paymentData.amount);
      expect(response.body).toHaveProperty('notes', paymentData.notes);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.createdAt).toBe('string');
      expect(typeof response.body.updatedAt).toBe('string');
    });

    it('should create recurring payment and return 201', async () => {
      const paymentData = {
        payee: 'Mortgage Company',
        amount: 1500.00,
        dueDate: '2024-02-01',
        paymentType: 'recurring',
        frequency: 'monthly',
        spendingCategoryId: spendingCategoryId,
        autoPayEnabled: true,
        notes: 'Monthly mortgage payment'
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('paymentType', 'recurring');
      expect(response.body).toHaveProperty('frequency', 'monthly');
      expect(response.body).toHaveProperty('nextDueDate');
      expect(typeof response.body.nextDueDate).toBe('string');
    });

    it('should create variable payment and return 201', async () => {
      const paymentData = {
        payee: 'Utility Company',
        amount: 85.75,
        dueDate: '2024-02-15',
        paymentType: 'variable',
        frequency: 'monthly',
        spendingCategoryId: spendingCategoryId,
        autoPayEnabled: false
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('paymentType', 'variable');
      expect(response.body).toHaveProperty('frequency', 'monthly');
    });

    it('should handle minimum required fields', async () => {
      const paymentData = {
        payee: 'Simple Payment',
        amount: 50.00,
        dueDate: '2024-03-01',
        paymentType: 'once',
        spendingCategoryId: spendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('payee', paymentData.payee);
      expect(response.body).toHaveProperty('autoPayEnabled', false); // default value
      expect(response.body).toHaveProperty('notes', null);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing required fields', async () => {
      const incompletePayments = [
        { amount: 100, dueDate: '2024-02-01', paymentType: 'once', spendingCategoryId }, // missing payee
        { payee: 'Test', dueDate: '2024-02-01', paymentType: 'once', spendingCategoryId }, // missing amount
        { payee: 'Test', amount: 100, paymentType: 'once', spendingCategoryId }, // missing dueDate
        { payee: 'Test', amount: 100, dueDate: '2024-02-01', spendingCategoryId }, // missing paymentType
        { payee: 'Test', amount: 100, dueDate: '2024-02-01', paymentType: 'once' } // missing spendingCategoryId
      ];

      for (const paymentData of incompletePayments) {
        const response = await request(API_BASE_URL)
          .post('/api/payments')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(paymentData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid data types and formats', async () => {
      const invalidPayments = [
        {
          payee: '', // empty string
          amount: 100,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId
        },
        {
          payee: 'Test',
          amount: 0, // invalid minimum
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId
        },
        {
          payee: 'Test',
          amount: 'invalid', // invalid type
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId
        },
        {
          payee: 'Test',
          amount: 100,
          dueDate: 'invalid-date', // invalid date format
          paymentType: 'once',
          spendingCategoryId
        },
        {
          payee: 'Test',
          amount: 100,
          dueDate: '2024-02-01',
          paymentType: 'invalid-type', // invalid enum
          spendingCategoryId
        }
      ];

      for (const paymentData of invalidPayments) {
        const response = await request(API_BASE_URL)
          .post('/api/payments')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(paymentData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for recurring/variable payments without frequency', async () => {
      const paymentWithoutFrequency = {
        payee: 'Test Recurring',
        amount: 100,
        dueDate: '2024-02-01',
        paymentType: 'recurring',
        spendingCategoryId
        // missing frequency
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentWithoutFrequency)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/frequency.*required/i);
    });

    it('should return 400 for invalid frequency values', async () => {
      const paymentWithInvalidFrequency = {
        payee: 'Test Recurring',
        amount: 100,
        dueDate: '2024-02-01',
        paymentType: 'recurring',
        frequency: 'invalid-frequency',
        spendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentWithInvalidFrequency)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for amount exceeding maximum', async () => {
      const paymentWithLargeAmount = {
        payee: 'Expensive Payment',
        amount: 1000000.00, // exceeds max 999999.99
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentWithLargeAmount)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for notes exceeding maximum length', async () => {
      const paymentWithLongNotes = {
        payee: 'Test Payment',
        amount: 100,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId,
        notes: 'x'.repeat(1001) // exceeds max 1000 characters
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentWithLongNotes)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const paymentData = {
        payee: 'Test Payment',
        amount: 100,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const paymentData = {
        payee: 'Test Payment',
        amount: 100,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', 'Bearer invalid-token')
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });

    it('should return 403 when trying to use spending category from another family', async () => {
      // Create second family
      const secondFamily = {
        email: 'other.family@example.com',
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

      // Create spending category for other family
      const otherBudgetResponse = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Budget Category',
          targetAmount: 1000.00,
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

      // Try to use other family's spending category
      const paymentData = {
        payee: 'Test Payment',
        amount: 100,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId: otherSpendingResponse.body.id
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });
  });

  describe('Edge Cases', () => {
    it('should handle past due date correctly', async () => {
      const paymentData = {
        payee: 'Past Due Payment',
        amount: 100,
        dueDate: '2023-01-01', // past date
        paymentType: 'once',
        spendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'overdue');
    });

    it('should handle minimum valid amount', async () => {
      const paymentData = {
        payee: 'Minimum Payment',
        amount: 0.01,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('amount', 0.01);
    });

    it('should handle maximum valid amount', async () => {
      const paymentData = {
        payee: 'Maximum Payment',
        amount: 999999.99,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('amount', 999999.99);
    });
  });

  describe('Auto-Attribution', () => {
    it('should handle auto-attribute flag when true', async () => {
      const paymentData = {
        payee: 'Auto-Attributed Payment',
        amount: 100,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId,
        autoAttribute: true
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Auto-attribution behavior will depend on implementation
      expect(response.body).toHaveProperty('attributedAmount');
      expect(response.body).toHaveProperty('remainingAmount');
    });

    it('should handle auto-attribute flag when false', async () => {
      const paymentData = {
        payee: 'Manual Attribution Payment',
        amount: 100,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId,
        autoAttribute: false
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(paymentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('attributedAmount', 0);
      expect(response.body).toHaveProperty('remainingAmount', 100);
    });
  });
});