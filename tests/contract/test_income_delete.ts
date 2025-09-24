/**
 * Contract Test: DELETE /api/income-events/{id}
 * Task: T059 - Income event delete endpoint contract validation
 *
 * This test validates the income event delete API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/income-events/{id}', () => {
  let authTokens: any;
  let incomeEventId: string;
  let recurringIncomeEventId: string;
  const testUser = {
    email: 'income-delete@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Delete',
    familyName: 'Delete Family'
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

    // Create test income events
    const oneTimeResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'One-time Income to Delete',
        amount: 1500.00,
        scheduledDate: '2024-08-01',
        frequency: 'once',
        source: 'Freelance Project'
      });

    incomeEventId = oneTimeResponse.body.id;

    const recurringResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Recurring Income to Delete',
        amount: 3000.00,
        scheduledDate: '2024-06-01',
        frequency: 'monthly',
        source: 'Monthly Contract'
      });

    recurringIncomeEventId = recurringResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Income Event Deletion', () => {
    it('should delete one-time income event successfully', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/successfully.*deleted|income.*event.*deleted/i);

      // Verify income event is actually deleted
      await request(API_BASE_URL)
        .get(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(404);
    });

    it('should delete recurring income event (current occurrence only by default)', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${recurringIncomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify this occurrence is deleted
      await request(API_BASE_URL)
        .get(`/api/income-events/${recurringIncomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(404);
    });

    it('should delete all future occurrences of recurring income with deleteAll=true', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${recurringIncomeEventId}`)
        .query({ deleteAll: true })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/all.*occurrences|future.*instances/i);
    });

    it('should handle deleteAll=false explicitly', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${recurringIncomeEventId}`)
        .query({ deleteAll: false })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Business Rule Validation', () => {
    it('should prevent deletion of income event with active attributions', async () => {
      // First mark income as received
      await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-08-01',
          actualAmount: 1500.00
        });

      // Create payment and attribution
      const paymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Attributed Payment',
          amount: 500.00,
          dueDate: '2024-08-15',
          frequency: 'once'
        });

      await request(API_BASE_URL)
        .post('/api/attributions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          paymentId: paymentResponse.body.id,
          incomeEventId: incomeEventId,
          amount: 500.00,
          attributionType: 'manual'
        });

      // Now try to delete - should fail
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Cannot delete income event with active attributions');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle deletion of received income without attributions', async () => {
      // Mark as received but don't create attributions
      await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-08-01',
          actualAmount: 1500.00
        });

      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent income event', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${nonExistentId}`)
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
        .delete(`/api/income-events/${invalidId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should not delete income events from other families', async () => {
      // Create second family
      const secondFamily = {
        email: 'other-delete@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Delete',
        familyName: 'Other Delete Family'
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

      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Income event not found');
    });
  });

  describe('Query Parameters', () => {
    it('should handle deleteAll parameter correctly', async () => {
      const validValues = [true, false, 'true', 'false'];

      for (const value of validValues) {
        // Create a new recurring income for each test
        const testResponse = await request(API_BASE_URL)
          .post('/api/income-events')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            name: `Test Delete ${value}`,
            amount: 1000.00,
            scheduledDate: '2024-07-01',
            frequency: 'monthly'
          });

        const response = await request(API_BASE_URL)
          .delete(`/api/income-events/${testResponse.body.id}`)
          .query({ deleteAll: value })
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toHaveProperty('message');
      }
    });

    it('should use default deleteAll behavior when parameter not provided', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${recurringIncomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Response Format Validation', () => {
    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    it('should return success response with proper structure', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });
  });

  describe('Idempotency', () => {
    it('should handle multiple deletion attempts gracefully', async () => {
      // First deletion should succeed
      await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Second deletion should return 404
      const response = await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Income event not found');
    });
  });

  describe('Related Data Cleanup', () => {
    it('should verify related data is properly cleaned up after deletion', async () => {
      // Delete income event
      await request(API_BASE_URL)
        .delete(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Verify it doesn't appear in listings
      const listResponse = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const deletedIncomeExists = listResponse.body.some((income: any) => income.id === incomeEventId);
      expect(deletedIncomeExists).toBe(false);
    });
  });
});