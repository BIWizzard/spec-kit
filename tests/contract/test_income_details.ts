/**
 * Contract Test: GET /api/income-events/{id}
 * Task: T057 - Income event details endpoint contract validation
 *
 * This test validates the income event details API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/income-events/{id}', () => {
  let authTokens: any;
  let incomeEventId: string;
  const testUser = {
    email: 'income-details@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Details',
    familyName: 'Details Family'
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

    // Create a test income event
    const createResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Income Event',
        amount: 3000.00,
        scheduledDate: '2024-06-01',
        frequency: 'monthly',
        source: 'Test Company',
        notes: 'Test notes for detailed view'
      });

    incomeEventId = createResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Income Event Details Request', () => {
    it('should return complete income event details successfully', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure - all fields from IncomeEventDetailResponse
      expect(response.body).toHaveProperty('id', incomeEventId);
      expect(response.body).toHaveProperty('name', 'Test Income Event');
      expect(response.body).toHaveProperty('amount', 3000.00);
      expect(response.body).toHaveProperty('scheduledDate', '2024-06-01');
      expect(response.body).toHaveProperty('frequency', 'monthly');
      expect(response.body).toHaveProperty('status', 'scheduled');
      expect(response.body).toHaveProperty('source', 'Test Company');
      expect(response.body).toHaveProperty('notes', 'Test notes for detailed view');
      expect(response.body).toHaveProperty('allocatedAmount', 0);
      expect(response.body).toHaveProperty('remainingAmount', 3000.00);
      expect(response.body).toHaveProperty('actualAmount', null);
      expect(response.body).toHaveProperty('actualDate', null);
      expect(response.body).toHaveProperty('nextOccurrence');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Detailed response specific fields
      expect(response.body).toHaveProperty('attributions');
      expect(response.body).toHaveProperty('budgetAllocations');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.name).toBe('string');
      expect(typeof response.body.amount).toBe('number');
      expect(typeof response.body.allocatedAmount).toBe('number');
      expect(typeof response.body.remainingAmount).toBe('number');
      expect(Array.isArray(response.body.attributions)).toBe(true);
      expect(Array.isArray(response.body.budgetAllocations)).toBe(true);

      // Validate enum values
      expect(['scheduled', 'received', 'cancelled']).toContain(response.body.status);
      expect(['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual']).toContain(response.body.frequency);
    });

    it('should return empty attributions array for new income event', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.attributions).toEqual([]);
      expect(response.body.budgetAllocations).toEqual([]);
    });

    it('should handle one-time income event details correctly', async () => {
      // Create one-time income event
      const createResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'One-time Bonus',
          amount: 5000.00,
          scheduledDate: '2024-12-31',
          frequency: 'once',
          source: 'Year-end Bonus'
        });

      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.frequency).toBe('once');
      expect(response.body.nextOccurrence).toBeNull();
    });

    it('should handle received income event details correctly', async () => {
      // Mark income as received
      await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-06-02',
          actualAmount: 3100.00,
          notes: 'Received with bonus'
        });

      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('received');
      expect(response.body.actualDate).toBe('2024-06-02');
      expect(response.body.actualAmount).toBe(3100.00);
      expect(response.body.remainingAmount).toBe(3100.00); // No attributions yet
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent income event', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${nonExistentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Income event not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid-format';

      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${invalidId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should not return income events from other families', async () => {
      // Create second family
      const secondFamily = {
        email: 'other-family@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Test Family'
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

      // Try to access first family's income event with second family's token
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Income event not found');
    });
  });

  describe('Response Format Validation', () => {
    it('should return proper JSON content type', async () => {
      await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    it('should include cache control headers', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Income details should have appropriate caching
      expect(response.headers['cache-control']).toMatch(/max-age=|no-cache|private/);
    });
  });

  describe('Data Consistency', () => {
    it('should show updated nextOccurrence for recurring events', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.frequency).toBe('monthly');
      expect(response.body.nextOccurrence).toBe('2024-07-01'); // Next month from 2024-06-01
    });

    it('should handle different recurring frequencies correctly', async () => {
      const frequencies = [
        { freq: 'weekly', date: '2024-01-01', expectedNext: '2024-01-08' },
        { freq: 'biweekly', date: '2024-01-01', expectedNext: '2024-01-15' },
        { freq: 'quarterly', date: '2024-01-01', expectedNext: '2024-04-01' },
        { freq: 'annual', date: '2024-01-01', expectedNext: '2025-01-01' }
      ];

      for (const testCase of frequencies) {
        const createResponse = await request(API_BASE_URL)
          .post('/api/income-events')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            name: `${testCase.freq} Income`,
            amount: 1000.00,
            scheduledDate: testCase.date,
            frequency: testCase.freq
          });

        const response = await request(API_BASE_URL)
          .get(`/api/income-events/${createResponse.body.id}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect(200);

        expect(response.body.nextOccurrence).toBe(testCase.expectedNext);
      }
    });
  });
});