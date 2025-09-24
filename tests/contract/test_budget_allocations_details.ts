/**
 * Contract Test: GET /api/budget-allocations/{allocationId}
 * Task: T104 - Budget allocation details endpoint contract validation
 *
 * This test validates the budget allocation details API contract against the OpenAPI specification.
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

describe('Contract Test: GET /api/budget-allocations/{allocationId}', () => {
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

  describe('Valid Budget Allocation Details Request', () => {
    it('should return 200 with budget allocation details', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id', mockAllocationId);
      expect(response.body).toHaveProperty('incomeEvent');
      expect(response.body).toHaveProperty('budgetCategory');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('percentage');
      expect(response.body).toHaveProperty('spentAmount');
      expect(response.body).toHaveProperty('remainingAmount');
      expect(response.body).toHaveProperty('createdAt');

      // Validate income event structure
      const { incomeEvent } = response.body;
      expect(incomeEvent).toHaveProperty('id');
      expect(incomeEvent).toHaveProperty('name');
      expect(incomeEvent).toHaveProperty('amount');
      expect(incomeEvent).toHaveProperty('scheduledDate');

      // Validate budget category structure
      const { budgetCategory } = response.body;
      expect(budgetCategory).toHaveProperty('id');
      expect(budgetCategory).toHaveProperty('name');
      expect(budgetCategory).toHaveProperty('color');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.amount).toBe('number');
      expect(typeof response.body.percentage).toBe('number');
      expect(typeof response.body.spentAmount).toBe('number');
      expect(typeof response.body.remainingAmount).toBe('number');
      expect(typeof response.body.createdAt).toBe('string');

      expect(typeof incomeEvent.id).toBe('string');
      expect(typeof incomeEvent.name).toBe('string');
      expect(typeof incomeEvent.amount).toBe('number');
      expect(typeof incomeEvent.scheduledDate).toBe('string');

      expect(typeof budgetCategory.id).toBe('string');
      expect(typeof budgetCategory.name).toBe('string');
      expect(typeof budgetCategory.color).toBe('string');

      // Validate constraints
      expect(response.body.amount).toBeGreaterThanOrEqual(0);
      expect(response.body.percentage).toBeGreaterThanOrEqual(0);
      expect(response.body.percentage).toBeLessThanOrEqual(100);
      expect(response.body.spentAmount).toBeGreaterThanOrEqual(0);
      expect(budgetCategory.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should calculate remaining amount correctly', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .expect(200);

      const { amount, spentAmount, remainingAmount } = response.body;
      expect(remainingAmount).toBe(amount - spentAmount);
    });

    it('should return valid date formats', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .expect(200);

      // Validate ISO date formats
      expect(response.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.incomeEvent.scheduledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Invalid Budget Allocation Requests', () => {
    it('should return 404 for non-existent allocation', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${nonExistentAllocationId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.error).toBe('Budget allocation not found');
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
          .get(`/api/budget-allocations/${invalidId}`)
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
        .get(`/api/budget-allocations/${mockAllocationId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', 'InvalidFormat token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should include security headers', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/budget-allocations/${mockAllocationId}`)
        .set('Authorization', mockToken)
        .expect(200);

      // Common security headers should be present
      // These may vary based on server configuration
    });
  });
});