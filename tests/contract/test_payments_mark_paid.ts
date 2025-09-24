/**
 * Contract Test: POST /api/payments/{paymentId}/mark-paid
 * Task: T071 - Payment mark paid endpoint contract validation
 *
 * This test validates the payment mark paid API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/payments/{paymentId}/mark-paid', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  let testPaymentId: string;
  const testUser = {
    email: 'payments.markpaid@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'MarkPaid',
    familyName: 'Payment Mark Paid Family'
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

    const paymentResponse = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        payee: 'Test Payment',
        amount: 125.50,
        dueDate: '2024-02-01',
        paymentType: 'recurring',
        frequency: 'monthly',
        spendingCategoryId: spendingCategoryId
      });

    testPaymentId = paymentResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Mark Paid Requests', () => {
    it('should mark payment as paid with exact amount', async () => {
      const markPaidData = {
        paidDate: '2024-02-01'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testPaymentId);
      expect(response.body).toHaveProperty('status', 'paid');
      expect(response.body).toHaveProperty('paidDate', '2024-02-01');
      expect(response.body).toHaveProperty('paidAmount', 125.50); // uses scheduled amount
    });

    it('should mark payment as paid with custom amount', async () => {
      const markPaidData = {
        paidDate: '2024-02-01',
        paidAmount: 120.00,
        notes: 'Paid with discount'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'paid');
      expect(response.body).toHaveProperty('paidDate', '2024-02-01');
      expect(response.body).toHaveProperty('paidAmount', 120.00);
      expect(response.body).toHaveProperty('notes', 'Paid with discount');
    });

    it('should handle partial payment', async () => {
      const markPaidData = {
        paidDate: '2024-02-01',
        paidAmount: 62.75 // half the amount
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'partial');
      expect(response.body).toHaveProperty('paidAmount', 62.75);
    });

    it('should handle overpayment', async () => {
      const markPaidData = {
        paidDate: '2024-02-01',
        paidAmount: 150.00 // more than scheduled
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'paid');
      expect(response.body).toHaveProperty('paidAmount', 150.00);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing paidDate', async () => {
      const markPaidData = {
        paidAmount: 125.50
        // missing paidDate
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });

    it('should return 400 for invalid date format', async () => {
      const markPaidData = {
        paidDate: 'invalid-date'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid paid amount', async () => {
      const invalidAmounts = [0, -10.00, 'invalid', 1000000.00];

      for (const paidAmount of invalidAmounts) {
        const markPaidData = {
          paidDate: '2024-02-01',
          paidAmount
        };

        const response = await request(API_BASE_URL)
          .post(`/api/payments/${testPaymentId}/mark-paid`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(markPaidData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for notes exceeding maximum length', async () => {
      const markPaidData = {
        paidDate: '2024-02-01',
        notes: 'x'.repeat(1001) // exceeds max 1000 characters
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when payment already paid', async () => {
      // First mark as paid
      await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          paidDate: '2024-02-01'
        });

      // Try to mark as paid again
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          paidDate: '2024-02-02'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/already.*paid/i);
    });

    it('should return 404 for non-existent payment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const markPaidData = {
        paidDate: '2024-02-01'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${fakeId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const markPaidData = {
        paidDate: '2024-02-01'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .send(markPaidData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });
});