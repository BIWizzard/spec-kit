/**
 * Contract Test: PUT /api/payments/{paymentId}
 * Task: T069 - Payment update endpoint contract validation
 *
 * This test validates the payment update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/payments/{paymentId}', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  let altSpendingCategoryId: string;
  let testPaymentId: string;
  const testUser = {
    email: 'payments.update@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Update',
    familyName: 'Payment Update Family'
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

    // Create budget categories and spending categories
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
        name: 'Alternative Budget Category',
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
        name: 'Alternative Spending Category',
        budgetCategoryId: altBudgetCategoryResponse.body.id,
        color: '#00FF00',
        icon: 'food'
      });

    spendingCategoryId = spendingCategoryResponse.body.id;
    altSpendingCategoryId = altSpendingCategoryResponse.body.id;

    // Create test payment
    const paymentResponse = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        payee: 'Original Payee',
        amount: 125.50,
        dueDate: '2024-02-01',
        paymentType: 'recurring',
        frequency: 'monthly',
        spendingCategoryId: spendingCategoryId,
        autoPayEnabled: false,
        notes: 'Original notes'
      });

    testPaymentId = paymentResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Payment Updates', () => {
    it('should update payment basic fields and return 200', async () => {
      const updateData = {
        payee: 'Updated Electric Company',
        amount: 135.75,
        dueDate: '2024-02-15',
        notes: 'Updated notes with new information'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate updated fields
      expect(response.body).toHaveProperty('id', testPaymentId);
      expect(response.body).toHaveProperty('payee', updateData.payee);
      expect(response.body).toHaveProperty('amount', updateData.amount);
      expect(response.body).toHaveProperty('dueDate', updateData.dueDate);
      expect(response.body).toHaveProperty('notes', updateData.notes);

      // Validate unchanged fields
      expect(response.body).toHaveProperty('paymentType', 'recurring');
      expect(response.body).toHaveProperty('frequency', 'monthly');
      expect(response.body).toHaveProperty('autoPayEnabled', false);

      // Validate metadata fields
      expect(response.body).toHaveProperty('updatedAt');
      expect(typeof response.body.updatedAt).toBe('string');
    });

    it('should update payment type from recurring to once', async () => {
      const updateData = {
        paymentType: 'once',
        frequency: null
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('paymentType', 'once');
      expect(response.body).toHaveProperty('frequency', 'once');
      expect(response.body).toHaveProperty('nextDueDate', null);
    });

    it('should update payment from once to recurring', async () => {
      // First create a one-time payment
      const oncePaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Once Payment',
          amount: 100.00,
          dueDate: '2024-03-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const updateData = {
        paymentType: 'recurring',
        frequency: 'weekly'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${oncePaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('paymentType', 'recurring');
      expect(response.body).toHaveProperty('frequency', 'weekly');
      expect(response.body).toHaveProperty('nextDueDate');
    });

    it('should update spending category', async () => {
      const updateData = {
        spendingCategoryId: altSpendingCategoryId
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.spendingCategory.id).toBe(altSpendingCategoryId);
      expect(response.body.spendingCategory.name).toBe('Alternative Spending Category');
    });

    it('should update auto-pay settings', async () => {
      const updateData = {
        autoPayEnabled: true
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('autoPayEnabled', true);
    });

    it('should handle partial updates', async () => {
      const updateData = {
        amount: 200.00
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Updated field
      expect(response.body).toHaveProperty('amount', 200.00);

      // Unchanged fields
      expect(response.body).toHaveProperty('payee', 'Original Payee');
      expect(response.body).toHaveProperty('paymentType', 'recurring');
    });

    it('should handle updateFutureOccurrences flag for recurring payments', async () => {
      const updateData = {
        amount: 150.00,
        updateFutureOccurrences: true
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('amount', 150.00);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for invalid data types', async () => {
      const invalidUpdates = [
        { amount: 'invalid-amount' },
        { amount: -10.00 }, // negative amount
        { dueDate: 'invalid-date' },
        { paymentType: 'invalid-type' },
        { frequency: 'invalid-frequency' },
        { autoPayEnabled: 'not-boolean' }
      ];

      for (const updateData of invalidUpdates) {
        const response = await request(API_BASE_URL)
          .put(`/api/payments/${testPaymentId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(updateData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
      }
    });

    it('should return 400 for recurring/variable payment without frequency', async () => {
      const updateData = {
        paymentType: 'recurring'
        // missing frequency
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for empty payee string', async () => {
      const updateData = {
        payee: ''
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for amount exceeding maximum', async () => {
      const updateData = {
        amount: 1000000.00 // exceeds max 999999.99
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for notes exceeding maximum length', async () => {
      const updateData = {
        notes: 'x'.repeat(1001) // exceeds max 1000 characters
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent payment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateData = { amount: 100.00 };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${fakeId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
    });

    it('should return 400 for invalid payment ID format', async () => {
      const updateData = { amount: 100.00 };

      const response = await request(API_BASE_URL)
        .put('/api/payments/invalid-uuid')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 403 when trying to use spending category from another family', async () => {
      // Create second family with spending category
      const secondFamily = {
        email: 'other.update@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Update Family'
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

      const updateData = {
        spendingCategoryId: otherSpendingResponse.body.id
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });

    it('should return 404 when trying to update payment from another family', async () => {
      // Create second family with their own payment
      const secondFamily = {
        email: 'other.payment.update@example.com',
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

      const updateData = { amount: 250.00 };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${otherPaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Payment not found');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const updateData = { amount: 100.00 };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const updateData = { amount: 100.00 };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty update payload', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(200);

      // Should return the payment unchanged
      expect(response.body).toHaveProperty('payee', 'Original Payee');
      expect(response.body).toHaveProperty('amount', 125.50);
    });

    it('should update null fields appropriately', async () => {
      const updateData = {
        notes: null
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('notes', null);
    });
  });
});