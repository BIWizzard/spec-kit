/**
 * Contract Test: GET /api/payments/summary
 * Task: T076 - Payments summary endpoint contract validation
 *
 * This test validates the payment summary API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/payments/summary', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  const testUser = {
    email: 'payments.summary@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Summary',
    familyName: 'Payment Summary Family'
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

  describe('Valid Payment Summary Requests', () => {
    it('should return payment summary with required date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('summaryPeriods');
      expect(response.body).toHaveProperty('totals');
      expect(response.body).toHaveProperty('dateRange');

      expect(Array.isArray(response.body.summaryPeriods)).toBe(true);

      // Validate totals structure
      const totals = response.body.totals;
      expect(totals).toHaveProperty('totalScheduled');
      expect(totals).toHaveProperty('totalPaid');
      expect(totals).toHaveProperty('totalAttributed');
      expect(totals).toHaveProperty('totalRemaining');
      expect(typeof totals.totalScheduled).toBe('number');
      expect(typeof totals.totalPaid).toBe('number');
      expect(typeof totals.totalAttributed).toBe('number');
      expect(typeof totals.totalRemaining).toBe('number');

      // Validate date range structure
      const dateRange = response.body.dateRange;
      expect(dateRange).toHaveProperty('fromDate', '2024-01-01');
      expect(dateRange).toHaveProperty('toDate', '2024-12-31');
    });

    it('should return monthly summary periods by default', async () => {
      // Create test payment
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Test Payment',
          amount: 125.50,
          dueDate: '2024-06-15',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should have monthly periods
      if (response.body.summaryPeriods.length > 0) {
        const period = response.body.summaryPeriods[0];
        expect(period).toHaveProperty('period');
        expect(period).toHaveProperty('periodStart');
        expect(period).toHaveProperty('periodEnd');
        expect(period).toHaveProperty('scheduledPayments');
        expect(period).toHaveProperty('actualPayments');
        expect(period).toHaveProperty('paymentCount');
        expect(period).toHaveProperty('categoryBreakdown');

        expect(Array.isArray(period.categoryBreakdown)).toBe(true);
      }
    });

    it('should support weekly grouping', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-06-01',
          toDate: '2024-06-30',
          groupBy: 'week'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('summaryPeriods');
    });

    it('should support daily grouping', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-06-01',
          toDate: '2024-06-07',
          groupBy: 'day'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('summaryPeriods');
    });

    it('should support quarterly grouping', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'quarter'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('summaryPeriods');
    });

    it('should support yearly grouping', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2023-01-01',
          toDate: '2025-12-31',
          groupBy: 'year'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('summaryPeriods');
    });

    it('should include category breakdown in periods', async () => {
      // Create payments in different categories
      const altBudgetResponse = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Alt Budget Category',
          targetAmount: 500.00,
          period: 'monthly'
        });

      const altSpendingResponse = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Food Category',
          budgetCategoryId: altBudgetResponse.body.id,
          color: '#00FF00',
          icon: 'food'
        });

      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Electric Bill',
          amount: 150.00,
          dueDate: '2024-06-15',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Groceries',
          amount: 250.00,
          dueDate: '2024-06-20',
          paymentType: 'once',
          spendingCategoryId: altSpendingResponse.body.id
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-06-01',
          toDate: '2024-06-30'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Find June period
      const junePeriod = response.body.summaryPeriods.find(
        (p: any) => p.period.includes('2024-06')
      );

      if (junePeriod) {
        expect(junePeriod.categoryBreakdown.length).toBeGreaterThan(0);
        
        // Validate category breakdown structure
        const categoryItem = junePeriod.categoryBreakdown[0];
        expect(categoryItem).toHaveProperty('categoryName');
        expect(categoryItem).toHaveProperty('amount');
        expect(typeof categoryItem.categoryName).toBe('string');
        expect(typeof categoryItem.amount).toBe('number');
      }
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing fromDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          toDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });

    it('should return 400 for missing toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-01-01'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid date formats', async () => {
      const invalidDates = [
        { fromDate: 'invalid-date', toDate: '2024-12-31' },
        { fromDate: '2024-01-01', toDate: 'invalid-date' },
        { fromDate: '2024-13-01', toDate: '2024-12-31' }, // invalid month
        { fromDate: '2024-01-32', toDate: '2024-12-31' }  // invalid day
      ];

      for (const dateParams of invalidDates) {
        const response = await request(API_BASE_URL)
          .get('/api/payments/summary')
          .query(dateParams)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid groupBy parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          groupBy: 'invalid-group'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 when fromDate is after toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-12-31',
          toDate: '2024-01-01'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only include payments from authenticated user\'s family', async () => {
      // Create payment for current family
      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Family Payment',
          amount: 100.00,
          dueDate: '2024-06-15',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      // Create second family with payment
      const secondFamily = {
        email: 'other.summary@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Summary Family'
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

      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          payee: 'Other Family Payment',
          amount: 300.00,
          dueDate: '2024-06-15',
          paymentType: 'once',
          spendingCategoryId: otherSpendingResponse.body.id
        });

      // Original family should only see their own data
      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-06-01',
          toDate: '2024-06-30'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should only include original family's payment (100.00)
      expect(response.body.totals.totalScheduled).toBe(100.00);
    });
  });

  describe('Complex Summary Scenarios', () => {
    it('should handle mixed payment statuses in summary', async () => {
      // Create scheduled payment
      const scheduledResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Scheduled Payment',
          amount: 100.00,
          dueDate: '2024-06-15',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      // Create and mark paid payment
      const paidResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Paid Payment',
          amount: 200.00,
          dueDate: '2024-06-10',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      await request(API_BASE_URL)
        .post(`/api/payments/${paidResponse.body.id}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          paidDate: '2024-06-10',
          paidAmount: 200.00
        });

      const response = await request(API_BASE_URL)
        .get('/api/payments/summary')
        .query({
          fromDate: '2024-06-01',
          toDate: '2024-06-30'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.totals.totalScheduled).toBe(300.00); // 100 + 200
      expect(response.body.totals.totalPaid).toBe(200.00); // only the paid one
    });
  });
});