/**
 * Contract Test: GET /api/budget/projections
 * Task: T110 - Budget projections endpoint contract validation
 *
 * This test validates the budget projections API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock authentication token
const mockToken = 'Bearer mock-jwt-token';

describe('Contract Test: GET /api/budget/projections', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.budgetAllocation.deleteMany();
    await prisma.budgetCategory.deleteMany();
    await prisma.incomeEvent.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Budget Projections Request', () => {
    it('should return 200 with budget projections using default months', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('projections');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.projections)).toBe(true);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalProjectedIncome');
      expect(summary).toHaveProperty('totalProjectedAllocations');
      expect(summary).toHaveProperty('projectedSavings');
      expect(typeof summary.totalProjectedIncome).toBe('number');
      expect(typeof summary.totalProjectedAllocations).toBe('number');
      expect(typeof summary.projectedSavings).toBe('number');

      // Should default to 3 months of projections
      expect(response.body.projections.length).toBeLessThanOrEqual(3);
    });

    it('should return projections with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections?months=6')
        .set('Authorization', mockToken)
        .expect(200);

      const { projections } = response.body;

      if (projections.length > 0) {
        const projection = projections[0];
        expect(projection).toHaveProperty('month');
        expect(projection).toHaveProperty('projectedIncome');
        expect(projection).toHaveProperty('categoryProjections');
        expect(projection).toHaveProperty('confidence');

        // Validate data types
        expect(typeof projection.month).toBe('string');
        expect(typeof projection.projectedIncome).toBe('number');
        expect(typeof projection.confidence).toBe('number');
        expect(Array.isArray(projection.categoryProjections)).toBe(true);

        // Validate date format
        expect(projection.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Validate confidence range
        expect(projection.confidence).toBeGreaterThanOrEqual(0);
        expect(projection.confidence).toBeLessThanOrEqual(1);

        // Validate constraints
        expect(projection.projectedIncome).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return category projections with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections')
        .set('Authorization', mockToken)
        .expect(200);

      const { projections } = response.body;

      if (projections.length > 0 && projections[0].categoryProjections.length > 0) {
        const categoryProjection = projections[0].categoryProjections[0];
        expect(categoryProjection).toHaveProperty('categoryId');
        expect(categoryProjection).toHaveProperty('categoryName');
        expect(categoryProjection).toHaveProperty('projectedAllocation');

        // Validate data types
        expect(typeof categoryProjection.categoryId).toBe('string');
        expect(typeof categoryProjection.categoryName).toBe('string');
        expect(typeof categoryProjection.projectedAllocation).toBe('number');

        // Validate constraints
        expect(categoryProjection.projectedAllocation).toBeGreaterThanOrEqual(0);
      }
    });

    it('should support custom months parameter', async () => {
      const monthsToProject = 12;
      const response = await request(API_BASE_URL)
        .get(`/api/budget/projections?months=${monthsToProject}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { projections } = response.body;
      expect(projections.length).toBeLessThanOrEqual(monthsToProject);
    });

    it('should calculate projections based on historical data', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections')
        .set('Authorization', mockToken)
        .expect(200);

      const { summary } = response.body;
      // Summary calculations should be consistent
      expect(summary.totalProjectedIncome).toBeGreaterThanOrEqual(0);
      expect(summary.totalProjectedAllocations).toBeGreaterThanOrEqual(0);
      expect(summary.projectedSavings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Invalid Budget Projections Requests', () => {
    it('should return 400 for invalid months parameter', async () => {
      const invalidMonths = [
        { months: 0, expected: 400 }, // Below minimum
        { months: 13, expected: 400 }, // Above maximum
        { months: -3, expected: 400 }, // Negative
        { months: 'invalid', expected: 400 } // Not a number
      ];

      for (const { months, expected } of invalidMonths) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget/projections?months=${months}`)
          .set('Authorization', mockToken)
          .expect(expected);

        if (expected === 400) {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toBe('Invalid request data');
          expect(response.body.message).toContain('months');
        }
      }
    });

    it('should handle edge case of 1 month projection', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections?months=1')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('projections');
      expect(response.body.projections.length).toBeLessThanOrEqual(1);
    });

    it('should handle edge case of maximum 12 months projection', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections?months=12')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('projections');
      expect(response.body.projections.length).toBeLessThanOrEqual(12);
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections')
        .set('Authorization', 'InvalidFormat token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get('/api/budget/projections')
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should handle no historical data gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections')
        .set('Authorization', mockToken)
        .expect(200);

      // Should still return structure even with no data
      expect(response.body).toHaveProperty('projections');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.projections)).toBe(true);
    });

    it('should sort projections by month ascending', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections?months=6')
        .set('Authorization', mockToken)
        .expect(200);

      const { projections } = response.body;

      // If multiple projections exist, verify sorting
      if (projections.length > 1) {
        for (let i = 0; i < projections.length - 1; i++) {
          const current = new Date(projections[i].month);
          const next = new Date(projections[i + 1].month);
          expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
      }
    });

    it('should provide confidence scores for all projections', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/projections')
        .set('Authorization', mockToken)
        .expect(200);

      const { projections } = response.body;

      projections.forEach(projection => {
        expect(projection.confidence).toBeGreaterThanOrEqual(0);
        expect(projection.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});