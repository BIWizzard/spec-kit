/**
 * Contract Test: GET /api/reports/debt-analysis
 * Task: T119 - Debt analysis report endpoint contract validation
 *
 * This test validates the debt analysis report API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/reports/debt-analysis', () => {
  const mockAccessToken = 'Bearer mock-jwt-token';

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.bankAccount.deleteMany();
    await prisma.income.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Debt Analysis Report Requests', () => {
    it('should return 200 with debt analysis for valid request', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          includeProjections: true
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('totalDebt');
      expect(response.body).toHaveProperty('monthlyDebtPayments');
      expect(response.body).toHaveProperty('debtToIncomeRatio');
      expect(response.body).toHaveProperty('creditUtilization');
      expect(response.body).toHaveProperty('debtAccounts');
      expect(response.body).toHaveProperty('payoffProjections');

      // Validate report ID format
      expect(typeof response.body.reportId).toBe('string');
      expect(response.body.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate main debt metrics
      expect(typeof response.body.totalDebt).toBe('number');
      expect(typeof response.body.monthlyDebtPayments).toBe('number');
      expect(typeof response.body.debtToIncomeRatio).toBe('number');
      expect(typeof response.body.creditUtilization).toBe('number');

      // Debt amounts should be non-negative
      expect(response.body.totalDebt).toBeGreaterThanOrEqual(0);
      expect(response.body.monthlyDebtPayments).toBeGreaterThanOrEqual(0);

      // Debt-to-income ratio should be a percentage (0-100+ possible)
      expect(response.body.debtToIncomeRatio).toBeGreaterThanOrEqual(0);

      // Credit utilization should be a percentage (0-100+ possible)
      expect(response.body.creditUtilization).toBeGreaterThanOrEqual(0);

      // Validate debt accounts array
      expect(Array.isArray(response.body.debtAccounts)).toBe(true);
      if (response.body.debtAccounts.length > 0) {
        const account = response.body.debtAccounts[0];
        expect(account).toHaveProperty('accountName');
        expect(account).toHaveProperty('accountType');
        expect(account).toHaveProperty('currentBalance');
        expect(account).toHaveProperty('minimumPayment');
        expect(account).toHaveProperty('interestRate');
        expect(account).toHaveProperty('payoffTime');

        expect(typeof account.accountName).toBe('string');
        expect(typeof account.accountType).toBe('string');
        expect(typeof account.currentBalance).toBe('number');
        expect(typeof account.minimumPayment).toBe('number');
        expect(typeof account.interestRate).toBe('number');
        expect(typeof account.payoffTime).toBe('number');

        // Validate data constraints
        expect(account.accountName.length).toBeGreaterThan(0);
        expect(account.accountType.length).toBeGreaterThan(0);
        expect(account.currentBalance).toBeGreaterThanOrEqual(0);
        expect(account.minimumPayment).toBeGreaterThanOrEqual(0);
        expect(account.interestRate).toBeGreaterThanOrEqual(0);
        expect(account.payoffTime).toBeGreaterThan(0); // Months to payoff should be positive
      }

      // Validate payoff projections array
      expect(Array.isArray(response.body.payoffProjections)).toBe(true);
      if (response.body.payoffProjections.length > 0) {
        const projection = response.body.payoffProjections[0];
        expect(projection).toHaveProperty('strategy');
        expect(projection).toHaveProperty('totalInterest');
        expect(projection).toHaveProperty('payoffTime');
        expect(projection).toHaveProperty('monthlySavings');

        expect(typeof projection.strategy).toBe('string');
        expect(['minimum_payments', 'debt_snowball', 'debt_avalanche', 'custom']).toContain(projection.strategy);
        expect(typeof projection.totalInterest).toBe('number');
        expect(typeof projection.payoffTime).toBe('number');
        expect(typeof projection.monthlySavings).toBe('number');

        // Validate projection constraints
        expect(projection.totalInterest).toBeGreaterThanOrEqual(0);
        expect(projection.payoffTime).toBeGreaterThan(0); // Should be positive months
        expect(projection.monthlySavings).toBeGreaterThanOrEqual(0);
      }
    });

    it('should support projections parameter', async () => {
      const withProjections = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          includeProjections: true
        })
        .expect(200);

      const withoutProjections = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          includeProjections: false
        })
        .expect(200);

      expect(Array.isArray(withProjections.body.payoffProjections)).toBe(true);
      expect(Array.isArray(withoutProjections.body.payoffProjections)).toBe(true);

      // Without projections, the array might be empty or contain minimal data
      if (!withoutProjections.body.includeProjections) {
        expect(withoutProjections.body.payoffProjections.length).toBeLessThanOrEqual(1);
      }
    });

    it('should use default values for optional parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Should default to including projections (per OpenAPI spec default: true)
      expect(response.body).toHaveProperty('payoffProjections');
      expect(Array.isArray(response.body.payoffProjections)).toBe(true);
    });

    it('should calculate debt metrics correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Total debt should match sum of individual account balances
      if (response.body.debtAccounts.length > 0) {
        const calculatedTotalDebt = response.body.debtAccounts.reduce(
          (sum, account) => sum + account.currentBalance,
          0
        );
        expect(Math.abs(response.body.totalDebt - calculatedTotalDebt)).toBeLessThan(0.01);
      }

      // Monthly debt payments should match sum of minimum payments
      if (response.body.debtAccounts.length > 0) {
        const calculatedMonthlyPayments = response.body.debtAccounts.reduce(
          (sum, account) => sum + account.minimumPayment,
          0
        );
        expect(Math.abs(response.body.monthlyDebtPayments - calculatedMonthlyPayments)).toBeLessThan(0.01);
      }
    });

    it('should provide payoff projections with different strategies', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          includeProjections: true
        })
        .expect(200);

      if (response.body.payoffProjections.length > 1) {
        const strategies = response.body.payoffProjections.map(p => p.strategy);
        const uniqueStrategies = [...new Set(strategies)];

        // Should provide multiple different strategies
        expect(uniqueStrategies.length).toBeGreaterThan(1);

        // Each strategy should have different outcomes
        const payoffTimes = response.body.payoffProjections.map(p => p.payoffTime);
        const totalInterests = response.body.payoffProjections.map(p => p.totalInterest);

        // Not all payoff times should be identical (unless there's only one debt)
        if (response.body.debtAccounts.length > 1) {
          expect(new Set(payoffTimes).size).toBeGreaterThan(1);
        }
      }
    });

    it('should handle scenarios with no debt', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // When no debt exists, arrays should be empty but structure should be valid
      expect(Array.isArray(response.body.debtAccounts)).toBe(true);
      expect(Array.isArray(response.body.payoffProjections)).toBe(true);

      if (response.body.totalDebt === 0) {
        expect(response.body.monthlyDebtPayments).toBe(0);
        expect(response.body.debtAccounts.length).toBe(0);
      }
    });
  });

  describe('Invalid Debt Analysis Report Requests', () => {
    it('should return 400 for invalid includeProjections values', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', mockAccessToken)
        .query({
          includeProjections: 'invalid-boolean'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reports/debt-analysis')
        .set('Authorization', 'Bearer limited-permissions-token')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});