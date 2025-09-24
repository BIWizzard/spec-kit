/**
 * Contract Test: POST /api/payments/{paymentId}/revert-paid
 * Task: T072 - Payment revert paid endpoint contract validation
 *
 * This test validates the payment revert paid API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/payments/{paymentId}/revert-paid', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  let testPaymentId: string;
  const testUser = {
    email: 'payments.revert@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Revert',
    familyName: 'Payment Revert Family'
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
        paymentType: 'once',
        spendingCategoryId: spendingCategoryId
      });

    testPaymentId = paymentResponse.body.id;

    // Mark payment as paid first
    await request(API_BASE_URL)
      .post(`/api/payments/${testPaymentId}/mark-paid`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        paidDate: '2024-02-01',
        paidAmount: 125.50
      });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Revert Paid Requests', () => {
    it('should revert paid payment to scheduled status', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/revert-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testPaymentId);
      expect(response.body).toHaveProperty('status', 'scheduled');
      expect(response.body).toHaveProperty('paidDate', null);
      expect(response.body).toHaveProperty('paidAmount', null);
    });

    it('should revert partial payment to scheduled status', async () => {
      // Create and mark partial payment
      const partialPaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Partial Payment',
          amount: 200.00,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      await request(API_BASE_URL)
        .post(`/api/payments/${partialPaymentResponse.body.id}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          paidDate: '2024-02-01',
          paidAmount: 100.00 // partial payment
        });

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${partialPaymentResponse.body.id}/revert-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'scheduled');
      expect(response.body).toHaveProperty('paidDate', null);
      expect(response.body).toHaveProperty('paidAmount', null);
    });

    it('should handle overdue payment reversion', async () => {
      // Create overdue paid payment
      const overduePaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Overdue Payment',
          amount: 150.00,
          dueDate: '2023-12-01', // past due
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      await request(API_BASE_URL)
        .post(`/api/payments/${overduePaymentResponse.body.id}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          paidDate: '2024-01-15',
          paidAmount: 150.00
        });

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${overduePaymentResponse.body.id}/revert-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'overdue'); // should return to overdue
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent payment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${fakeId}/revert-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
    });

    it('should return 400 when trying to revert unpaid payment', async () => {
      // Create unpaid payment
      const unpaidPaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Unpaid Payment',
          amount: 100.00,
          dueDate: '2024-03-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${unpaidPaymentResponse.body.id}/revert-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/not.*paid/i);
    });

    it('should return 400 for invalid payment ID format', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/payments/invalid-uuid/revert-paid')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/revert-paid`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });
});