/**
 * Contract Test: GET /api/budget/performance
 * Task: T109 - Budget performance endpoint contract validation
 *
 * This test validates the budget performance API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock authentication token
const mockToken = 'Bearer mock-jwt-token';

// Mock UUID for testing
const mockCategoryId = '123e4567-e89b-12d3-a456-426614174000';

describe('Contract Test: GET /api/budget/performance', () => {
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

  describe('Valid Budget Performance Request', () => {
    const validFromDate = '2024-01-01';
    const validToDate = '2024-12-31';

    it('should return 200 with budget performance data', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/performance?fromDate=${validFromDate}&toDate=${validToDate}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('trends');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(Array.isArray(response.body.trends)).toBe(true);

      // Validate overall performance structure
      const { overall } = response.body;
      expect(overall).toHaveProperty('budgetUtilization');
      expect(overall).toHaveProperty('averageOverspend');
      expect(overall).toHaveProperty('consistencyScore');
      expect(typeof overall.budgetUtilization).toBe('number');
      expect(typeof overall.averageOverspend).toBe('number');
      expect(typeof overall.consistencyScore).toBe('number');

      // Validate constraints
      expect(overall.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(overall.consistencyScore).toBeLessThanOrEqual(100);
    });

    it('should return category performance with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/performance?fromDate=${validFromDate}&toDate=${validToDate}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { categories } = response.body;

      if (categories.length > 0) {
        const category = categories[0];
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('totalAllocated');
        expect(category).toHaveProperty('totalSpent');
        expect(category).toHaveProperty('variance');
        expect(category).toHaveProperty('utilizationRate');
        expect(category).toHaveProperty('trend');
        expect(category).toHaveProperty('monthlyData');

        // Validate category nested structure
        expect(category.category).toHaveProperty('id');
        expect(category.category).toHaveProperty('name');
        expect(category.category).toHaveProperty('color');

        // Validate trend enum
        expect(['improving', 'stable', 'declining']).toContain(category.trend);

        // Validate monthly data
        expect(Array.isArray(category.monthlyData)).toBe(true);
        if (category.monthlyData.length > 0) {
          const monthData = category.monthlyData[0];
          expect(monthData).toHaveProperty('month');
          expect(monthData).toHaveProperty('allocated');
          expect(monthData).toHaveProperty('spent');
          expect(monthData.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    });

    it('should support categoryId filter', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/performance?fromDate=${validFromDate}&toDate=${validToDate}&categoryId=${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      // Should return only the specified category
      const { categories } = response.body;
      categories.forEach(category => {
        expect(category.category.id).toBe(mockCategoryId);
      });
    });

    it('should return trends with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/performance?fromDate=${validFromDate}&toDate=${validToDate}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { trends } = response.body;

      if (trends.length > 0) {
        const trend = trends[0];
        expect(trend).toHaveProperty('month');
        expect(trend).toHaveProperty('budgetUtilization');
        expect(trend).toHaveProperty('overspendAmount');
        expect(typeof trend.budgetUtilization).toBe('number');
        expect(typeof trend.overspendAmount).toBe('number');
        expect(trend.month).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('Invalid Budget Performance Requests', () => {
    it('should return 400 for missing required fromDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/performance?toDate=2024-12-31')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('fromDate');
    });

    it('should return 400 for missing required toDate', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/performance?fromDate=2024-01-01')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('toDate');
    });

    it('should return 400 for invalid categoryId UUID', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/performance?fromDate=2024-01-01&toDate=2024-12-31&categoryId=invalid-uuid')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/categoryId|uuid/i);
    });
  });

  describe('Authentication Requirements', () => {
    const validQuery = 'fromDate=2024-01-01&toDate=2024-12-31';

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/performance?${validQuery}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget/performance?${validQuery}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });
});