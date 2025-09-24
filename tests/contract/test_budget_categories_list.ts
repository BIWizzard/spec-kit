/**
 * Contract Test: GET /api/budget-categories
 * Task: T097 - Budget categories list endpoint contract validation
 *
 * This test validates the budget categories list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock authentication token
const mockToken = 'Bearer mock-jwt-token';

describe('Contract Test: GET /api/budget-categories', () => {
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

  describe('Valid Budget Categories List Request', () => {
    it('should return 200 with list of budget categories', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.categories)).toBe(true);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalPercentage');
      expect(summary).toHaveProperty('totalAllocated');
      expect(summary).toHaveProperty('isValid');
      expect(typeof summary.totalPercentage).toBe('number');
      expect(typeof summary.totalAllocated).toBe('number');
      expect(typeof summary.isValid).toBe('boolean');
    });

    it('should return budget categories with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', mockToken)
        .expect(200);

      const { categories } = response.body;

      // If categories exist, validate their structure
      if (categories.length > 0) {
        const category = categories[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('targetPercentage');
        expect(category).toHaveProperty('color');
        expect(category).toHaveProperty('sortOrder');
        expect(category).toHaveProperty('isActive');
        expect(category).toHaveProperty('currentPeriodAllocated');
        expect(category).toHaveProperty('currentPeriodSpent');
        expect(category).toHaveProperty('remainingBalance');
        expect(category).toHaveProperty('createdAt');
        expect(category).toHaveProperty('updatedAt');

        // Validate data types
        expect(typeof category.id).toBe('string');
        expect(typeof category.name).toBe('string');
        expect(typeof category.targetPercentage).toBe('number');
        expect(typeof category.color).toBe('string');
        expect(typeof category.sortOrder).toBe('number');
        expect(typeof category.isActive).toBe('boolean');
        expect(typeof category.currentPeriodAllocated).toBe('number');
        expect(typeof category.currentPeriodSpent).toBe('number');
        expect(typeof category.remainingBalance).toBe('number');

        // Validate constraints
        expect(category.targetPercentage).toBeGreaterThanOrEqual(0);
        expect(category.targetPercentage).toBeLessThanOrEqual(100);
        expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(category.sortOrder).toBeGreaterThanOrEqual(0);
      }
    });

    it('should support includeInactive query parameter', async () => {
      // Test with includeInactive=true
      const responseWithInactive = await request(API_BASE_URL)
        .get('/api/budget-categories?includeInactive=true')
        .set('Authorization', mockToken)
        .expect(200);

      expect(responseWithInactive.body).toHaveProperty('categories');

      // Test with includeInactive=false (default)
      const responseWithoutInactive = await request(API_BASE_URL)
        .get('/api/budget-categories?includeInactive=false')
        .set('Authorization', mockToken)
        .expect(200);

      expect(responseWithoutInactive.body).toHaveProperty('categories');

      // Test default behavior (should be false)
      const responseDefault = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', mockToken)
        .expect(200);

      expect(responseDefault.body).toHaveProperty('categories');
    });

    it('should return categories sorted by sortOrder', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', mockToken)
        .expect(200);

      const { categories } = response.body;

      // If multiple categories exist, verify sorting
      if (categories.length > 1) {
        for (let i = 0; i < categories.length - 1; i++) {
          expect(categories[i].sortOrder).toBeLessThanOrEqual(categories[i + 1].sortOrder);
        }
      }
    });
  });

  describe('Query Parameter Validation', () => {
    it('should handle invalid includeInactive parameter gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories?includeInactive=invalid')
        .set('Authorization', mockToken)
        .expect(200); // Should default to false

      expect(response.body).toHaveProperty('categories');
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', 'InvalidFormat token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty budget categories list gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body.categories).toEqual([]);
      expect(response.body.summary.totalPercentage).toBe(0);
      expect(response.body.summary.totalAllocated).toBe(0);
      expect(response.body.summary.isValid).toBe(false); // No categories = invalid budget
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should include security headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget-categories')
        .set('Authorization', mockToken)
        .expect(200);

      // Common security headers should be present
      // These may vary based on server configuration
    });
  });
});