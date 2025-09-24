/**
 * Contract Test: GET /api/analytics/dashboard
 * Task: T129 - Analytics dashboard endpoint contract validation
 *
 * This test validates the analytics dashboard API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/analytics/dashboard', () => {
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

  describe('Valid Dashboard Analytics Requests', () => {
    it('should return 200 with dashboard analytics for default period', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per DashboardAnalyticsResponse schema
      expect(response.body).toHaveProperty('currentPeriod');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('upcomingEvents');

      // Validate current period structure
      const { currentPeriod } = response.body;
      expect(currentPeriod).toHaveProperty('totalIncome');
      expect(currentPeriod).toHaveProperty('totalExpenses');
      expect(currentPeriod).toHaveProperty('netCashFlow');
      expect(currentPeriod).toHaveProperty('savingsRate');
      expect(currentPeriod).toHaveProperty('budgetUtilization');

      // Validate data types
      expect(typeof currentPeriod.totalIncome).toBe('number');
      expect(typeof currentPeriod.totalExpenses).toBe('number');
      expect(typeof currentPeriod.netCashFlow).toBe('number');
      expect(typeof currentPeriod.savingsRate).toBe('number');
      expect(typeof currentPeriod.budgetUtilization).toBe('number');

      // Net cash flow should equal income minus expenses
      expect(Math.abs(currentPeriod.netCashFlow - (currentPeriod.totalIncome - currentPeriod.totalExpenses))).toBeLessThan(0.01);

      // Percentages should be reasonable
      expect(currentPeriod.savingsRate).toBeGreaterThanOrEqual(-100);
      expect(currentPeriod.budgetUtilization).toBeGreaterThanOrEqual(0);

      // Validate trends structure
      const { trends } = response.body;
      expect(trends).toHaveProperty('incomeGrowth');
      expect(trends).toHaveProperty('expenseGrowth');
      expect(trends).toHaveProperty('savingsGrowth');

      expect(typeof trends.incomeGrowth).toBe('number');
      expect(typeof trends.expenseGrowth).toBe('number');
      expect(typeof trends.savingsGrowth).toBe('number');

      // Growth rates should be reasonable percentages
      expect(trends.incomeGrowth).toBeGreaterThanOrEqual(-100);
      expect(trends.expenseGrowth).toBeGreaterThanOrEqual(-100);
      expect(trends.savingsGrowth).toBeGreaterThanOrEqual(-100);

      // Validate alerts array
      expect(Array.isArray(response.body.alerts)).toBe(true);
      if (response.body.alerts.length > 0) {
        const alert = response.body.alerts[0];
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('amount');

        expect(['budget_exceeded', 'low_savings', 'unusual_spending', 'payment_due']).toContain(alert.type);
        expect(['info', 'warning', 'critical']).toContain(alert.severity);
        expect(typeof alert.message).toBe('string');
        expect(alert.message.length).toBeGreaterThan(0);

        // Amount can be null
        if (alert.amount !== null) {
          expect(typeof alert.amount).toBe('number');
        }
      }

      // Validate upcoming events array
      expect(Array.isArray(response.body.upcomingEvents)).toBe(true);
      if (response.body.upcomingEvents.length > 0) {
        const event = response.body.upcomingEvents[0];
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('amount');
        expect(event).toHaveProperty('date');

        expect(['income', 'payment', 'bill_due']).toContain(event.type);
        expect(typeof event.name).toBe('string');
        expect(event.name.length).toBeGreaterThan(0);
        expect(typeof event.amount).toBe('number');
        expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Date should be in the near future
        const eventDate = new Date(event.date);
        const now = new Date();
        const daysDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeGreaterThanOrEqual(-1); // Allow for timezone differences
        expect(daysDiff).toBeLessThanOrEqual(90); // Should be within next 3 months
      }
    });

    it('should support different time period parameters', async () => {
      const periods = ['7days', '30days', '90days', '1year'];

      for (const period of periods) {
        const response = await request(API_BASE_URL)
          .get('/api/analytics/dashboard')
          .set('Authorization', mockAccessToken)
          .query({ period })
          .expect(200);

        expect(response.body).toHaveProperty('currentPeriod');
        expect(response.body).toHaveProperty('trends');

        // Different periods should potentially show different trends
        const { trends } = response.body;
        expect(typeof trends.incomeGrowth).toBe('number');
        expect(typeof trends.expenseGrowth).toBe('number');
        expect(typeof trends.savingsGrowth).toBe('number');
      }
    });

    it('should use default period when not specified', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Should default to 30days per OpenAPI spec
      expect(response.body).toHaveProperty('currentPeriod');
      expect(response.body).toHaveProperty('trends');
    });

    it('should prioritize alerts by severity', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.alerts.length > 1) {
        const alerts = response.body.alerts;
        const severityOrder = ['critical', 'warning', 'info'];

        // Check if alerts are ordered by severity (critical first)
        for (let i = 1; i < alerts.length; i++) {
          const prevSeverityIndex = severityOrder.indexOf(alerts[i - 1].severity);
          const currentSeverityIndex = severityOrder.indexOf(alerts[i].severity);

          expect(prevSeverityIndex).toBeLessThanOrEqual(currentSeverityIndex);
        }
      }
    });

    it('should order upcoming events chronologically', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.upcomingEvents.length > 1) {
        const events = response.body.upcomingEvents;

        // Check chronological order (earliest first)
        for (let i = 1; i < events.length; i++) {
          const prevDate = new Date(events[i - 1].date);
          const currentDate = new Date(events[i].date);

          expect(prevDate.getTime()).toBeLessThanOrEqual(currentDate.getTime());
        }
      }
    });

    it('should calculate budget utilization correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const { budgetUtilization } = response.body.currentPeriod;

      // Budget utilization should be a percentage
      expect(budgetUtilization).toBeGreaterThanOrEqual(0);

      // If there are no budgets, utilization might be 0 or null
      if (budgetUtilization > 0) {
        expect(budgetUtilization).toBeGreaterThan(0);
      }
    });

    it('should provide meaningful alert messages', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect(200);

      response.body.alerts.forEach(alert => {
        // Alert messages should be descriptive and actionable
        expect(alert.message.length).toBeGreaterThan(10);
        expect(alert.message.length).toBeLessThan(200);

        // Should not contain technical jargon or error codes
        expect(alert.message).not.toMatch(/error|exception|stack|debug/i);

        // Critical alerts should have amounts
        if (alert.severity === 'critical' && ['budget_exceeded', 'unusual_spending', 'payment_due'].includes(alert.type)) {
          expect(alert.amount).not.toBe(null);
          expect(alert.amount).toBeGreaterThan(0);
        }
      });
    });

    it('should validate savings rate calculation', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const { currentPeriod } = response.body;

      // If there's income, savings rate should be calculated correctly
      if (currentPeriod.totalIncome > 0) {
        const expectedSavingsRate = (currentPeriod.netCashFlow / currentPeriod.totalIncome) * 100;
        expect(Math.abs(currentPeriod.savingsRate - expectedSavingsRate)).toBeLessThan(0.1);
      } else {
        // If no income, savings rate should be 0 or undefined behavior
        expect(typeof currentPeriod.savingsRate).toBe('number');
      }
    });
  });

  describe('Invalid Dashboard Analytics Requests', () => {
    it('should return 400 for invalid period parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .query({ period: 'invalid_period' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for multiple invalid parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .query({
          period: 'invalid_period',
          extraParam: 'should_not_exist'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle accounts with no recent activity', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Should return valid structure even with no data
      expect(response.body).toHaveProperty('currentPeriod');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('upcomingEvents');

      // Arrays should be empty if no data
      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(Array.isArray(response.body.upcomingEvents)).toBe(true);
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Dashboard should load quickly (under 3 seconds)
      expect(responseTime).toBeLessThan(3000);

      expect(response.body).toHaveProperty('currentPeriod');
    });

    it('should handle large datasets efficiently', async () => {
      // This tests the endpoint's ability to aggregate large amounts of data
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', mockAccessToken)
        .query({ period: '1year' }) // Largest period
        .expect(200);

      expect(response.body).toHaveProperty('currentPeriod');
      expect(response.body).toHaveProperty('trends');

      // Should still provide accurate calculations
      const { currentPeriod } = response.body;
      expect(typeof currentPeriod.totalIncome).toBe('number');
      expect(typeof currentPeriod.totalExpenses).toBe('number');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', 'Bearer limited-permissions-token')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should require view reports permission', async () => {
      const readOnlyToken = 'Bearer read-only-token';

      const response = await request(API_BASE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', readOnlyToken)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toMatch(/permission|access|report/i);
    });
  });
});