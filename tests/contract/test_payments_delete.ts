/**
 * Contract Test: DELETE /api/payments/{paymentId}
 * Task: T070 - Payment deletion endpoint contract validation
 *
 * This test validates the payment deletion API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/payments/{paymentId}', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  let testPaymentId: string;
  const testUser = {
    email: 'payments.delete@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Delete',
    familyName: 'Payment Delete Family'
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Payment Deletion', () => {
    it('should delete one-time payment and return 200', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');

      // Verify payment is deleted
      const getResponse = await request(API_BASE_URL)
        .get(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(404);
    });

    it('should delete recurring payment (single occurrence) and return 200', async () => {
      const recurringPaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Recurring Payment',
          amount: 200.00,
          dueDate: '2024-02-01',
          paymentType: 'recurring',
          frequency: 'monthly',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${recurringPaymentResponse.body.id}`)
        .query({ deleteAll: false })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should delete recurring payment (all occurrences) and return 200', async () => {
      const recurringPaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Recurring Payment',
          amount: 200.00,
          dueDate: '2024-02-01',
          paymentType: 'recurring',
          frequency: 'monthly',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${recurringPaymentResponse.body.id}`)
        .query({ deleteAll: true })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent payment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${fakeId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
    });

    it('should return 400 for invalid payment ID format', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/payments/invalid-uuid')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 404 when trying to delete payment from another family', async () => {
      const secondFamily = {
        email: 'other.delete@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Delete Family'
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

      const otherPaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          payee: 'Other Family Payment',
          amount: 200.00,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: otherSpendingResponse.body.id
        });

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${otherPaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Payment not found');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${testPaymentId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${testPaymentId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Query Parameters', () => {
    it('should handle deleteAll parameter validation', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${testPaymentId}`)
        .query({ deleteAll: 'invalid-boolean' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });
});