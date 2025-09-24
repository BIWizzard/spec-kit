/**
 * Contract Test: POST /api/budget-categories/validate-percentages
 * Task: T102 - Budget percentages validation endpoint contract validation
 *
 * This test validates the budget percentages validation API contract against the OpenAPI specification.
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
const mockCategoryId1 = '123e4567-e89b-12d3-a456-426614174000';
const mockCategoryId2 = '456e7890-e12b-34d5-b789-012345678901';
const mockCategoryId3 = '789fabcd-e34f-56g7-h890-123456789012';

describe('Contract Test: POST /api/budget-categories/validate-percentages', () => {
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

  describe('Valid Percentage Validation (Exactly 100%)', () => {
    const validPercentagesRequest = {
      categories: [
        {
          id: mockCategoryId1,
          targetPercentage: 50.0
        },
        {
          id: mockCategoryId2,
          targetPercentage: 30.0
        },
        {
          id: mockCategoryId3,
          targetPercentage: 20.0
        }
      ]
    };

    it('should return 200 with valid=true for percentages totaling 100%', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(validPercentagesRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('isValid', true);
      expect(response.body).toHaveProperty('totalPercentage', 100.0);
      expect(response.body).toHaveProperty('difference', 0.0);
      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);

      // For valid percentages, suggestions should be empty
      expect(response.body.suggestions).toHaveLength(0);
    });

    it('should handle decimal precision correctly', async () => {
      const preciseRequest = {
        categories: [
          {
            id: mockCategoryId1,
            targetPercentage: 33.33
          },
          {
            id: mockCategoryId2,
            targetPercentage: 33.33
          },
          {
            id: mockCategoryId3,
            targetPercentage: 33.34
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(preciseRequest)
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.totalPercentage).toBe(100.0);
      expect(response.body.difference).toBe(0.0);
    });

    it('should accept single category with 100%', async () => {
      const singleCategoryRequest = {
        categories: [
          {
            id: mockCategoryId1,
            targetPercentage: 100.0
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(singleCategoryRequest)
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.totalPercentage).toBe(100.0);
      expect(response.body.difference).toBe(0.0);
    });
  });

  describe('Invalid Percentage Validation (Not 100%)', () => {
    it('should return 200 with valid=false for percentages under 100%', async () => {
      const underPercentagesRequest = {
        categories: [
          {
            id: mockCategoryId1,
            targetPercentage: 40.0
          },
          {
            id: mockCategoryId2,
            targetPercentage: 30.0
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(underPercentagesRequest)
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.totalPercentage).toBe(70.0);
      expect(response.body.difference).toBe(-30.0); // 70 - 100 = -30
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions.length).toBeGreaterThan(0);
    });

    it('should return 200 with valid=false for percentages over 100%', async () => {
      const overPercentagesRequest = {
        categories: [
          {
            id: mockCategoryId1,
            targetPercentage: 60.0
          },
          {
            id: mockCategoryId2,
            targetPercentage: 50.0
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(overPercentagesRequest)
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.totalPercentage).toBe(110.0);
      expect(response.body.difference).toBe(10.0); // 110 - 100 = 10
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions.length).toBeGreaterThan(0);
    });

    it('should provide helpful suggestions for invalid percentages', async () => {
      const invalidRequest = {
        categories: [
          {
            id: mockCategoryId1,
            targetPercentage: 45.0
          },
          {
            id: mockCategoryId2,
            targetPercentage: 25.0
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(invalidRequest)
        .expect(200);

      const { suggestions } = response.body;
      expect(suggestions.length).toBeGreaterThan(0);

      // Validate suggestion structure
      const suggestion = suggestions[0];
      expect(suggestion).toHaveProperty('categoryId');
      expect(suggestion).toHaveProperty('currentPercentage');
      expect(suggestion).toHaveProperty('suggestedPercentage');

      // Validate data types
      expect(typeof suggestion.categoryId).toBe('string');
      expect(typeof suggestion.currentPercentage).toBe('number');
      expect(typeof suggestion.suggestedPercentage).toBe('number');

      // Validate constraints
      expect(suggestion.currentPercentage).toBeGreaterThanOrEqual(0);
      expect(suggestion.currentPercentage).toBeLessThanOrEqual(100);
      expect(suggestion.suggestedPercentage).toBeGreaterThanOrEqual(0);
      expect(suggestion.suggestedPercentage).toBeLessThanOrEqual(100);
    });

    it('should handle edge case of 0% total', async () => {
      const zeroPercentageRequest = {
        categories: [
          {
            id: mockCategoryId1,
            targetPercentage: 0.0
          },
          {
            id: mockCategoryId2,
            targetPercentage: 0.0
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(zeroPercentageRequest)
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.totalPercentage).toBe(0.0);
      expect(response.body.difference).toBe(-100.0);
    });
  });

  describe('Invalid Request Data', () => {
    it('should return 400 for missing categories array', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('categories');
    });

    it('should return 400 for empty categories array', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send({ categories: [] })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('categories');
    });

    it('should return 400 for categories with missing required fields', async () => {
      const invalidRequests = [
        {
          categories: [
            { targetPercentage: 50.0 } // Missing id
          ]
        },
        {
          categories: [
            { id: mockCategoryId1 } // Missing targetPercentage
          ]
        },
        {
          categories: [
            {} // Missing both fields
          ]
        }
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/budget-categories/validate-percentages')
          .set('Authorization', mockToken)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidUuidRequest = {
        categories: [
          {
            id: 'not-a-valid-uuid',
            targetPercentage: 50.0
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(invalidUuidRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/uuid|id/i);
    });

    it('should return 400 for invalid percentage values', async () => {
      const invalidPercentageRequests = [
        {
          categories: [
            {
              id: mockCategoryId1,
              targetPercentage: -5.0 // Negative
            }
          ]
        },
        {
          categories: [
            {
              id: mockCategoryId1,
              targetPercentage: 150.0 // Over 100
            }
          ]
        },
        {
          categories: [
            {
              id: mockCategoryId1,
              targetPercentage: 'invalid' // Not a number
            }
          ]
        }
      ];

      for (const invalidRequest of invalidPercentageRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/budget-categories/validate-percentages')
          .set('Authorization', mockToken)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toMatch(/percentage/i);
      }
    });

    it('should return 400 for duplicate category IDs', async () => {
      const duplicateIdRequest = {
        categories: [
          {
            id: mockCategoryId1,
            targetPercentage: 50.0
          },
          {
            id: mockCategoryId1, // Duplicate
            targetPercentage: 30.0
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(duplicateIdRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/duplicate|id/i);
    });
  });

  describe('Authentication Requirements', () => {
    const validRequest = {
      categories: [
        {
          id: mockCategoryId1,
          targetPercentage: 100.0
        }
      ]
    };

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
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
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send('categories[0][id]=test&categories[0][targetPercentage]=50')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send({
          categories: [
            {
              id: mockCategoryId1,
              targetPercentage: 100.0
            }
          ]
        })
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of categories efficiently', async () => {
      const manyCategories = Array.from({ length: 20 }, (_, i) => ({
        id: `${mockCategoryId1.slice(0, -3)}${String(i).padStart(3, '0')}`,
        targetPercentage: 5.0
      }));

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send({ categories: manyCategories })
        .expect(200);

      expect(response.body.totalPercentage).toBe(100.0);
      expect(response.body.isValid).toBe(true);
    });

    it('should handle very small percentage values', async () => {
      const smallPercentageRequest = {
        categories: [
          {
            id: mockCategoryId1,
            targetPercentage: 0.01
          },
          {
            id: mockCategoryId2,
            targetPercentage: 99.99
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories/validate-percentages')
        .set('Authorization', mockToken)
        .send(smallPercentageRequest)
        .expect(200);

      expect(response.body.totalPercentage).toBe(100.0);
      expect(response.body.isValid).toBe(true);
    });
  });
});