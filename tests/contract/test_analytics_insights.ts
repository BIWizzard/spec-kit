/**
 * Contract Test: GET /api/analytics/insights
 * Task: T131 - Analytics insights endpoint contract validation
 *
 * This test validates the analytics insights API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/analytics/insights', () => {
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

  describe('Valid Insights Analytics Requests', () => {
    it('should return 200 with financial insights', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per FinancialInsightsResponse schema
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('summary');

      // Validate insights array
      expect(Array.isArray(response.body.insights)).toBe(true);

      if (response.body.insights.length > 0) {
        const insight = response.body.insights[0];

        // Validate required properties
        expect(insight).toHaveProperty('id');
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('priority');
        expect(insight).toHaveProperty('potentialSavings');
        expect(insight).toHaveProperty('actionable');
        expect(insight).toHaveProperty('createdAt');

        // Validate data types
        expect(typeof insight.id).toBe('string');
        expect(insight.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(typeof insight.type).toBe('string');
        expect(typeof insight.title).toBe('string');
        expect(typeof insight.description).toBe('string');
        expect(typeof insight.priority).toBe('string');
        expect(typeof insight.actionable).toBe('boolean');
        expect(typeof insight.createdAt).toBe('string');

        // Validate enums
        expect(['spending_pattern', 'savings_opportunity', 'budget_optimization', 'income_growth']).toContain(insight.type);
        expect(['low', 'medium', 'high']).toContain(insight.priority);

        // Validate timestamp format
        expect(insight.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        // potentialSavings can be null
        if (insight.potentialSavings !== null) {
          expect(typeof insight.potentialSavings).toBe('number');
          expect(insight.potentialSavings).toBeGreaterThanOrEqual(0);
        }

        // Validate string lengths
        expect(insight.title.length).toBeGreaterThan(0);
        expect(insight.title.length).toBeLessThan(200);
        expect(insight.description.length).toBeGreaterThan(0);
        expect(insight.description.length).toBeLessThan(1000);
      }

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalInsights');
      expect(summary).toHaveProperty('highPriorityCount');
      expect(summary).toHaveProperty('potentialMonthlySavings');

      expect(typeof summary.totalInsights).toBe('number');
      expect(typeof summary.highPriorityCount).toBe('number');
      expect(typeof summary.potentialMonthlySavings).toBe('number');

      expect(summary.totalInsights).toBeGreaterThanOrEqual(0);
      expect(summary.highPriorityCount).toBeGreaterThanOrEqual(0);
      expect(summary.potentialMonthlySavings).toBeGreaterThanOrEqual(0);

      // High priority count should not exceed total insights
      expect(summary.highPriorityCount).toBeLessThanOrEqual(summary.totalInsights);

      // Total insights should match array length
      expect(summary.totalInsights).toBe(response.body.insights.length);
    });

    it('should prioritize insights correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.insights.length > 1) {
        const insights = response.body.insights;
        const priorityOrder = ['high', 'medium', 'low'];

        // Check if insights are ordered by priority (high first)
        for (let i = 1; i < insights.length; i++) {
          const prevPriorityIndex = priorityOrder.indexOf(insights[i - 1].priority);
          const currentPriorityIndex = priorityOrder.indexOf(insights[i].priority);

          expect(prevPriorityIndex).toBeLessThanOrEqual(currentPriorityIndex);
        }

        // Verify high priority count in summary
        const highPriorityInsights = insights.filter(i => i.priority === 'high');
        expect(response.body.summary.highPriorityCount).toBe(highPriorityInsights.length);
      }
    });

    it('should provide actionable insights with potential savings', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const actionableInsights = response.body.insights.filter(i => i.actionable);

      actionableInsights.forEach(insight => {
        // Actionable insights should have clear, specific recommendations
        expect(insight.description).toMatch(/should|could|consider|recommend/i);
        expect(insight.title.length).toBeGreaterThan(10);

        // Most actionable insights should have potential savings
        if (['savings_opportunity', 'budget_optimization'].includes(insight.type)) {
          expect(insight.potentialSavings).not.toBe(null);
          if (insight.potentialSavings !== null) {
            expect(insight.potentialSavings).toBeGreaterThan(0);
          }
        }
      });
    });

    it('should categorize insights by type appropriately', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const insightTypes = ['spending_pattern', 'savings_opportunity', 'budget_optimization', 'income_growth'];

      response.body.insights.forEach(insight => {
        expect(insightTypes).toContain(insight.type);

        switch (insight.type) {
          case 'spending_pattern':
            expect(insight.title.toLowerCase()).toMatch(/spend|pattern|trend/);
            break;
          case 'savings_opportunity':
            expect(insight.title.toLowerCase()).toMatch(/save|saving|opportunity/);
            expect(insight.potentialSavings).not.toBe(null);
            break;
          case 'budget_optimization':
            expect(insight.title.toLowerCase()).toMatch(/budget|optimize|allocation/);
            break;
          case 'income_growth':
            expect(insight.title.toLowerCase()).toMatch(/income|earn|growth/);
            break;
        }
      });
    });

    it('should calculate potential monthly savings correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Calculate total potential savings from individual insights
      const calculatedSavings = response.body.insights.reduce((total, insight) => {
        return total + (insight.potentialSavings || 0);
      }, 0);

      // Summary should match (allow for rounding differences)
      expect(Math.abs(response.body.summary.potentialMonthlySavings - calculatedSavings)).toBeLessThan(0.01);
    });

    it('should provide insights with recent creation dates', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      response.body.insights.forEach(insight => {
        const createdAt = new Date(insight.createdAt);

        // Insights should be relatively recent (within last 30 days for active analysis)
        expect(createdAt.getTime()).toBeGreaterThan(thirtyDaysAgo.getTime());
        expect(createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should provide meaningful and specific insight descriptions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      response.body.insights.forEach(insight => {
        // Descriptions should be informative and specific
        expect(insight.description.length).toBeGreaterThan(20);
        expect(insight.description).not.toMatch(/lorem ipsum|placeholder|test/i);

        // Should not contain technical jargon or error messages
        expect(insight.description).not.toMatch(/error|exception|null|undefined/i);

        // Should provide actionable information
        if (insight.actionable) {
          expect(insight.description).toMatch(/you|your|consider|try|should|could|might/i);
        }

        // Titles should be concise but descriptive
        expect(insight.title.length).toBeGreaterThan(5);
        expect(insight.title.length).toBeLessThan(100);
        expect(insight.title).toMatch(/^[A-Z]/); // Should start with capital letter
      });
    });

    it('should handle empty insights gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Even with no insights, should return valid structure
      expect(Array.isArray(response.body.insights)).toBe(true);
      expect(response.body).toHaveProperty('summary');

      if (response.body.insights.length === 0) {
        expect(response.body.summary.totalInsights).toBe(0);
        expect(response.body.summary.highPriorityCount).toBe(0);
        expect(response.body.summary.potentialMonthlySavings).toBe(0);
      }
    });

    it('should provide diverse insight types when data is available', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      if (response.body.insights.length >= 4) {
        const types = new Set(response.body.insights.map(i => i.type));

        // Should provide variety in insight types
        expect(types.size).toBeGreaterThan(1);
      }
    });

    it('should maintain consistency between summary and insights', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const { insights, summary } = response.body;

      // Verify all counts match
      expect(summary.totalInsights).toBe(insights.length);

      const highPriorityInsights = insights.filter(i => i.priority === 'high');
      expect(summary.highPriorityCount).toBe(highPriorityInsights.length);

      const totalSavings = insights.reduce((sum, insight) => sum + (insight.potentialSavings || 0), 0);
      expect(Math.abs(summary.potentialMonthlySavings - totalSavings)).toBeLessThan(0.01);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // AI-powered insights may take longer but should be under 5 seconds
      expect(responseTime).toBeLessThan(5000);

      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('summary');
    });

    it('should handle accounts with minimal data', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Should provide valid response even with minimal data
      expect(Array.isArray(response.body.insights)).toBe(true);
      expect(response.body).toHaveProperty('summary');

      // With minimal data, might have fewer insights but structure should be valid
      if (response.body.insights.length === 0) {
        expect(response.body.summary.totalInsights).toBe(0);
        expect(response.body.summary.highPriorityCount).toBe(0);
        expect(response.body.summary.potentialMonthlySavings).toBe(0);
      }
    });

    it('should limit the number of insights to prevent overwhelming users', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // Should provide manageable number of insights (typically 3-10)
      expect(response.body.insights.length).toBeLessThanOrEqual(15);

      // If there are insights, prioritize the most important ones
      if (response.body.insights.length > 0) {
        const highPriorityCount = response.body.insights.filter(i => i.priority === 'high').length;
        const totalCount = response.body.insights.length;

        // Should have reasonable distribution of priorities
        expect(highPriorityCount).toBeLessThanOrEqual(totalCount);
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', 'Bearer limited-permissions-token')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should require analytics or reports permission', async () => {
      const basicUserToken = 'Bearer basic-user-token';

      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', basicUserToken)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.message).toMatch(/permission|access|analytics|insights/i);
    });
  });

  describe('Data Privacy and Security', () => {
    it('should not expose sensitive financial data in insights', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      response.body.insights.forEach(insight => {
        // Should not expose specific account numbers, SSN, etc.
        expect(insight.description).not.toMatch(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/); // Credit card pattern
        expect(insight.description).not.toMatch(/\d{3}[-\s]?\d{2}[-\s]?\d{4}/); // SSN pattern
        expect(insight.title).not.toMatch(/account.*\d{4,}/i); // Account number pattern

        // Should use general terms rather than specific amounts when not necessary
        if (!insight.potentialSavings) {
          expect(insight.description).not.toMatch(/\$[\d,]+\.\d{2}/); // Specific dollar amounts
        }
      });
    });

    it('should provide family-specific insights only', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/analytics/insights')
        .set('Authorization', mockAccessToken)
        .expect(200);

      // This would be validated in integration tests to ensure insights
      // are based only on the authenticated family's data
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('summary');
    });
  });
});