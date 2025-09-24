/**
 * Contract Test: POST /api/payments/bulk
 * Task: T077 - Payments bulk create endpoint contract validation
 *
 * This test validates the bulk payments creation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/payments/bulk', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  let altSpendingCategoryId: string;
  const testUser = {
    email: 'payments.bulk@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Bulk',
    familyName: 'Payment Bulk Family'
  };

  beforeEach(async () => {
    await prisma.payment.deleteMany();
    await prisma.spendingCategory.deleteMany();
    await prisma.budgetCategory.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

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

    const budgetCategoryResponse = await request(API_BASE_URL)
      .post('/api/budget-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Budget Category',
        targetAmount: 1000.00,
        period: 'monthly'
      });

    const altBudgetCategoryResponse = await request(API_BASE_URL)
      .post('/api/budget-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Alt Budget Category',
        targetAmount: 1500.00,
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

    const altSpendingCategoryResponse = await request(API_BASE_URL)
      .post('/api/spending-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Alt Spending Category',
        budgetCategoryId: altBudgetCategoryResponse.body.id,
        color: '#00FF00',
        icon: 'food'
      });

    spendingCategoryId = spendingCategoryResponse.body.id;
    altSpendingCategoryId = altSpendingCategoryResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Bulk Payment Creation', () => {
    it('should create multiple payments successfully', async () => {
      const bulkData = {
        payments: [
          {
            payee: 'Electric Company',
            amount: 125.50,
            dueDate: '2024-02-01',
            paymentType: 'recurring',
            frequency: 'monthly',
            spendingCategoryId: spendingCategoryId,
            autoPayEnabled: false,
            notes: 'Monthly electric bill'
          },
          {
            payee: 'Water Company',
            amount: 75.25,
            dueDate: '2024-02-05',
            paymentType: 'recurring',
            frequency: 'monthly',
            spendingCategoryId: spendingCategoryId
          },
          {
            payee: 'Internet Provider',
            amount: 89.99,
            dueDate: '2024-02-10',
            paymentType: 'once',
            spendingCategoryId: altSpendingCategoryId,
            autoPayEnabled: true
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('created');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('summary');

      expect(Array.isArray(response.body.created)).toBe(true);
      expect(Array.isArray(response.body.errors)).toBe(true);

      // Validate summary structure
      const summary = response.body.summary;
      expect(summary).toHaveProperty('totalRequested', 3);
      expect(summary).toHaveProperty('totalCreated', 3);
      expect(summary).toHaveProperty('totalErrors', 0);

      // Validate created payments
      expect(response.body.created.length).toBe(3);
      expect(response.body.errors.length).toBe(0);

      // Validate individual payment structure
      const payment = response.body.created[0];
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('payee');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('dueDate');
      expect(payment).toHaveProperty('paymentType');
      expect(payment).toHaveProperty('status', 'scheduled');
      expect(payment).toHaveProperty('createdAt');
    });

    it('should handle mixed success and failure scenarios', async () => {
      const bulkData = {
        payments: [
          {
            payee: 'Valid Payment',
            amount: 100.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          },
          {
            payee: '', // Invalid - empty payee
            amount: 50.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          },
          {
            payee: 'Another Valid Payment',
            amount: 75.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.summary.totalRequested).toBe(3);
      expect(response.body.summary.totalCreated).toBe(2);
      expect(response.body.summary.totalErrors).toBe(1);

      expect(response.body.created.length).toBe(2);
      expect(response.body.errors.length).toBe(1);

      // Validate error structure
      const error = response.body.errors[0];
      expect(error).toHaveProperty('index', 1); // second payment (0-indexed)
      expect(error).toHaveProperty('error');
      expect(error).toHaveProperty('message');
    });

    it('should handle single payment in bulk request', async () => {
      const bulkData = {
        payments: [
          {
            payee: 'Single Payment',
            amount: 200.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.summary.totalCreated).toBe(1);
      expect(response.body.created.length).toBe(1);
    });

    it('should handle maximum allowed payments (50)', async () => {
      const payments = [];
      for (let i = 0; i < 50; i++) {
        payments.push({
          payee: `Payment ${i + 1}`,
          amount: 10.00 + i,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });
      }

      const bulkData = { payments };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.summary.totalRequested).toBe(50);
      expect(response.body.summary.totalCreated).toBe(50);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for empty payments array', async () => {
      const bulkData = {
        payments: []
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/at least.*payment/i);
    });

    it('should return 400 for missing payments field', async () => {
      const bulkData = {};

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for too many payments (over 50)', async () => {
      const payments = [];
      for (let i = 0; i < 51; i++) {
        payments.push({
          payee: `Payment ${i + 1}`,
          amount: 10.00,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });
      }

      const bulkData = { payments };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/maximum.*50/i);
    });

    it('should validate individual payment data within bulk', async () => {
      const bulkData = {
        payments: [
          {
            // Missing required fields
            payee: 'Test Payment',
            amount: 100.00
            // missing dueDate, paymentType, spendingCategoryId
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201); // Bulk should still return 201 but with errors

      expect(response.body.summary.totalErrors).toBe(1);
      expect(response.body.errors.length).toBe(1);
      expect(response.body.errors[0].index).toBe(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const bulkData = {
        payments: [
          {
            payee: 'Test Payment',
            amount: 100.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return errors for invalid spending category IDs', async () => {
      const invalidCategoryId = '00000000-0000-0000-0000-000000000000';
      
      const bulkData = {
        payments: [
          {
            payee: 'Valid Payment',
            amount: 100.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          },
          {
            payee: 'Invalid Category Payment',
            amount: 50.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: invalidCategoryId
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.summary.totalCreated).toBe(1);
      expect(response.body.summary.totalErrors).toBe(1);
      expect(response.body.errors[0].index).toBe(1);
    });
  });

  describe('Bulk Operation Error Handling', () => {
    it('should handle all payments failing', async () => {
      const bulkData = {
        payments: [
          {
            payee: '', // Invalid
            amount: 100.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          },
          {
            payee: 'Valid Payee',
            amount: -50.00, // Invalid amount
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.summary.totalCreated).toBe(0);
      expect(response.body.summary.totalErrors).toBe(2);
      expect(response.body.created.length).toBe(0);
      expect(response.body.errors.length).toBe(2);
    });

    it('should provide detailed error information', async () => {
      const bulkData = {
        payments: [
          {
            payee: 'Valid Payment',
            amount: 100.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          },
          {
            payee: 'Invalid Payment',
            amount: 1000000.00, // Exceeds maximum
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.errors.length).toBe(1);
      
      const error = response.body.errors[0];
      expect(error.index).toBe(1);
      expect(error.error).toBeTruthy();
      expect(error.message).toBeTruthy();
      expect(typeof error.error).toBe('string');
      expect(typeof error.message).toBe('string');
    });
  });

  describe('Family Data Isolation', () => {
    it('should not allow using spending categories from other families', async () => {
      // Create second family with spending category
      const secondFamily = {
        email: 'other.bulk@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Bulk Family'
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
          color: '#0000FF',
          icon: 'entertainment'
        });

      const bulkData = {
        payments: [
          {
            payee: 'Valid Payment',
            amount: 100.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId // valid for current family
          },
          {
            payee: 'Invalid Family Payment',
            amount: 50.00,
            dueDate: '2024-02-01',
            paymentType: 'once',
            spendingCategoryId: otherSpendingResponse.body.id // from other family
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.summary.totalCreated).toBe(1);
      expect(response.body.summary.totalErrors).toBe(1);
      expect(response.body.errors[0].index).toBe(1);
    });
  });

  describe('Performance and Limits', () => {
    it('should handle bulk creation within reasonable time', async () => {
      const payments = [];
      for (let i = 0; i < 25; i++) {
        payments.push({
          payee: `Performance Payment ${i + 1}`,
          amount: 25.00 + i,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });
      }

      const bulkData = { payments };
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .post('/api/payments/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.summary.totalCreated).toBe(25);
    });
  });
});