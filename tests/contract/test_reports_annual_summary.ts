/**
 * Contract Test: GET /api/reports/annual-summary
 * Task: T121 - Annual summary report endpoint contract validation
 *
 * This test validates the annual summary report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/annual-summary', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.payment.deleteMany();
    await prisma.income.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Annual Summary Report Requests', () => {
    it('should return 200 with annual summary for valid year', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('year');
      expect(response.body).toHaveProperty('income');
      expect(response.body).toHaveProperty('expenses');
      expect(response.body).toHaveProperty('savings');
      expect(response.body).toHaveProperty('netWorth');
      expect(response.body).toHaveProperty('monthlyBreakdown');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate year
      expect(response.body.year).toBe(2024);
      expect(typeof response.body.year).toBe('number');

      // Validate income structure
      const { income } = response.body;
      expect(income).toHaveProperty('total');
      expect(income).toHaveProperty('growth');
      expect(income).toHaveProperty('monthlyAverage');

      expect(typeof income.total).toBe('number');
      expect(typeof income.growth).toBe('number');
      expect(typeof income.monthlyAverage).toBe('number');

      // Growth can be positive or negative percentage
      expect(income.growth).toBeGreaterThanOrEqual(-100);

      // Monthly average should be total / 12
      expect(Math.abs(income.monthlyAverage - (income.total / 12))).toBeLessThan(0.01);

      // Validate expenses structure
      const { expenses } = response.body;
      expect(expenses).toHaveProperty('total');
      expect(expenses).toHaveProperty('growth');
      expect(expenses).toHaveProperty('monthlyAverage');

      expect(typeof expenses.total).toBe('number');
      expect(typeof expenses.growth).toBe('number');
      expect(typeof expenses.monthlyAverage).toBe('number');

      // Growth can be positive or negative percentage
      expect(expenses.growth).toBeGreaterThanOrEqual(-100);

      // Monthly average should be total / 12
      expect(Math.abs(expenses.monthlyAverage - (expenses.total / 12))).toBeLessThan(0.01);

      // Validate savings structure
      const { savings } = response.body;
      expect(savings).toHaveProperty('total');
      expect(savings).toHaveProperty('rate');
      expect(savings).toHaveProperty('growth');

      expect(typeof savings.total).toBe('number');
      expect(typeof savings.rate).toBe('number');
      expect(typeof savings.growth).toBe('number');

      // Savings rate should be a percentage
      expect(savings.rate).toBeGreaterThanOrEqual(-100); // Can be negative if expenses > income
      expect(savings.rate).toBeLessThanOrEqual(100);

      // Growth can be positive or negative percentage
      expect(savings.growth).toBeGreaterThanOrEqual(-100);

      // Savings total should approximately equal income total - expenses total
      expect(Math.abs(savings.total - (income.total - expenses.total))).toBeLessThan(0.01);

      // Validate net worth structure
      const { netWorth } = response.body;
      expect(netWorth).toHaveProperty('startOfYear');
      expect(netWorth).toHaveProperty('endOfYear');
      expect(netWorth).toHaveProperty('change');

      expect(typeof netWorth.startOfYear).toBe('number');
      expect(typeof netWorth.endOfYear).toBe('number');
      expect(typeof netWorth.change).toBe('number');

      // Change should equal end minus start
      expect(Math.abs(netWorth.change - (netWorth.endOfYear - netWorth.startOfYear))).toBeLessThan(0.01);

      // Validate monthly breakdown array
      expect(Array.isArray(response.body.monthlyBreakdown)).toBe(true);
      expect(response.body.monthlyBreakdown.length).toBeLessThanOrEqual(12); // Should not exceed 12 months

      if (response.body.monthlyBreakdown.length > 0) {
        const month = response.body.monthlyBreakdown[0];
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('income');
        expect(month).toHaveProperty('expenses');
        expect(month).toHaveProperty('savings');
        expect(month).toHaveProperty('savingsRate');

        // Validate month format (YYYY-MM-DD)
        expect(month.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof month.income).toBe('number');
        expect(typeof month.expenses).toBe('number');
        expect(typeof month.savings).toBe('number');
        expect(typeof month.savingsRate).toBe('number');

        // Savings should equal income minus expenses
        expect(Math.abs(month.savings - (month.income - month.expenses))).toBeLessThan(0.01);

        // Savings rate should be calculated correctly
        if (month.income > 0) {
          const expectedRate = (month.savings / month.income) * 100;
          expect(Math.abs(month.savingsRate - expectedRate)).toBeLessThan(0.01);
        }

        // Savings rate should be a percentage
        expect(month.savingsRate).toBeGreaterThanOrEqual(-100);
        expect(month.savingsRate).toBeLessThanOrEqual(100);
      }
    });

    it('should validate year parameter constraints', async () => {
      const validYears = [2020, 2024, 2030, 2050];

      for (const year of validYears) {
        const response = await request(API_BASE_URL)
          .get('/api/reports/annual-summary')
          .set('Authorization', mockAccessToken)
          .query({ year })
          .expect(200);

        expect(response.body.year).toBe(year);
      }
    });

    it('should calculate annual totals from monthly breakdown', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024
        })
        .expect(200);

      if (response.body.monthlyBreakdown.length > 0) {
        const totalIncomeFromBreakdown = response.body.monthlyBreakdown.reduce(
          (sum, month) => sum + month.income,
          0
        );
        const totalExpensesFromBreakdown = response.body.monthlyBreakdown.reduce(
          (sum, month) => sum + month.expenses,
          0
        );
        const totalSavingsFromBreakdown = response.body.monthlyBreakdown.reduce(
          (sum, month) => sum + month.savings,
          0
        );

        // Annual totals should match sum of monthly breakdown
        expect(Math.abs(response.body.income.total - totalIncomeFromBreakdown)).toBeLessThan(0.01);
        expect(Math.abs(response.body.expenses.total - totalExpensesFromBreakdown)).toBeLessThan(0.01);
        expect(Math.abs(response.body.savings.total - totalSavingsFromBreakdown)).toBeLessThan(0.01);
      }
    });

    it('should order monthly breakdown chronologically', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024
        })
        .expect(200);

      if (response.body.monthlyBreakdown.length > 1) {
        const months = response.body.monthlyBreakdown.map(item => new Date(item.month));

        // Check if months are in chronological order
        for (let i = 1; i < months.length; i++) {
          expect(months[i].getTime()).toBeGreaterThan(months[i - 1].getTime());
        }
      }
    });

    it('should calculate savings rate correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2024
        })
        .expect(200);

      const { income, expenses, savings } = response.body;

      if (income.total > 0) {
        const expectedSavingsRate = (savings.total / income.total) * 100;
        expect(Math.abs(savings.rate - expectedSavingsRate)).toBeLessThan(0.01);
      }
    });
  });

  describe('Invalid Annual Summary Report Requests', () => {
    it('should return 400 for missing required year parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for year below minimum', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2019 // Below minimum of 2020
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for year above maximum', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 2051 // Above maximum of 2050
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for non-integer year parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: '2024.5'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid year format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', mockAccessToken)
        .query({
          year: 'invalid-year'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .query({
          year: 2024
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', 'Bearer invalid-token')
        .query({
          year: 2024
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/annual-summary')
        .set('Authorization', 'Bearer limited-permissions-token')
        .query({
          year: 2024
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});