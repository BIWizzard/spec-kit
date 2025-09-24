/**
 * Contract Test: PUT /api/income-events/{id}
 * Task: T058 - Income event update endpoint contract validation
 *
 * This test validates the income event update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/income-events/{id}', () => {
  let authTokens: any;
  let incomeEventId: string;
  const testUser = {
    email: 'income-update@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Update',
    familyName: 'Update Family'
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
        name: 'Original Income Event',
        amount: 2500.00,
        scheduledDate: '2024-06-01',
        frequency: 'monthly',
        source: 'Original Company',
        notes: 'Original notes'
      });

    incomeEventId = createResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Income Event Updates', () => {
    it('should update income event name successfully', async () => {
      const updateData = {
        name: 'Updated Income Event Name'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.amount).toBe(2500.00); // Unchanged
      expect(response.body.id).toBe(incomeEventId);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should update income event amount successfully', async () => {
      const updateData = {
        amount: 3500.00
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.amount).toBe(updateData.amount);
      expect(response.body.remainingAmount).toBe(3500.00); // Should update since no allocations
      expect(response.body.name).toBe('Original Income Event'); // Unchanged
    });

    it('should update scheduled date successfully', async () => {
      const updateData = {
        scheduledDate: '2024-07-01'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.scheduledDate).toBe(updateData.scheduledDate);
      expect(response.body.nextOccurrence).toBe('2024-08-01'); // Should recalculate for monthly
    });

    it('should update frequency and recalculate nextOccurrence', async () => {
      const updateData = {
        frequency: 'weekly'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.frequency).toBe('weekly');
      expect(response.body.nextOccurrence).toBe('2024-06-08'); // Weekly from 2024-06-01
    });

    it('should update multiple fields simultaneously', async () => {
      const updateData = {
        name: 'Comprehensive Update',
        amount: 4000.00,
        scheduledDate: '2024-08-01',
        frequency: 'biweekly',
        source: 'New Company',
        notes: 'Updated notes with new information'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.amount).toBe(updateData.amount);
      expect(response.body.scheduledDate).toBe(updateData.scheduledDate);
      expect(response.body.frequency).toBe(updateData.frequency);
      expect(response.body.source).toBe(updateData.source);
      expect(response.body.notes).toBe(updateData.notes);
      expect(response.body.nextOccurrence).toBe('2024-08-15'); // Biweekly from 2024-08-01
    });

    it('should handle partial updates correctly', async () => {
      const updateData = {
        notes: 'Only updating notes field'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.notes).toBe(updateData.notes);
      expect(response.body.name).toBe('Original Income Event');
      expect(response.body.amount).toBe(2500.00);
    });

    it('should handle null values for optional fields', async () => {
      const updateData = {
        source: null,
        notes: null
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.source).toBeNull();
      expect(response.body.notes).toBeNull();
    });

    it('should handle updateFutureOccurrences flag for recurring events', async () => {
      const updateData = {
        name: 'Future Occurrences Update',
        updateFutureOccurrences: true
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid amount values', async () => {
      const invalidAmounts = [
        { amount: 0 },
        { amount: -100 },
        { amount: 1000000 }, // Over maximum
        { amount: 'invalid' }
      ];

      for (const invalidData of invalidAmounts) {
        const response = await request(API_BASE_URL)
          .put(`/api/income-events/${incomeEventId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(invalidData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should reject invalid date formats', async () => {
      const invalidDates = [
        { scheduledDate: 'invalid-date' },
        { scheduledDate: '2024-13-01' },
        { scheduledDate: '2024-01-32' },
        { scheduledDate: '01-01-2024' },
        { scheduledDate: '' }
      ];

      for (const invalidData of invalidDates) {
        const response = await request(API_BASE_URL)
          .put(`/api/income-events/${incomeEventId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(invalidData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should reject invalid frequency values', async () => {
      const invalidFrequencies = [
        { frequency: 'invalid' },
        { frequency: 'daily' },
        { frequency: 'yearly' },
        { frequency: '' }
      ];

      for (const invalidData of invalidFrequencies) {
        const response = await request(API_BASE_URL)
          .put(`/api/income-events/${incomeEventId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(invalidData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should reject string length violations', async () => {
      const invalidData = {
        name: 'a'.repeat(256), // Exceeds max length
        source: 'b'.repeat(256), // Exceeds max length
        notes: 'c'.repeat(1001) // Exceeds max length
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(invalidData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should handle empty update request', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(200);

      // Should return unchanged event
      expect(response.body.name).toBe('Original Income Event');
      expect(response.body.amount).toBe(2500.00);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent income event', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = { name: 'Updated Name' };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${nonExistentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Income event not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';
      const updateData = { name: 'Updated Name' };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${invalidId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should not update income events from other families', async () => {
      // Create second family
      const secondFamily = {
        email: 'other-update@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Update',
        familyName: 'Other Update Family'
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

      const updateData = { name: 'Unauthorized Update' };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Income event not found');
    });
  });

  describe('Business Logic Validation', () => {
    it('should handle frequency changes for recurring events correctly', async () => {
      const frequencies = [
        { freq: 'weekly', expectedNext: '2024-06-08' },
        { freq: 'biweekly', expectedNext: '2024-06-15' },
        { freq: 'quarterly', expectedNext: '2024-09-01' },
        { freq: 'annual', expectedNext: '2025-06-01' },
        { freq: 'once', expectedNext: null }
      ];

      for (const testCase of frequencies) {
        const updateData = {
          frequency: testCase.freq
        };

        const response = await request(API_BASE_URL)
          .put(`/api/income-events/${incomeEventId}`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.frequency).toBe(testCase.freq);
        expect(response.body.nextOccurrence).toBe(testCase.expectedNext);
      }
    });

    it('should preserve status when updating scheduled events', async () => {
      // First mark as received
      await request(API_BASE_URL)
        .post(`/api/income-events/${incomeEventId}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-06-01',
          actualAmount: 2500.00
        });

      // Then update other fields
      const updateData = {
        name: 'Updated Received Income',
        notes: 'Updated notes for received income'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.notes).toBe(updateData.notes);
      expect(response.body.status).toBe('received'); // Should be preserved
      expect(response.body.actualDate).toBe('2024-06-01'); // Should be preserved
      expect(response.body.actualAmount).toBe(2500.00); // Should be preserved
    });
  });

  describe('Response Format Validation', () => {
    it('should return JSON content type', async () => {
      const updateData = { name: 'JSON Test' };

      await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    it('should include proper timestamps', async () => {
      const updateData = { name: 'Timestamp Test' };

      const response = await request(API_BASE_URL)
        .put(`/api/income-events/${incomeEventId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(response.body.createdAt).getTime()
      );
    });
  });
});