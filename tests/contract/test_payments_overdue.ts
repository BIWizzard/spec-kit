/**
 * Contract Test: GET /api/payments/overdue
 * Task: T075 - Payments overdue endpoint contract validation
 *
 * This test validates the overdue payments API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/payments/overdue', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  const testUser = {
    email: 'payments.overdue@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Overdue',
    familyName: 'Payment Overdue Family'
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Overdue Payments Requests', () => {
    it('should return overdue payments list with default limit', async () => {
      // Create overdue payment
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Overdue Payment',
          amount: 125.50,
          dueDate: pastDate.toISOString().split('T')[0],
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('overduePayments');
      expect(response.body).toHaveProperty('totalOverdue');
      expect(response.body).toHaveProperty('overdueCount');

      expect(Array.isArray(response.body.overduePayments)).toBe(true);
      expect(typeof response.body.totalOverdue).toBe('number');
      expect(typeof response.body.overdueCount).toBe('number');

      // Should include the overdue payment
      expect(response.body.overduePayments.length).toBeGreaterThan(0);
      expect(response.body.totalOverdue).toBeGreaterThan(0);
      expect(response.body.overdueCount).toBeGreaterThan(0);

      // Validate payment structure
      const payment = response.body.overduePayments[0];
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('payee');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('dueDate');
      expect(payment).toHaveProperty('status', 'overdue');
      expect(payment).toHaveProperty('spendingCategory');
    });

    it('should return overdue payments with custom limit', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('overduePayments');
      expect(response.body).toHaveProperty('totalOverdue');
      expect(response.body).toHaveProperty('overdueCount');
      
      // Should not exceed the limit
      expect(response.body.overduePayments.length).toBeLessThanOrEqual(10);
    });

    it('should return empty list when no overdue payments exist', async () => {
      // Create only future payments
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Future Payment',
          amount: 100.00,
          dueDate: futureDate.toISOString().split('T')[0],
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.overduePayments.length).toBe(0);
      expect(response.body.totalOverdue).toBe(0);
      expect(response.body.overdueCount).toBe(0);
    });

    it('should not include paid payments in overdue list', async () => {
      // Create overdue payment and mark as paid
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const paymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Paid Overdue Payment',
          amount: 150.00,
          dueDate: pastDate.toISOString().split('T')[0],
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      await request(API_BASE_URL)
        .post(`/api/payments/${paymentResponse.body.id}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          paidDate: new Date().toISOString().split('T')[0],
          paidAmount: 150.00
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Paid payment should not appear in overdue list
      const paidPayment = response.body.overduePayments.find(
        (p: any) => p.id === paymentResponse.body.id
      );
      expect(paidPayment).toBeUndefined();
    });
  });

  describe('Query Parameter Validation', () => {
    it('should return 400 for invalid limit parameter', async () => {
      const invalidLimits = [0, -1, 'invalid', 101]; // 101 > max 100

      for (const limit of invalidLimits) {
        const response = await request(API_BASE_URL)
          .get('/api/payments/overdue')
          .query({ limit })
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
      }
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return overdue payments for authenticated user\'s family', async () => {
      // Create second family with overdue payment
      const secondFamily = {
        email: 'other.overdue@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Overdue Family'
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

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          payee: 'Other Family Overdue',
          amount: 300.00,
          dueDate: pastDate.toISOString().split('T')[0],
          paymentType: 'once',
          spendingCategoryId: otherSpendingResponse.body.id
        });

      // Original user should not see other family's overdue payments
      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.overduePayments.length).toBe(0);
      expect(response.body.totalOverdue).toBe(0);
      expect(response.body.overdueCount).toBe(0);
    });
  });

  describe('Ordering and Limits', () => {
    it('should order overdue payments by due date (oldest first)', async () => {
      // Create multiple overdue payments with different dates
      const dates = [-10, -5, -15]; // days ago
      const paymentIds: string[] = [];

      for (let i = 0; i < dates.length; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() + dates[i]);
        
        const paymentResponse = await request(API_BASE_URL)
          .post('/api/payments')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            payee: `Overdue Payment ${i + 1}`,
            amount: 100.00 + i * 10,
            dueDate: pastDate.toISOString().split('T')[0],
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          });
        
        paymentIds.push(paymentResponse.body.id);
      }

      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.overduePayments.length).toBe(3);
      
      // Should be ordered by due date (oldest first)
      const dueDates = response.body.overduePayments.map((p: any) => new Date(p.dueDate));
      for (let i = 1; i < dueDates.length; i++) {
        expect(dueDates[i].getTime()).toBeGreaterThanOrEqual(dueDates[i - 1].getTime());
      }
    });

    it('should respect the limit parameter', async () => {
      // Create more overdue payments than the limit
      for (let i = 0; i < 15; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - (i + 1));
        
        await request(API_BASE_URL)
          .post('/api/payments')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            payee: `Overdue Payment ${i + 1}`,
            amount: 50.00,
            dueDate: pastDate.toISOString().split('T')[0],
            paymentType: 'once',
            spendingCategoryId: spendingCategoryId
          });
      }

      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.overduePayments.length).toBe(5);
      expect(response.body.overdueCount).toBe(15); // total count should still be 15
      expect(response.body.totalOverdue).toBe(750.00); // 15 * 50.00
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum limit parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('overduePayments');
    });

    it('should use default limit when not specified', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/overdue')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('overduePayments');
      // Default limit should be 50 based on OpenAPI spec
      expect(response.body.overduePayments.length).toBeLessThanOrEqual(50);
    });
  });
});