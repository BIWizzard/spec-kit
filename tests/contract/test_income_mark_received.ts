/**
 * Contract Test: POST /api/income-events/{id}/mark-received
 * Task: T060 - Income event mark received endpoint contract validation
 *
 * This test validates the income event mark received API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/income-events/{id}/mark-received', () => {
  let authTokens: any;
  let incomeEventId: string;
  const testUser = {
    email: 'income-received@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Received',
    familyName: 'Received Family'
  };

  beforeEach(async () => {
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

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

    const createResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Income to Receive',
        amount: 2500.00,
        scheduledDate: '2024-06-01',
        frequency: 'monthly',
        source: 'Test Company'
      });

    incomeEventId = createResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Mark Received Operations', () => {
    it('should mark income as received with same amount', async () => {
      const receiveData = {
        actualDate: '2024-06-01'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(receiveData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('received');
      expect(response.body.actualDate).toBe('2024-06-01');
      expect(response.body.actualAmount).toBe(2500.00); // Should use scheduled amount
    });

    it('should mark income as received with different amount', async () => {
      const receiveData = {
        actualDate: '2024-06-02',
        actualAmount: 2750.00
      };

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(receiveData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('received');
      expect(response.body.actualDate).toBe('2024-06-02');
      expect(response.body.actualAmount).toBe(2750.00);
      expect(response.body.remainingAmount).toBe(2750.00);
    });

    it('should mark income as received with notes', async () => {
      const receiveData = {
        actualDate: '2024-06-01',
        actualAmount: 2600.00,
        notes: 'Received with small bonus'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(receiveData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('received');
      expect(response.body.actualAmount).toBe(2600.00);
      expect(response.body.notes).toMatch(/bonus/i);
    });

    it('should update remainingAmount based on actualAmount', async () => {
      const receiveData = {
        actualDate: '2024-06-01',
        actualAmount: 3000.00
      };

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(receiveData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.actualAmount).toBe(3000.00);
      expect(response.body.remainingAmount).toBe(3000.00);
      expect(response.body.allocatedAmount).toBe(0);
    });
  });

  describe('Input Validation', () => {
    it('should require actualDate', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });

    it('should reject invalid date formats', async () => {
      const invalidDates = ['invalid-date', '2024-13-01', '01-01-2024', ''];

      for (const invalidDate of invalidDates) {
        const response = await request(API_BASE_URL)
          .post(`/api/income-events/${incomeEventId}/mark-received`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({ actualDate: invalidDate })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should reject invalid amount values', async () => {
      const invalidAmounts = [0, -100, 1000000, 'invalid'];

      for (const invalidAmount of invalidAmounts) {
        const response = await request(API_BASE_URL)
          .post(`/api/income-events/${incomeEventId}/mark-received`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            actualDate: '2024-06-01',
            actualAmount: invalidAmount
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Business Rules', () => {
    it('should prevent marking already received income', async () => {
      // First mark as received
      await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ actualDate: '2024-06-01' })
        .expect(200);

      // Try to mark again
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ actualDate: '2024-06-02' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data or income already received');
    });

    it('should handle future actual dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ actualDate: futureDateString })
        .expect('Content-Type', /json/);

      // Should either accept future dates or validate them
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent income event', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${nonExistentId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ actualDate: '2024-06-01' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Income event not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .send({ actualDate: '2024-06-01' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should not mark received for other families', async () => {
      const secondFamily = {
        email: 'other-received@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Received',
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

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({ actualDate: '2024-06-01' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Income event not found');
    });
  });
});