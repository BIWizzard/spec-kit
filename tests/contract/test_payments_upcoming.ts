/**
 * Contract Test: GET /api/payments/upcoming
 * Task: T074 - Payments upcoming endpoint contract validation
 *
 * This test validates the upcoming payments API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/payments/upcoming', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  const testUser = {
    email: 'payments.upcoming@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Upcoming',
    familyName: 'Payment Upcoming Family'
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

  describe('Valid Upcoming Payments Requests', () => {
    it('should return upcoming payments with default parameters', async () => {
      // Create upcoming payment
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Upcoming Payment',
          amount: 125.50,
          dueDate: futureDate.toISOString().split('T')[0],
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('upcomingPayments');
      expect(response.body).toHaveProperty('totalUpcoming');
      expect(response.body).toHaveProperty('overduePayments');
      expect(response.body).toHaveProperty('totalOverdue');
      expect(response.body).toHaveProperty('dateRange');

      expect(Array.isArray(response.body.upcomingPayments)).toBe(true);
      expect(Array.isArray(response.body.overduePayments)).toBe(true);
      expect(typeof response.body.totalUpcoming).toBe('number');
      expect(typeof response.body.totalOverdue).toBe('number');

      // Validate date range structure
      const dateRange = response.body.dateRange;
      expect(dateRange).toHaveProperty('fromDate');
      expect(dateRange).toHaveProperty('toDate');
      expect(typeof dateRange.fromDate).toBe('string');
      expect(typeof dateRange.toDate).toBe('string');

      // Should include the upcoming payment
      expect(response.body.upcomingPayments.length).toBeGreaterThan(0);
      expect(response.body.totalUpcoming).toBeGreaterThan(0);
    });

    it('should return upcoming payments with custom days parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .query({ days: 7 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('upcomingPayments');
      expect(response.body).toHaveProperty('dateRange');
    });

    it('should include overdue payments when includeOverdue is true', async () => {
      // Create overdue payment
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Overdue Payment',
          amount: 75.00,
          dueDate: pastDate.toISOString().split('T')[0],
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .query({ includeOverdue: true })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.overduePayments.length).toBeGreaterThan(0);
      expect(response.body.totalOverdue).toBeGreaterThan(0);
    });

    it('should exclude overdue payments when includeOverdue is false', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .query({ includeOverdue: false })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.overduePayments.length).toBe(0);
      expect(response.body.totalOverdue).toBe(0);
    });

    it('should validate payment summary structure in results', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Future Payment',
          amount: 200.00,
          dueDate: futureDate.toISOString().split('T')[0],
          paymentType: 'recurring',
          frequency: 'monthly',
          spendingCategoryId: spendingCategoryId,
          notes: 'Test payment'
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      if (response.body.upcomingPayments.length > 0) {
        const payment = response.body.upcomingPayments[0];
        
        // Validate PaymentSummary structure
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('payee');
        expect(payment).toHaveProperty('amount');
        expect(payment).toHaveProperty('dueDate');
        expect(payment).toHaveProperty('paymentType');
        expect(payment).toHaveProperty('status');
        expect(payment).toHaveProperty('spendingCategory');
        expect(payment).toHaveProperty('autoPayEnabled');
        expect(payment).toHaveProperty('attributedAmount');
        expect(payment).toHaveProperty('remainingAmount');
      }
    });
  });

  describe('Query Parameter Validation', () => {
    it('should return 400 for invalid days parameter', async () => {
      const invalidDays = [0, -1, 'invalid', 400]; // 400 > max 365

      for (const days of invalidDays) {
        const response = await request(API_BASE_URL)
          .get('/api/payments/upcoming')
          .query({ days })
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
      }
    });

    it('should return 400 for invalid includeOverdue parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .query({ includeOverdue: 'invalid-boolean' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return upcoming payments for authenticated user\'s family', async () => {
      // Create second family with upcoming payment
      const secondFamily = {
        email: 'other.upcoming@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Upcoming Family'
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

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          payee: 'Other Family Upcoming',
          amount: 300.00,
          dueDate: futureDate.toISOString().split('T')[0],
          paymentType: 'once',
          spendingCategoryId: otherSpendingResponse.body.id
        });

      // Original user should not see other family's upcoming payments
      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.upcomingPayments.length).toBe(0);
      expect(response.body.totalUpcoming).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum days parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .query({ days: 365 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('upcomingPayments');
    });

    it('should handle minimum days parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/upcoming')
        .query({ days: 1 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('upcomingPayments');
    });
  });
});