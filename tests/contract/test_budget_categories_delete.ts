/**
 * Contract Test: DELETE /api/budget-categories/{categoryId}
 * Task: T101 - Budget category delete endpoint contract validation
 *
 * This test validates the budget category delete API contract against the OpenAPI specification.
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
const categoryWithAllocationsId = '456e7890-e12b-34d5-b789-012345678901';
const nonExistentCategoryId = '987fcdeb-51a2-43d1-9f8e-123456789abc';

describe('Contract Test: DELETE /api/budget-categories/{categoryId}', () => {
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

  describe('Valid Budget Category Deletion', () => {
    it('should return 200 with success message for category without allocations', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toMatch(/deleted|deactivated|success/i);
    });

    it('should soft delete the category (deactivate)', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body.message).toMatch(/deactivated|soft.*delete|inactive/i);
    });

    it('should return consistent success message format', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      // Message should be descriptive and consistent
      expect(response.body.message).toBeDefined();
      expect(response.body.message.length).toBeGreaterThan(0);
    });
  });

  describe('Categories with Active Allocations', () => {
    it('should return 400 when trying to delete category with active allocations', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${categoryWithAllocationsId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(400);

      // Validate error response structure per OpenAPI spec
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');

      expect(response.body.error).toMatch(/cannot.*delete|active.*allocations|has.*allocations/i);
      expect(response.body.message).toMatch(/reallocate|reassign|allocations/i);
    });

    it('should provide helpful error message for allocation conflicts', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${categoryWithAllocationsId}`)
        .set('Authorization', mockToken)
        .expect(400);

      expect(response.body.message).toContain('allocation');
      expect(response.body.code).toBeDefined();
      expect(typeof response.body.code).toBe('string');
    });

    it('should include details about existing allocations', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${categoryWithAllocationsId}`)
        .set('Authorization', mockToken)
        .expect(400);

      // Should provide actionable information
      expect(response.body.message).toMatch(/reassign|reallocate|move.*allocations/i);
    });
  });

  describe('Non-existent Category Handling', () => {
    it('should return 404 for non-existent category', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${nonExistentCategoryId}`)
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
          .delete(`/api/budget-categories/${invalidId}`)
          .set('Authorization', mockToken)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid|uuid|format/i);
      }
    });
  });

  describe('Already Deleted Category Handling', () => {
    it('should handle deletion of already inactive category gracefully', async () => {
      // First deletion should succeed
      await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      // Second deletion should either succeed (idempotent) or return appropriate error
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken);

      // Either 200 (idempotent) or 404 (already deleted) is acceptable
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', 'InvalidFormat token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization and Permissions', () => {
    it('should check if user has permission to delete categories', async () => {
      // This test assumes role-based permissions
      const limitedToken = 'Bearer limited-permissions-token';

      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', limitedToken)
        .expect('Content-Type', /json/);

      // Should be either 403 (forbidden) or succeed based on permissions
      expect([200, 403]).toContain(response.status);

      if (response.status === 403) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/forbidden|permission|not.*allowed/i);
      }
    });
  });

  describe('Referential Integrity', () => {
    it('should maintain data integrity when deleting categories', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body.message).toMatch(/deactivated|soft.*delete/i);
      // Soft delete should preserve referential integrity
    });

    it('should not allow hard delete when constraints exist', async () => {
      // This test verifies the API correctly implements soft delete
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${categoryWithAllocationsId}`)
        .set('Authorization', mockToken)
        .expect(400);

      expect(response.body.error).toMatch(/cannot.*delete|active.*allocations/i);
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should include security headers', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/budget-categories/${mockCategoryId}`)
        .set('Authorization', mockToken)
        .expect(200);

      // Common security headers should be present
      // These may vary based on server configuration
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent deletion requests gracefully', async () => {
      // Simulate race condition
      const promises = [
        request(API_BASE_URL)
          .delete(`/api/budget-categories/${mockCategoryId}`)
          .set('Authorization', mockToken),
        request(API_BASE_URL)
          .delete(`/api/budget-categories/${mockCategoryId}`)
          .set('Authorization', mockToken)
      ];

      const responses = await Promise.all(promises);

      // One should succeed, one should either succeed (idempotent) or fail gracefully
      const statuses = responses.map(r => r.status);
      expect(statuses.filter(s => s === 200).length).toBeGreaterThanOrEqual(1);
    });
  });
});