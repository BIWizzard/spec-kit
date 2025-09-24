/**
 * Contract Test: GET /api/income-events
 * Task: T055 - Income events list endpoint contract validation
 *
 * This test validates the income events list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/income-events', () => {
  let authTokens: any;
  const testUser = {
    email: 'income@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Test',
    familyName: 'Income Family'
  };

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create and authenticate test user
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send(testUser);

    const loginResponse = await request(API_BASE_URL)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authTokens = loginResponse.body.tokens;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Income Events List Request', () => {
    it('should return 200 with empty list when no income events exist', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 200 with income events when they exist', async () => {
      // First create an income event
      await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Test Salary',
          amount: 3500.00,
          scheduledDate: '2024-01-01',
          frequency: 'monthly',
          source: 'Job'
        });

      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Validate income event structure
      const incomeEvent = response.body[0];
      expect(incomeEvent).toHaveProperty('id');
      expect(incomeEvent).toHaveProperty('name');
      expect(incomeEvent).toHaveProperty('amount');
      expect(incomeEvent).toHaveProperty('scheduledDate');
      expect(incomeEvent).toHaveProperty('frequency');
      expect(incomeEvent).toHaveProperty('status');
      expect(incomeEvent).toHaveProperty('allocatedAmount');
      expect(incomeEvent).toHaveProperty('remainingAmount');
      expect(incomeEvent).toHaveProperty('createdAt');
      expect(incomeEvent).toHaveProperty('updatedAt');

      // Validate data types
      expect(typeof incomeEvent.id).toBe('string');
      expect(typeof incomeEvent.name).toBe('string');
      expect(typeof incomeEvent.amount).toBe('number');
      expect(typeof incomeEvent.scheduledDate).toBe('string');
      expect(typeof incomeEvent.frequency).toBe('string');
      expect(typeof incomeEvent.status).toBe('string');
      expect(typeof incomeEvent.allocatedAmount).toBe('number');
      expect(typeof incomeEvent.remainingAmount).toBe('number');

      // Validate enum values
      expect(['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual']).toContain(incomeEvent.frequency);
      expect(['scheduled', 'received', 'cancelled']).toContain(incomeEvent.status);
    });
  });

  describe('Query Parameters and Filtering', () => {
    it('should support date range filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support status filtering', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .query({ status: 'scheduled' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .query({
          page: 1,
          limit: 10
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support sorting', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .query({
          sortBy: 'scheduledDate',
          sortOrder: 'desc'
        })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return income events for authenticated user\'s family', async () => {
      // Create second family with income event
      const secondFamily = {
        email: 'other@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(secondFamily);

      const otherLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: secondFamily.email,
          password: secondFamily.password
        });

      // Create income event for other family
      await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Family Income',
          amount: 5000.00,
          scheduledDate: '2024-01-01',
          frequency: 'monthly'
        });

      // Original user should not see other family's income events
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0); // Should be empty for original user
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid date format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .query({ startDate: 'invalid-date' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });

    it('should return 400 for invalid status filter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .query({ status: 'invalid-status' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const invalidQueries = [
        { page: -1 },
        { page: 'invalid' },
        { limit: -1 },
        { limit: 'invalid' },
        { limit: 1000 } // Too large
      ];

      for (const query of invalidQueries) {
        const response = await request(API_BASE_URL)
          .get('/api/income-events')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Performance and Limits', () => {
    it('should enforce reasonable default limits', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should not return unlimited results
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(100); // Reasonable default limit
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Income events should be cacheable but with short TTL
      expect(response.headers['cache-control']).toMatch(/max-age=|no-cache/);
    });
  });
});
