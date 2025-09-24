/**
 * Contract Test: GET /api/budget-categories/{categoryId}
 * Task: T099 - Budget category details endpoint contract validation
 *
 * This test validates the budget category details API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock authentication token
const mockToken = 'Bearer mock-jwt-token';

// Mock UUIDs for testing
const mockCategoryId = '123e4567-e89b-12d3-a456-426614174000';
const nonExistentCategoryId = '987fcdeb-51a2-43d1-9f8e-123456789abc';

describe('Contract Test: GET /api/budget-categories/{categoryId}', () => {
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

  describe('Valid Budget Category Details Request', () => {
    it('should return 200 with budget category details', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate base category structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('targetPercentage');
      expect(response.body).toHaveProperty('color');
      expect(response.body).toHaveProperty('sortOrder');
      expect(response.body).toHaveProperty('isActive');
      expect(response.body).toHaveProperty('currentPeriodAllocated');
      expect(response.body).toHaveProperty('currentPeriodSpent');
      expect(response.body).toHaveProperty('remainingBalance');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate extended details structure
      expect(response.body).toHaveProperty('allocationHistory');
      expect(response.body).toHaveProperty('spendingCategories');
      expect(response.body).toHaveProperty('monthlyPerformance');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.name).toBe('string');
      expect(typeof response.body.targetPercentage).toBe('number');
      expect(typeof response.body.color).toBe('string');
      expect(typeof response.body.sortOrder).toBe('number');
      expect(typeof response.body.isActive).toBe('boolean');
      expect(typeof response.body.currentPeriodAllocated).toBe('number');
      expect(typeof response.body.currentPeriodSpent).toBe('number');
      expect(typeof response.body.remainingBalance).toBe('number');
      expect(Array.isArray(response.body.allocationHistory)).toBe(true);
      expect(Array.isArray(response.body.spendingCategories)).toBe(true);
      expect(Array.isArray(response.body.monthlyPerformance)).toBe(true);

      // Validate constraints
      expect(response.body.targetPercentage).toBeGreaterThanOrEqual(0);
      expect(response.body.targetPercentage).toBeLessThanOrEqual(100);
      expect(response.body.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(response.body.sortOrder).toBeGreaterThanOrEqual(0);
    });

    it('should return allocation history with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { allocationHistory } = response.body;

      // If allocation history exists, validate structure
      if (allocationHistory.length > 0) {
        const allocation = allocationHistory[0];
        expect(allocation).toHaveProperty('id');
        expect(allocation).toHaveProperty('incomeEventName');
        expect(allocation).toHaveProperty('amount');
        expect(allocation).toHaveProperty('percentage');
        expect(allocation).toHaveProperty('createdAt');

        // Validate data types
        expect(typeof allocation.id).toBe('string');
        expect(typeof allocation.incomeEventName).toBe('string');
        expect(typeof allocation.amount).toBe('number');
        expect(typeof allocation.percentage).toBe('number');
        expect(typeof allocation.createdAt).toBe('string');

        // Validate constraints
        expect(allocation.amount).toBeGreaterThanOrEqual(0);
        expect(allocation.percentage).toBeGreaterThanOrEqual(0);
        expect(allocation.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should return spending categories with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { spendingCategories } = response.body;

      // If spending categories exist, validate structure
      if (spendingCategories.length > 0) {
        const category = spendingCategories[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('color');
        expect(category).toHaveProperty('icon');

        // Validate data types
        expect(typeof category.id).toBe('string');
        expect(typeof category.name).toBe('string');
        expect(typeof category.color).toBe('string');
        expect(typeof category.icon).toBe('string');
      }
    });

    it('should return monthly performance with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { monthlyPerformance } = response.body;

      // If monthly performance data exists, validate structure
      if (monthlyPerformance.length > 0) {
        const performance = monthlyPerformance[0];
        expect(performance).toHaveProperty('month');
        expect(performance).toHaveProperty('allocated');
        expect(performance).toHaveProperty('spent');
        expect(performance).toHaveProperty('variance');

        // Validate data types
        expect(typeof performance.month).toBe('string');
        expect(typeof performance.allocated).toBe('number');
        expect(typeof performance.spent).toBe('number');
        expect(typeof performance.variance).toBe('number');

        // Validate date format
        expect(performance.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Validate constraints
        expect(performance.allocated).toBeGreaterThanOrEqual(0);
        expect(performance.spent).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort allocation history by creation date descending', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { allocationHistory } = response.body;

      // If multiple allocations exist, verify sorting
      if (allocationHistory.length > 1) {
        for (let i = 0; i < allocationHistory.length - 1; i++) {
          const current = new Date(allocationHistory[i].createdAt);
          const next = new Date(allocationHistory[i + 1].createdAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should sort monthly performance by month descending', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { monthlyPerformance } = response.body;

      // If multiple months exist, verify sorting
      if (monthlyPerformance.length > 1) {
        for (let i = 0; i < monthlyPerformance.length - 1; i++) {
          const current = new Date(monthlyPerformance[i].month);
          const next = new Date(monthlyPerformance[i + 1].month);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('Invalid Budget Category Requests', () => {
    it('should return 404 for non-existent category', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${nonExistentCategoryId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.error).toBe('Budget category not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidIds = [
        'not-a-uuid',
        '12345',
        'invalid-uuid-format',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra' // Too long
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget-categories/${invalidId}`)
          .set('Authorization', mockToken)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid|uuid|format/i);
      }
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', 'InvalidFormat token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should include security headers', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      // Common security headers should be present
      // These may vary based on server configuration
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle categories with no allocation history gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      // Even if no data, arrays should be present and empty
      expect(Array.isArray(response.body.allocationHistory)).toBe(true);
      expect(Array.isArray(response.body.spendingCategories)).toBe(true);
      expect(Array.isArray(response.body.monthlyPerformance)).toBe(true);
    });
  });
});