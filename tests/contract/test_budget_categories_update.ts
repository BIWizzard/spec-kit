/**
 * Contract Test: PUT /api/budget-categories/{categoryId}
 * Task: T100 - Budget category update endpoint contract validation
 *
 * This test validates the budget category update API contract against the OpenAPI specification.
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

describe('Contract Test: PUT /api/budget-categories/{categoryId}', () => {
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

  describe('Valid Budget Category Updates', () => {
    const fullUpdateRequest = {
      name: 'Updated Essential Needs',
      targetPercentage: 55.75,
      color: '#FF5733',
      sortOrder: 2,
      isActive: true
    };

    it('should return 200 with updated budget category', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send(fullUpdateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id', mockCategoryId);
      expect(response.body).toHaveProperty('name', fullUpdateRequest.name);
      expect(response.body).toHaveProperty('targetPercentage', fullUpdateRequest.targetPercentage);
      expect(response.body).toHaveProperty('color', fullUpdateRequest.color);
      expect(response.body).toHaveProperty('sortOrder', fullUpdateRequest.sortOrder);
      expect(response.body).toHaveProperty('isActive', fullUpdateRequest.isActive);
      expect(response.body).toHaveProperty('currentPeriodAllocated');
      expect(response.body).toHaveProperty('currentPeriodSpent');
      expect(response.body).toHaveProperty('remainingBalance');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

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
    });

    it('should handle partial updates correctly', async () => {
      // Test updating only name
      const nameUpdateResponse = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ name: 'New Name Only' })
        .expect(200);

      expect(nameUpdateResponse.body.name).toBe('New Name Only');

      // Test updating only targetPercentage
      const percentageUpdateResponse = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ targetPercentage: 33.33 })
        .expect(200);

      expect(percentageUpdateResponse.body.targetPercentage).toBe(33.33);

      // Test updating only color
      const colorUpdateResponse = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ color: '#00FF00' })
        .expect(200);

      expect(colorUpdateResponse.body.color).toBe('#00FF00');

      // Test updating only sortOrder
      const sortUpdateResponse = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ sortOrder: 5 })
        .expect(200);

      expect(sortUpdateResponse.body.sortOrder).toBe(5);

      // Test updating only isActive
      const activeUpdateResponse = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ isActive: false })
        .expect(200);

      expect(activeUpdateResponse.body.isActive).toBe(false);
    });

    it('should handle decimal percentages correctly', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ targetPercentage: 22.789 })
        .expect(200);

      expect(response.body.targetPercentage).toBe(22.789);
    });

    it('should update updatedAt timestamp', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ name: 'Timestamp Test' })
        .expect(200);

      expect(response.body.updatedAt).toBeDefined();
      // updatedAt should be more recent than createdAt for updates
      const createdAt = new Date(response.body.createdAt);
      const updatedAt = new Date(response.body.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    });
  });

  describe('Invalid Budget Category Updates', () => {
    it('should return 400 for invalid name constraints', async () => {
      const invalidNameRequests = [
        { name: '' }, // Empty name
        { name: 'a'.repeat(101) } // Name too long (max 100)
      ];

      for (const request of invalidNameRequests) {
        const response = await request(API_BASE_URL)
          .put(`/api/budget-categories/${mockCategoryId}`)
          .set('Authorization', mockToken)
          .send(request)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('name');
      }
    });

    it('should return 400 for invalid targetPercentage constraints', async () => {
      const invalidPercentageRequests = [
        { targetPercentage: 0 }, // Below minimum (0.01)
        { targetPercentage: -5.0 }, // Negative
        { targetPercentage: 100.01 }, // Above maximum (100)
        { targetPercentage: 150.0 } // Way above maximum
      ];

      for (const request of invalidPercentageRequests) {
        const response = await request(API_BASE_URL)
          .put(`/api/budget-categories/${mockCategoryId}`)
          .set('Authorization', mockToken)
          .send(request)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('targetPercentage');
      }
    });

    it('should return 400 for invalid color format', async () => {
      const invalidColorRequests = [
        { color: 'blue' }, // Not hex format
        { color: '#12345' }, // Too short
        { color: '#1234567' }, // Too long
        { color: '#GGGGGG' } // Invalid hex characters
      ];

      for (const request of invalidColorRequests) {
        const response = await request(API_BASE_URL)
          .put(`/api/budget-categories/${mockCategoryId}`)
          .set('Authorization', mockToken)
          .send(request)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('color');
      }
    });

    it('should return 400 for invalid sortOrder', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ sortOrder: -1 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('sortOrder');
    });

    it('should return 400 if total percentages would exceed 100%', async () => {
      // This test assumes the API validates total percentage allocation
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ targetPercentage: 101.0 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/percentage|budget|exceed/i);
    });

    it('should return 400 for invalid data types', async () => {
      const invalidTypeRequests = [
        { name: 123 }, // Number instead of string
        { targetPercentage: 'invalid' }, // String instead of number
        { color: 123 }, // Number instead of string
        { sortOrder: 'invalid' }, // String instead of number
        { isActive: 'yes' } // String instead of boolean
      ];

      for (const request of invalidTypeRequests) {
        const response = await request(API_BASE_URL)
          .put(`/api/budget-categories/${mockCategoryId}`)
          .set('Authorization', mockToken)
          .send(request)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Non-existent Category Handling', () => {
    it('should return 404 for non-existent category', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${nonExistentCategoryId}`)
        .set('Authorization', mockToken)
        .send({ name: 'Updated Name' })
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
          .put(`/api/budget-categories/${invalidId}`)
          .set('Authorization', mockToken)
          .send({ name: 'Test Update' })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid|uuid|format/i);
      }
    });
  });

  describe('Duplicate Name Handling', () => {
    it('should return 409 when updating to existing category name', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ name: 'Existing Category Name' })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/exists|duplicate|name/i);
    });

    it('should be case-insensitive for name uniqueness', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ name: 'EXISTING CATEGORY NAME' })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.error).toMatch(/exists|duplicate|name/i);
    });

    it('should allow updating category to its own name (no change)', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ name: 'Same Name' })
        .expect(200);

      expect(response.body.name).toBe('Same Name');
    });
  });

  describe('Authentication Requirements', () => {
    const validUpdate = { name: 'Test Update' };

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .send(validUpdate)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(validUpdate)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });

  describe('Empty Request Body', () => {
    it('should handle empty request body gracefully', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({})
        .expect('Content-Type', /json/)
        .expect(200);

      // Should return the category unchanged
      expect(response.body).toHaveProperty('id', mockCategoryId);
    });
  });

  describe('Content-Type Requirements', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send('name=TestUpdate')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .put(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .send({ name: 'Test Update' })
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });
  });
});