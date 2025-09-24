/**
 * Contract Test: PUT /api/budget-allocations/{allocationId}
 * Task: T105 - Budget allocation update endpoint contract validation
 *
 * This test validates the budget allocation update API contract against the OpenAPI specification.
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
const mockAllocationId = '123e4567-e89b-12d3-a456-426614174000';
const nonExistentAllocationId = '987fcdeb-51a2-43d1-9f8e-123456789abc';

describe('Contract Test: PUT /api/budget-allocations/{allocationId}', () => {
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

  describe('Valid Budget Allocation Updates', () => {
    it('should return 200 with updated allocation when updating amount', async () => {
      const updateRequest = {
        amount: 250.75
      };

      const response = await request(API_BASE_URL)
        .put(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockAllocationId);
      expect(response.body).toHaveProperty('amount', updateRequest.amount);
      expect(response.body).toHaveProperty('percentage');
      expect(response.body).toHaveProperty('spentAmount');
      expect(response.body).toHaveProperty('remainingAmount');
    });

    it('should return 200 with updated allocation when updating percentage', async () => {
      const updateRequest = {
        percentage: 25.5
      };

      const response = await request(API_BASE_URL)
        .put(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .send(updateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockAllocationId);
      expect(response.body).toHaveProperty('percentage', updateRequest.percentage);
      expect(response.body).toHaveProperty('amount');
    });

    it('should calculate amount from percentage correctly', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .send({ percentage: 50.0 })
        .expect(200);

      expect(response.body.percentage).toBe(50.0);
      // Amount should be calculated based on income event amount
      expect(typeof response.body.amount).toBe('number');
      expect(response.body.amount).toBeGreaterThan(0);
    });
  });

  describe('Invalid Budget Allocation Updates', () => {
    it('should return 400 for invalid amount', async () => {
      const invalidAmounts = [
        { amount: -10.0 }, // Negative
        { amount: 'invalid' } // Not a number
      ];

      for (const invalidRequest of invalidAmounts) {
        const response = await request(API_BASE_URL)
          .put(`/api/budget-allocations/${mockAllocationId}`)
          .set('Authorization', mockToken)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid percentage', async () => {
      const invalidPercentages = [
        { percentage: -5.0 }, // Negative
        { percentage: 150.0 }, // Over 100
        { percentage: 'invalid' } // Not a number
      ];

      for (const invalidRequest of invalidPercentages) {
        const response = await request(API_BASE_URL)
          .put(`/api/budget-allocations/${mockAllocationId}`)
          .set('Authorization', mockToken)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 when allocation exceeds income amount', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .send({ amount: 999999.99 }) // Very large amount
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/exceed|income|amount/i);
    });
  });

  describe('Non-existent Allocation Handling', () => {
    it('should return 404 for non-existent allocation', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-allocations/${nonExistentAllocationId}`)
        .set('Authorization', mockToken)
        .send({ amount: 100.0 })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Budget allocation not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidIds = [
        'not-a-uuid',
        '12345',
        'invalid-uuid-format'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .put(`/api/budget-allocations/${invalidId}`)
          .set('Authorization', mockToken)
          .send({ amount: 100.0 })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid|uuid|format/i);
      }
    });
  });

  describe('Authentication Requirements', () => {
    const validUpdate = { amount: 150.0 };

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-allocations/${mockAllocationId}`)
        .send(validUpdate)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(validUpdate)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });
});
