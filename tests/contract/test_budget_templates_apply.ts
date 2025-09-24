/**
 * Contract Test: POST /api/budget/templates
 * Task: T112 - Budget template application endpoint contract validation
 *
 * This test validates the budget template application API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock authentication token
const mockToken = 'Bearer mock-jwt-token';

// Mock template IDs for testing
const mockTemplateId = '50-30-20-rule';
const mockTemplateIdWithCustomization = 'zero-based-budgeting';
const nonExistentTemplateId = 'non-existent-template';

describe('Contract Test: POST /api/budget/templates', () => {
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

  describe('Valid Budget Template Application', () => {
    const validApplicationRequest = {
      templateId: mockTemplateId
    };

    it('should return 201 with created budget categories', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send(validApplicationRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('createdCategories');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.createdCategories)).toBe(true);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalCategories');
      expect(summary).toHaveProperty('totalPercentage');
      expect(typeof summary.totalCategories).toBe('number');
      expect(typeof summary.totalPercentage).toBe('number');

      // Total percentage should be 100%
      expect(summary.totalPercentage).toBeCloseTo(100, 2);
    });

    it('should create categories with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send(validApplicationRequest)
        .expect(201);

      const { createdCategories } = response.body;
      expect(createdCategories.length).toBeGreaterThan(0);

      const category = createdCategories[0];
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('targetPercentage');
      expect(category).toHaveProperty('color');
      expect(category).toHaveProperty('sortOrder');
      expect(category).toHaveProperty('isActive', true);
      expect(category).toHaveProperty('currentPeriodAllocated', 0);
      expect(category).toHaveProperty('currentPeriodSpent', 0);
      expect(category).toHaveProperty('remainingBalance', 0);
      expect(category).toHaveProperty('createdAt');
      expect(category).toHaveProperty('updatedAt');

      // Validate data types and constraints
      expect(typeof category.id).toBe('string');
      expect(typeof category.name).toBe('string');
      expect(typeof category.targetPercentage).toBe('number');
      expect(typeof category.color).toBe('string');
      expect(typeof category.sortOrder).toBe('number');

      expect(category.targetPercentage).toBeGreaterThanOrEqual(0);
      expect(category.targetPercentage).toBeLessThanOrEqual(100);
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(category.sortOrder).toBeGreaterThanOrEqual(0);
    });

    it('should apply template with customizations', async () => {
      const customizationRequest = {
        templateId: mockTemplateIdWithCustomization,
        customizations: {
          'Essential Expenses': 60.0,
          'Savings': 25.0,
          'Entertainment': 15.0
        }
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send(customizationRequest)
        .expect(201);

      const { createdCategories, summary } = response.body;
      expect(createdCategories.length).toBeGreaterThan(0);

      // Should use customized percentages
      expect(summary.totalPercentage).toBeCloseTo(100, 2);

      // Verify at least one category uses customized percentage
      const customizedCategories = createdCategories.filter(cat =>
        Object.values(customizationRequest.customizations).includes(cat.targetPercentage)
      );
      expect(customizedCategories.length).toBeGreaterThan(0);
    });

    it('should maintain proper sort order for created categories', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send(validApplicationRequest)
        .expect(201);

      const { createdCategories } = response.body;

      // Categories should have proper sort order
      createdCategories.forEach((category, index) => {
        expect(category.sortOrder).toBeGreaterThanOrEqual(0);
      });

      // No two categories should have the same sort order
      const sortOrders = createdCategories.map(cat => cat.sortOrder);
      const uniqueSortOrders = new Set(sortOrders);
      expect(uniqueSortOrders.size).toBe(sortOrders.length);
    });

    it('should validate summary calculations', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send(validApplicationRequest)
        .expect(201);

      const { createdCategories, summary } = response.body;

      expect(summary.totalCategories).toBe(createdCategories.length);

      const calculatedTotal = createdCategories.reduce((sum, cat) => sum + cat.targetPercentage, 0);
      expect(summary.totalPercentage).toBeCloseTo(calculatedTotal, 2);
    });
  });

  describe('Invalid Budget Template Application', () => {
    it('should return 400 for missing templateId', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('templateId');
    });

    it('should return 400 for non-existent template', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send({ templateId: nonExistentTemplateId })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.message).toMatch(/template.*not.*found/i);
    });

    it('should return 400 when categories already exist', async () => {
      // First application should succeed
      await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send({ templateId: mockTemplateId })
        .expect(201);

      // Second application should fail
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send({ templateId: mockTemplateId })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/categories.*already.*exist/i);
    });

    it('should return 400 for invalid customization percentages', async () => {
      const invalidCustomizations = [
        {
          templateId: mockTemplateId,
          customizations: {
            'Category1': -10.0 // Negative percentage
          }
        },
        {
          templateId: mockTemplateId,
          customizations: {
            'Category1': 150.0 // Over 100%
          }
        },
        {
          templateId: mockTemplateId,
          customizations: {
            'Category1': 'invalid' // Not a number
          }
        }
      ];

      for (const invalidRequest of invalidCustomizations) {
        const response = await request(API_BASE_URL)
          .post('/api/budget/templates')
          .set('Authorization', mockToken)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toMatch(/percentage|customization/i);
      }
    });

    it('should return 400 when customizations do not sum to 100%', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send({
          templateId: mockTemplateId,
          customizations: {
            'Category1': 30.0,
            'Category2': 30.0
            // Total: 60% (should be 100%)
          }
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/100|percentage|sum/i);
    });

    it('should return 400 for invalid templateId type', async () => {
      const invalidTemplateIds = [
        { templateId: 123 }, // Number instead of string
        { templateId: null }, // Null
        { templateId: '' } // Empty string
      ];

      for (const invalidRequest of invalidTemplateIds) {
        const response = await request(API_BASE_URL)
          .post('/api/budget/templates')
          .set('Authorization', mockToken)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Authentication Requirements', () => {
    const validRequest = { templateId: mockTemplateId };

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });

  describe('Content-Type Requirements', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send('templateId=test-template')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send({ templateId: mockTemplateId })
        .expect('Content-Type', /application\/json/)
        .expect(201);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle concurrent template applications gracefully', async () => {
      // Simulate race condition
      const promises = [
        request(API_BASE_URL)
          .post('/api/budget/templates')
          .set('Authorization', mockToken)
          .send({ templateId: mockTemplateId }),
        request(API_BASE_URL)
          .post('/api/budget/templates')
          .set('Authorization', mockToken)
          .send({ templateId: mockTemplateId })
      ];

      const responses = await Promise.all(promises);

      // One should succeed (201), one should fail with categories already exist (400)
      const statuses = responses.map(r => r.status);
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);
    });

    it('should create categories that can be updated later', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget/templates')
        .set('Authorization', mockToken)
        .send({ templateId: mockTemplateId })
        .expect(201);

      // Categories should be created with proper IDs for future updates
      const { createdCategories } = response.body;
      createdCategories.forEach(category => {
        expect(category.id).toBeDefined();
        expect(typeof category.id).toBe('string');
        expect(category.id.length).toBeGreaterThan(0);
      });
    });
  });
});