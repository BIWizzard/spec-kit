/**
 * Contract Test: GET /api/budget-allocations
 * Task: T103 - Budget allocations list endpoint contract validation
 *
 * This test validates the budget allocations list API contract against the OpenAPI specification.
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
const mockIncomeEventId = '123e4567-e89b-12d3-a456-426614174000';
const mockBudgetCategoryId = '456e7890-e12b-34d5-b789-012345678901';

describe('Contract Test: GET /api/budget-allocations', () => {
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

  describe('Valid Budget Allocations List Request', () => {
    it('should return 200 with list of budget allocations', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('allocations');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.allocations)).toBe(true);

      // Validate pagination structure
      const { pagination } = response.body;
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('offset');
      expect(pagination).toHaveProperty('hasMore');
      expect(typeof pagination.total).toBe('number');
      expect(typeof pagination.limit).toBe('number');
      expect(typeof pagination.offset).toBe('number');
      expect(typeof pagination.hasMore).toBe('boolean');

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalAllocated');
      expect(summary).toHaveProperty('totalSpent');
      expect(summary).toHaveProperty('remainingBalance');
      expect(typeof summary.totalAllocated).toBe('number');
      expect(typeof summary.totalSpent).toBe('number');
      expect(typeof summary.remainingBalance).toBe('number');
    });

    it('should return budget allocations with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations')
        .set('Authorization', mockToken)
        .expect(200);

      const { allocations } = response.body;

      // If allocations exist, validate their structure
      if (allocations.length > 0) {
        const allocation = allocations[0];
        expect(allocation).toHaveProperty('id');
        expect(allocation).toHaveProperty('incomeEvent');
        expect(allocation).toHaveProperty('budgetCategory');
        expect(allocation).toHaveProperty('amount');
        expect(allocation).toHaveProperty('percentage');
        expect(allocation).toHaveProperty('spentAmount');
        expect(allocation).toHaveProperty('remainingAmount');
        expect(allocation).toHaveProperty('createdAt');

        // Validate nested structures
        const { incomeEvent } = allocation;
        expect(incomeEvent).toHaveProperty('id');
        expect(incomeEvent).toHaveProperty('name');
        expect(incomeEvent).toHaveProperty('amount');
        expect(incomeEvent).toHaveProperty('scheduledDate');

        const { budgetCategory } = allocation;
        expect(budgetCategory).toHaveProperty('id');
        expect(budgetCategory).toHaveProperty('name');
        expect(budgetCategory).toHaveProperty('color');

        // Validate data types
        expect(typeof allocation.id).toBe('string');
        expect(typeof allocation.amount).toBe('number');
        expect(typeof allocation.percentage).toBe('number');
        expect(typeof allocation.spentAmount).toBe('number');
        expect(typeof allocation.remainingAmount).toBe('number');
        expect(typeof allocation.createdAt).toBe('string');
      }
    });

    it('should support pagination parameters', async () => {
      // Test with custom limit and offset
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations?limit=10&offset=5')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(5);
    });

    it('should support filtering by incomeEventId', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations?incomeEventId=${mockIncomeEventId}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('allocations');
      // All returned allocations should belong to the specified income event
      const { allocations } = response.body;
      allocations.forEach(allocation => {
        expect(allocation.incomeEvent.id).toBe(mockIncomeEventId);
      });
    });

    it('should support filtering by budgetCategoryId', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations?budgetCategoryId=${mockBudgetCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('allocations');
      // All returned allocations should belong to the specified budget category
      const { allocations } = response.body;
      allocations.forEach(allocation => {
        expect(allocation.budgetCategory.id).toBe(mockBudgetCategoryId);
      });
    });

    it('should support date range filtering', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations?fromDate=${fromDate}&toDate=${toDate}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('allocations');
    });

    it('should handle default pagination correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations')
        .set('Authorization', mockToken)
        .expect(200);

      // Default should be limit=50, offset=0
      expect(response.body.pagination.limit).toBe(50);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('Pagination Parameter Validation', () => {
    it('should handle invalid limit parameter', async () => {
      const invalidLimits = [
        { limit: 0, expected: 400 }, // Below minimum
        { limit: 101, expected: 400 }, // Above maximum
        { limit: -5, expected: 400 }, // Negative
        { limit: 'invalid', expected: 400 } // Not a number
      ];

      for (const { limit, expected } of invalidLimits) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget-allocations?limit=${limit}`)
          .set('Authorization', mockToken)
          .expect(expected);

        if (expected === 400) {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toBe('Invalid request data');
        }
      }
    });

    it('should handle invalid offset parameter', async () => {
      const invalidOffsets = [
        { offset: -1, expected: 400 }, // Negative
        { offset: 'invalid', expected: 400 } // Not a number
      ];

      for (const { offset, expected } of invalidOffsets) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget-allocations?offset=${offset}`)
          .set('Authorization', mockToken)
          .expect(expected);

        if (expected === 400) {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toBe('Invalid request data');
        }
      }
    });

    it('should handle invalid UUID format for filters', async () => {
      const invalidUuids = [
        'not-a-uuid',
        '12345',
        'invalid-format'
      ];

      for (const invalidUuid of invalidUuids) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget-allocations?incomeEventId=${invalidUuid}`)
          .set('Authorization', mockToken)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should handle invalid date format', async () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        'invalid-format'
      ];

      for (const invalidDate of invalidDates) {
        const response = await request(API_BASE_URL)
          .get(`/api/budget-allocations?fromDate=${invalidDate}`)
          .set('Authorization', mockToken)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty allocations list gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body.allocations).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.summary.totalAllocated).toBe(0);
      expect(response.body.summary.totalSpent).toBe(0);
      expect(response.body.summary.remainingBalance).toBe(0);
    });

    it('should handle no results for specific filters', async () => {
      const nonExistentId = '987fcdeb-51a2-43d1-9f8e-123456789abc';

      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations?incomeEventId=${nonExistentId}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body.allocations).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  describe('Sorting and Ordering', () => {
    it('should return allocations sorted by creation date descending by default', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations')
        .set('Authorization', mockToken)
        .expect(200);

      const { allocations } = response.body;

      // If multiple allocations exist, verify sorting
      if (allocations.length > 1) {
        for (let i = 0; i < allocations.length - 1; i++) {
          const current = new Date(allocations[i].createdAt);
          const next = new Date(allocations[i + 1].createdAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('Content-Type and Performance', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get('/api/budget-allocations')
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should handle large offset values gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-allocations?offset=10000')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('allocations');
      expect(response.body.pagination.offset).toBe(10000);
    });
  });
});