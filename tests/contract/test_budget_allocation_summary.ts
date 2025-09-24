/**
 * Contract Test: GET /api/budget-allocations/{incomeEventId}/summary
 * Task: T107 - Budget allocation summary endpoint contract validation
 *
 * This test validates the budget allocation summary API contract against the OpenAPI specification.
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
const nonExistentIncomeEventId = '987fcdeb-51a2-43d1-9f8e-123456789abc';

describe('Contract Test: GET /api/budget-allocations/{incomeEventId}/summary', () => {
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

  describe('Valid Budget Allocation Summary Request', () => {
    it('should return 200 with allocation summary', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('incomeEvent');
      expect(response.body).toHaveProperty('allocations');
      expect(response.body).toHaveProperty('summary');

      // Validate income event structure
      const { incomeEvent } = response.body;
      expect(incomeEvent).toHaveProperty('id', mockIncomeEventId);
      expect(incomeEvent).toHaveProperty('name');
      expect(incomeEvent).toHaveProperty('amount');
      expect(incomeEvent).toHaveProperty('scheduledDate');
      expect(incomeEvent).toHaveProperty('status');
      expect(['scheduled', 'received', 'cancelled']).toContain(incomeEvent.status);

      // Validate allocations structure
      const { allocations } = response.body;
      expect(Array.isArray(allocations)).toBe(true);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalAllocated');
      expect(summary).toHaveProperty('totalSpent');
      expect(summary).toHaveProperty('totalRemaining');
      expect(summary).toHaveProperty('allocationPercentage');
      expect(typeof summary.totalAllocated).toBe('number');
      expect(typeof summary.totalSpent).toBe('number');
      expect(typeof summary.totalRemaining).toBe('number');
      expect(typeof summary.allocationPercentage).toBe('number');
    });

    it('should validate allocation summary calculations', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .set('Authorization', mockToken)
        .expect(200);

      const { summary } = response.body;
      const { totalAllocated, totalSpent, totalRemaining } = summary;

      // totalRemaining should equal totalAllocated - totalSpent
      expect(totalRemaining).toBeCloseTo(totalAllocated - totalSpent, 2);

      // All amounts should be non-negative
      expect(totalAllocated).toBeGreaterThanOrEqual(0);
      expect(totalSpent).toBeGreaterThanOrEqual(0);
      expect(totalRemaining).toBeGreaterThanOrEqual(0);

      // allocationPercentage should be between 0 and 100
      expect(summary.allocationPercentage).toBeGreaterThanOrEqual(0);
      expect(summary.allocationPercentage).toBeLessThanOrEqual(100);
    });

    it('should include all allocations for the income event', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .set('Authorization', mockToken)
        .expect(200);

      const { allocations } = response.body;

      // All allocations should belong to the specified income event
      allocations.forEach(allocation => {
        expect(allocation).toHaveProperty('id');
        expect(allocation).toHaveProperty('incomeEvent');
        expect(allocation).toHaveProperty('budgetCategory');
        expect(allocation).toHaveProperty('amount');
        expect(allocation).toHaveProperty('percentage');
        expect(allocation).toHaveProperty('spentAmount');
        expect(allocation).toHaveProperty('remainingAmount');
        expect(allocation).toHaveProperty('createdAt');

        expect(allocation.incomeEvent.id).toBe(mockIncomeEventId);
      });
    });

    it('should handle income events with no allocations', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body.allocations).toEqual([]);
      expect(response.body.summary.totalAllocated).toBe(0);
      expect(response.body.summary.totalSpent).toBe(0);
      expect(response.body.summary.totalRemaining).toBe(0);
      expect(response.body.summary.allocationPercentage).toBe(0);
    });

    it('should calculate allocation percentage correctly', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .set('Authorization', mockToken)
        .expect(200);

      const { incomeEvent, summary } = response.body;
      const expectedPercentage = incomeEvent.amount > 0 
        ? (summary.totalAllocated / incomeEvent.amount) * 100
        : 0;

      expect(summary.allocationPercentage).toBeCloseTo(expectedPercentage, 2);
    });
  });

  describe('Invalid Income Event Requests', () => {
    it('should return 404 for non-existent income event', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${nonExistentIncomeEventId}/summary`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.error).toBe('Income event not found');
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
          .get(`/api/budget-allocations/${invalidId}/summary`)
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
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });

  describe('Content-Type and Data Validation', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should return valid date formats', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockIncomeEventId}/summary`)
        .set('Authorization', mockToken)
        .expect(200);

      const { incomeEvent } = response.body;
      expect(incomeEvent.scheduledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
