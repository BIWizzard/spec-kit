/**
 * Contract Test: GET /api/reports/monthly-summary
 * Task: T120 - Monthly summary report endpoint contract validation
 *
 * This test validates the monthly summary report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/monthly-summary', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.payment.deleteMany();
    await prisma.income.deleteMany();
    await prisma.budgetItem.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Monthly Summary Report Requests', () => {
    it('should return 200 with monthly summary for valid year and month', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024,
          month: 6
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('month');
      expect(response.body).toHaveProperty('income');
      expect(response.body).toHaveProperty('expenses');
      expect(response.body).toHaveProperty('cashFlow');
      expect(response.body).toHaveProperty('budgetPerformance');
      expect(response.body).toHaveProperty('topExpenses');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate month format (should be YYYY-MM-DD format)
      expect(response.body.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Validate income structure
      const { income } = response.body;
      expect(income).toHaveProperty('total');
      expect(income).toHaveProperty('scheduled');
      expect(income).toHaveProperty('actual');
      expect(income).toHaveProperty('variance');

      expect(typeof income.total).toBe('number');
      expect(typeof income.scheduled).toBe('number');
      expect(typeof income.actual).toBe('number');
      expect(typeof income.variance).toBe('number');

      // Validate expenses structure
      const { expenses } = response.body;
      expect(expenses).toHaveProperty('total');
      expect(expenses).toHaveProperty('budgeted');
      expect(expenses).toHaveProperty('actual');
      expect(expenses).toHaveProperty('variance');

      expect(typeof expenses.total).toBe('number');
      expect(typeof expenses.budgeted).toBe('number');
      expect(typeof expenses.actual).toBe('number');
      expect(typeof expenses.variance).toBe('number');

      // Validate cash flow structure
      const { cashFlow } = response.body;
      expect(cashFlow).toHaveProperty('net');
      expect(cashFlow).toHaveProperty('savingsRate');

      expect(typeof cashFlow.net).toBe('number');
      expect(typeof cashFlow.savingsRate).toBe('number');

      // Savings rate should be a percentage
      expect(cashFlow.savingsRate).toBeGreaterThanOrEqual(-100); // Can be negative
      expect(cashFlow.savingsRate).toBeLessThanOrEqual(100);

      // Net cash flow should equal income total minus expenses total
      expect(Math.abs(cashFlow.net - (income.total - expenses.total))).toBeLessThan(0.01);

      // Validate budget performance array
      expect(Array.isArray(response.body.budgetPerformance)).toBe(true);
      if (response.body.budgetPerformance.length > 0) {
        const budget = response.body.budgetPerformance[0];
        expect(budget).toHaveProperty('category');
        expect(budget).toHaveProperty('budgeted');
        expect(budget).toHaveProperty('spent');
        expect(budget).toHaveProperty('variance');

        expect(typeof budget.category).toBe('string');
        expect(typeof budget.budgeted).toBe('number');
        expect(typeof budget.spent).toBe('number');
        expect(typeof budget.variance).toBe('number');

        // Variance should be budgeted - spent
        expect(Math.abs(budget.variance - (budget.budgeted - budget.spent))).toBeLessThan(0.01);
      }

      // Validate top expenses array
      expect(Array.isArray(response.body.topExpenses)).toBe(true);
      if (response.body.topExpenses.length > 0) {
        const expense = response.body.topExpenses[0];
        expect(expense).toHaveProperty('description');
        expect(expense).toHaveProperty('amount');
        expect(expense).toHaveProperty('category');
        expect(expense).toHaveProperty('date');

        expect(typeof expense.description).toBe('string');
        expect(typeof expense.amount).toBe('number');
        expect(typeof expense.category).toBe('string');
        expect(expense.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Amount should be positive for expenses
        expect(expense.amount).toBeGreaterThan(0);
      }
    });

    it('should validate year parameter constraints', async () => {
      const validYears = [2020, 2024, 2030, 2050];

      for (const year of validYears) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/monthly-summary')
          .set('Authorization', mockAccessToken)
          .query({
            year,
            month: 6
          })
          .expect(200);

        expect(response.body).toHaveProperty('month');
        // Month should reflect the requested year and month
        expect(response.body.month).toMatch(new RegExp(`^${year}-06-\\d{2}$`));
      }
    });

    it('should validate month parameter constraints', async () => {
      const validMonths = [1, 6, 12];

      for (const month of validMonths) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/monthly-summary')
          .set('Authorization', mockAccessToken)
          .query({
            year: 2024,
            month
          })
          .expect(200);

        expect(response.body).toHaveProperty('month');
        // Month should reflect the requested month (zero-padded)
        const expectedMonth = month.toString().padStart(2, '0');
        expect(response.body.month).toMatch(new RegExp(`^2024-${expectedMonth}-\\d{2}$`));
      }
    });

    it('should calculate income variance correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024,
          month: 6
        })
        .expect(200);

      const { income } = response.body;

      // Variance should be actual - scheduled
      expect(Math.abs(income.variance - (income.actual - income.scheduled))).toBeLessThan(0.01);
    });

    it('should calculate expense variance correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024,
          month: 6
        })
        .expect(200);

      const { expenses } = response.body;

      // Variance should be budgeted - actual (positive means under budget)
      expect(Math.abs(expenses.variance - (expenses.budgeted - expenses.actual))).toBeLessThan(0.01);
    });

    it('should sort top expenses by amount descending', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024,
          month: 6
        })
        .expect(200);

      if (response.body.topExpenses.length > 1) {
        const amounts = response.body.topExpenses.map(expense => expense.amount);

        // Check if amounts are in descending order
        for (let i = 1; i < amounts.length; i++) {
          expect(amounts[i]).toBeLessThanOrEqual(amounts[i - 1]);
        }
      }
    });
  });

  describe('Invalid Monthly Summary Report Requests', () => {
    it('should return 400 for missing required parameters', async () => {
      const invalidQueries = [
        { month: 6 }, // Missing year
        { year: 2024 }, // Missing month
        {} // Missing both
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/monthly-summary')
          .set('Authorization', mockAccessToken)
          .query(query)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for year below minimum', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2019, // Below minimum of 2020
          month: 6
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for year above maximum', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2051, // Above maximum of 2050
          month: 6
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for month below minimum', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024,
          month: 0 // Below minimum of 1
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for month above maximum', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024,
          month: 13 // Above maximum of 12
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for non-integer parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: '2024.5',
          month: '6.5'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .query({
          year: 2024,
          month: 6
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', 'Bearer invalid-token')
        .query({
          year: 2024,
          month: 6
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/monthly-summary')
        .set('Authorization', 'Bearer limited-permissions-token')
        .query({
          year: 2024,
          month: 6
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});