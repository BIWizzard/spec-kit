/**
 * Contract Test: POST /api/budget-allocations/{incomeEventId}/generate
 * Task: T106 - Budget allocation generation endpoint contract validation
 *
 * This test validates the budget allocation generation API contract against the OpenAPI specification.
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
const existingAllocationsIncomeEventId = '456e7890-e12b-34d5-b789-012345678901';
const nonExistentIncomeEventId = '987fcdeb-51a2-43d1-9f8e-123456789abc';

describe('Contract Test: POST /api/budget-allocations/{incomeEventId}/generate', () => {
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

  describe('Valid Budget Allocation Generation', () => {
    it('should return 201 with generated allocations', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('allocations');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.allocations)).toBe(true);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalAllocated');
      expect(summary).toHaveProperty('incomeAmount');
      expect(summary).toHaveProperty('categoriesAllocated');
      expect(typeof summary.totalAllocated).toBe('number');
      expect(typeof summary.incomeAmount).toBe('number');
      expect(typeof summary.categoriesAllocated).toBe('number');
    });

    it('should generate allocations for all active budget categories', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect(201);

      const { allocations } = response.body;

      // Validate allocation structure
      if (allocations.length > 0) {
        const allocation = allocations[0];
        expect(allocation).toHaveProperty('id');
        expect(allocation).toHaveProperty('incomeEvent');
        expect(allocation).toHaveProperty('budgetCategory');
        expect(allocation).toHaveProperty('amount');
        expect(allocation).toHaveProperty('percentage');
        expect(allocation).toHaveProperty('spentAmount', 0);
        expect(allocation).toHaveProperty('remainingAmount');
        expect(allocation).toHaveProperty('createdAt');

        // Validate data types
        expect(typeof allocation.id).toBe('string');
        expect(typeof allocation.amount).toBe('number');
        expect(typeof allocation.percentage).toBe('number');
        expect(typeof allocation.spentAmount).toBe('number');
        expect(typeof allocation.remainingAmount).toBe('number');

        // Validate constraints
        expect(allocation.amount).toBeGreaterThanOrEqual(0);
        expect(allocation.percentage).toBeGreaterThanOrEqual(0);
        expect(allocation.percentage).toBeLessThanOrEqual(100);
        expect(allocation.spentAmount).toBe(0); // New allocations should have no spending
        expect(allocation.remainingAmount).toBe(allocation.amount);
      }
    });

    it('should allocate amounts based on category percentages', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect(201);

      const { allocations, summary } = response.body;
      const { totalAllocated, incomeAmount } = summary;

      // Total allocated should equal income amount (assuming 100% category allocation)
      expect(totalAllocated).toBeCloseTo(incomeAmount, 2);

      // Each allocation should have correct percentage-based amount
      allocations.forEach(allocation => {
        const expectedAmount = (incomeAmount * allocation.percentage) / 100;
        expect(allocation.amount).toBeCloseTo(expectedAmount, 2);
      });
    });

    it('should handle income events with zero amount', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect(201);

      // Should still generate allocations even if income is 0
      expect(response.body).toHaveProperty('allocations');
      expect(response.body).toHaveProperty('summary');
    });
  });

  describe('Invalid Budget Allocation Generation', () => {
    it('should return 400 for non-existent income event', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${nonExistentIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.message).toMatch(/income.*event.*not.*found/i);
    });

    it('should return 400 when allocations already exist', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${existingAllocationsIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/allocations.*already.*exist/i);
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
          .post(`/api/budget-allocations/${invalidId}/generate`)
          .set('Authorization', mockToken)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid|uuid|format/i);
      }
    });

    it('should return 400 when no active budget categories exist', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/no.*budget.*categories|categories.*not.*configured/i);
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent generation requests', async () => {
      // Simulate race condition
      const promises = [
        request(API_BASE_URL)
          .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
          .set('Authorization', mockToken),
        request(API_BASE_URL)
          .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
          .set('Authorization', mockToken)
      ];

      const responses = await Promise.all(promises);

      // One should succeed (201), one should fail with allocations already exist (400)
      const statuses = responses.map(r => r.status);
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);
    });
  });

  describe('Content-Type and Security', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(201);
    });

    it('should not require request body', async () => {
      // This endpoint should work without any request body
      const response = await request(API_BASE_URL)
        .post(`/api/budget-allocations/${mockIncomeEventId}/generate`)
        .set('Authorization', mockToken)
        .expect(201);

      expect(response.body).toHaveProperty('allocations');
    });
  });
});
