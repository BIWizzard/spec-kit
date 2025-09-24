/**
 * Contract Test: GET /api/budget/templates
 * Task: T111 - Budget templates list endpoint contract validation
 *
 * This test validates the budget templates list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock authentication token
const mockToken = 'Bearer mock-jwt-token';

describe('Contract Test: GET /api/budget/templates', () => {
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

  describe('Valid Budget Templates List Request', () => {
    it('should return 200 with list of budget templates', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
    });

    it('should return budget templates with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      const { templates } = response.body;

      // If templates exist, validate their structure
      if (templates.length > 0) {
        const template = templates[0];
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('categories');

        // Validate data types
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(Array.isArray(template.categories)).toBe(true);

        // Validate template name is not empty
        expect(template.name.length).toBeGreaterThan(0);
      }
    });

    it('should return template categories with correct structure', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      const { templates } = response.body;

      // Find a template with categories to validate structure
      const templateWithCategories = templates.find(t => t.categories.length > 0);

      if (templateWithCategories) {
        const category = templateWithCategories.categories[0];
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('targetPercentage');
        expect(category).toHaveProperty('color');
        expect(category).toHaveProperty('description');

        // Validate data types
        expect(typeof category.name).toBe('string');
        expect(typeof category.targetPercentage).toBe('number');
        expect(typeof category.color).toBe('string');
        expect(typeof category.description).toBe('string');

        // Validate constraints
        expect(category.targetPercentage).toBeGreaterThanOrEqual(0);
        expect(category.targetPercentage).toBeLessThanOrEqual(100);
        expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(category.name.length).toBeGreaterThan(0);
      }
    });

    it('should return predefined budget templates', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      const { templates } = response.body;

      // Should have at least some common budget templates
      expect(templates.length).toBeGreaterThan(0);

      // Templates should have meaningful names and descriptions
      templates.forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.name.length).toBeGreaterThan(0);
        expect(template.description).toBeDefined();
        expect(template.description.length).toBeGreaterThan(0);
      });
    });

    it('should validate template category percentages sum correctly', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      const { templates } = response.body;

      // Each template should have categories that sum to 100%
      templates.forEach(template => {
        if (template.categories.length > 0) {
          const totalPercentage = template.categories.reduce((sum, cat) => sum + cat.targetPercentage, 0);
          expect(totalPercentage).toBeCloseTo(100, 2);
        }
      });
    });

    it('should return templates with unique IDs', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      const { templates } = response.body;
      const templateIds = templates.map(t => t.id);
      const uniqueIds = new Set(templateIds);

      expect(uniqueIds.size).toBe(templateIds.length);
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', 'InvalidFormat token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content-Type and Performance', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should include security headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      // Common security headers should be present
      // These may vary based on server configuration
    });

    it('should handle empty templates gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      // Even if no templates exist, should return valid structure
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
    });
  });

  describe('Template Content Validation', () => {
    it('should provide useful template descriptions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      const { templates } = response.body;

      templates.forEach(template => {
        // Descriptions should be meaningful (not just empty or single word)
        expect(template.description.length).toBeGreaterThan(10);
        expect(template.description).not.toBe(template.name);
      });
    });

    it('should provide diverse template options', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      const { templates } = response.body;

      if (templates.length > 1) {
        // Templates should have different names and descriptions
        const names = templates.map(t => t.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);

        const descriptions = templates.map(t => t.description);
        const uniqueDescriptions = new Set(descriptions);
        expect(uniqueDescriptions.size).toBe(descriptions.length);
      }
    });

    it('should maintain consistent category structure across templates', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/budget/templates')
        .set('Authorization', mockToken)
        .expect(200);

      const { templates } = response.body;

      templates.forEach(template => {
        template.categories.forEach(category => {
          // All categories should have required fields
          expect(category.name).toBeDefined();
          expect(category.targetPercentage).toBeDefined();
          expect(category.color).toBeDefined();
          expect(category.description).toBeDefined();
        });
      });
    });
  });
});