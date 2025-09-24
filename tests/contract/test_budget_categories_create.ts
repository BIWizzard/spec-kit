/**
 * Contract Test: POST /api/budget-categories
 * Task: T098 - Budget categories create endpoint contract validation
 *
 * This test validates the budget categories create API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock authentication token
const mockToken = 'Bearer mock-jwt-token';

describe('Contract Test: POST /api/budget-categories', () => {
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

  describe('Valid Budget Category Creation', () => {
    const validCreateRequest = {
      name: 'Essential Needs',
      targetPercentage: 50.25,
      color: '#3B82F6',
      sortOrder: 1
    };

    it('should return 201 with created budget category', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send(validCreateRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', validCreateRequest.name);
      expect(response.body).toHaveProperty('targetPercentage', validCreateRequest.targetPercentage);
      expect(response.body).toHaveProperty('color', validCreateRequest.color);
      expect(response.body).toHaveProperty('sortOrder', validCreateRequest.sortOrder);
      expect(response.body).toHaveProperty('isActive', true);
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

      // Validate initial values
      expect(response.body.currentPeriodAllocated).toBe(0);
      expect(response.body.currentPeriodSpent).toBe(0);
      expect(response.body.remainingBalance).toBe(0);
    });

    it('should create category with minimal required fields', async () => {
      const minimalRequest = {
        name: 'Emergency Fund',
        targetPercentage: 10.0
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send(minimalRequest)
        .expect(201);

      expect(response.body.name).toBe(minimalRequest.name);
      expect(response.body.targetPercentage).toBe(minimalRequest.targetPercentage);
      expect(response.body.color).toBe('#3B82F6'); // Default color
      expect(typeof response.body.sortOrder).toBe('number'); // Auto-assigned
    });

    it('should handle decimal percentages correctly', async () => {
      const decimalRequest = {
        name: 'Precise Category',
        targetPercentage: 15.75
      };

      const response = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send(decimalRequest)
        .expect(201);

      expect(response.body.targetPercentage).toBe(15.75);
    });
  });

  describe('Invalid Budget Category Creation', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { targetPercentage: 50.0 }, // Missing name
        { name: 'Test Category' }, // Missing targetPercentage
        {} // Missing both
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/budget-categories')
          .set('Authorization', mockToken)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid name constraints', async () => {
      const invalidNameRequests = [
        {
          name: '', // Empty name
          targetPercentage: 25.0
        },
        {
          name: 'a'.repeat(101), // Name too long (max 100)
          targetPercentage: 25.0
        }
      ];

      for (const request of invalidNameRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/budget-categories')
          .set('Authorization', mockToken)
          .send(request)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('name');
      }
    });

    it('should return 400 for invalid targetPercentage constraints', async () => {
      const invalidPercentageRequests = [
        {
          name: 'Invalid Percentage',
          targetPercentage: 0 // Below minimum (0.01)
        },
        {
          name: 'Invalid Percentage',
          targetPercentage: -5.0 // Negative
        },
        {
          name: 'Invalid Percentage',
          targetPercentage: 100.01 // Above maximum (100)
        },
        {
          name: 'Invalid Percentage',
          targetPercentage: 150.0 // Way above maximum
        }
      ];

      for (const request of invalidPercentageRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/budget-categories')
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
        {
          name: 'Invalid Color',
          targetPercentage: 25.0,
          color: 'blue' // Not hex format
        },
        {
          name: 'Invalid Color',
          targetPercentage: 25.0,
          color: '#12345' // Too short
        },
        {
          name: 'Invalid Color',
          targetPercentage: 25.0,
          color: '#1234567' // Too long
        },
        {
          name: 'Invalid Color',
          targetPercentage: 25.0,
          color: '#GGGGGG' // Invalid hex characters
        }
      ];

      for (const request of invalidColorRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/budget-categories')
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
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send({
          name: 'Test Category',
          targetPercentage: 25.0,
          sortOrder: -1 // Negative sort order
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('sortOrder');
    });

    it('should return 400 if total percentages would exceed 100%', async () => {
      // This test assumes the API validates total percentage allocation
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send({
          name: 'Exceeding Category',
          targetPercentage: 101.0 // This alone exceeds 100%
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/percentage|budget|exceed/i);
    });
  });

  describe('Duplicate Category Names', () => {
    it('should return 409 for duplicate category names', async () => {
      const categoryRequest = {
        name: 'Essential Needs',
        targetPercentage: 25.0
      };

      // Create first category
      await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send(categoryRequest)
        .expect(201);

      // Try to create duplicate
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send({
          ...categoryRequest,
          targetPercentage: 30.0 // Different percentage
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/exists|duplicate|name/i);
    });

    it('should be case-insensitive for name uniqueness', async () => {
      const categoryRequest = {
        name: 'essential needs',
        targetPercentage: 25.0
      };

      // Create first category
      await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send(categoryRequest)
        .expect(201);

      // Try to create with different case
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send({
          name: 'Essential Needs', // Different case
          targetPercentage: 30.0
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.error).toMatch(/exists|duplicate|name/i);
    });
  });

  describe('Authentication Requirements', () => {
    const validRequest = {
      name: 'Test Category',
      targetPercentage: 25.0
    };

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|authentication/i);
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/budget-categories')
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
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send('name=TestCategory&targetPercentage=25.0')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', mockToken)
        .send({
          name: 'Test Category',
          targetPercentage: 25.0
        })
        .expect('Content-Type', /application\/json/)
        .expect(201);
    });
  });
});