/**
 * Contract Test: POST /api/income-events/{id}/revert-received
 * Task: T061 - Income event revert received endpoint contract validation
 *
 * This test validates the revert income from received status API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/income-events/{id}/revert-received', () => {
  let authTokens: any;
  let receivedIncomeId: string;
  let scheduledIncomeId: string;
  let receivedWithAttributionsId: string;
  const testUser = {
    email: 'income-revert@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Revert',
    familyName: 'Revert Family'
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
    const scheduledResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Scheduled Income',
        amount: 2000.00,
        scheduledDate: '2024-04-01',
        frequency: 'once',
        source: 'Test Source'
      });

    const receivedResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Received Income',
        amount: 2500.00,
        scheduledDate: '2024-03-15',
        frequency: 'once',
        source: 'Company XYZ'
      });

    const attributedResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Income with Attributions',
        amount: 3000.00,
        scheduledDate: '2024-02-01',
        frequency: 'monthly'
      });

    scheduledIncomeId = scheduledResponse.body.id;
    receivedIncomeId = receivedResponse.body.id;
    receivedWithAttributionsId = attributedResponse.body.id;

    // Mark income events as received
    await request(API_BASE_URL)
      .post(`/api/income-events/${receivedIncomeId}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: '2024-03-15',
        actualAmount: 2500.00
      });

    await request(API_BASE_URL)
      .post(`/api/income-events/${receivedWithAttributionsId}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: '2024-02-01',
        actualAmount: 3000.00
      });

    // Create payment and attribution for one received income
    const paymentResponse = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Attributed Payment',
        amount: 1200.00,
        dueDate: '2024-02-02',
        frequency: 'once'
      });

    await request(API_BASE_URL)
      .post('/api/attributions')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        incomeEventId: receivedWithAttributionsId,
        paymentId: paymentResponse.body.id,
        amount: 1200.00,
        attributionType: 'manual'
      });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Revert Received Operations', () => {
    it('should revert received income to scheduled status successfully', async () => {
      // Verify initial received status
      const initialResponse = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(initialResponse.body.status).toBe('received');
      expect(initialResponse.body.actualDate).toBe('2024-03-15');
      expect(initialResponse.body.actualAmount).toBe(2500.00);

      // Revert to scheduled
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('id', receivedIncomeId);
      expect(response.body).toHaveProperty('status', 'scheduled');
      expect(response.body).toHaveProperty('actualDate', null);
      expect(response.body).toHaveProperty('actualAmount', null);
      expect(response.body).toHaveProperty('remainingAmount', 2500.00); // Back to scheduled amount
      expect(response.body).toHaveProperty('allocatedAmount', 0);
      expect(response.body).toHaveProperty('updatedAt');

      // Verify scheduled amounts remain unchanged
      expect(response.body).toHaveProperty('amount', 2500.00);
      expect(response.body).toHaveProperty('scheduledDate', '2024-03-15');
      expect(response.body).toHaveProperty('name', 'Received Income');

      // Verify timestamps
      expect(new Date(response.body.updatedAt).getTime())
        .toBeGreaterThan(new Date(initialResponse.body.createdAt).getTime());
    });

    it('should revert recurring income correctly', async () => {
      // Create and receive a recurring income
      const recurringResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Monthly Recurring',
          amount: 4000.00,
          scheduledDate: '2024-01-01',
          frequency: 'monthly'
        });

      await request(API_BASE_URL)
        .post(`/api/income-events/${recurringResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-01-01',
          actualAmount: 4100.00 // Different from scheduled
        });

      // Revert the recurring income
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${recurringResponse.body.id}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('scheduled');
      expect(response.body.frequency).toBe('monthly');
      expect(response.body.actualAmount).toBeNull();
      expect(response.body.remainingAmount).toBe(4000.00); // Back to scheduled amount
      expect(response.body.nextOccurrence).not.toBeNull(); // Should still have next occurrence
    });

    it('should clear actual date and amount on revert', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.actualDate).toBeNull();
      expect(response.body.actualAmount).toBeNull();
      expect(response.body.status).toBe('scheduled');
    });

    it('should reset remaining amount to scheduled amount', async () => {
      // Mark income with different actual amount
      const differentAmountResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Different Amount Income',
          amount: 1000.00,
          scheduledDate: '2024-05-01',
          frequency: 'once'
        });

      await request(API_BASE_URL)
        .post(`/api/income-events/${differentAmountResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-05-01',
          actualAmount: 1500.00 // Higher than scheduled
        });

      // Revert should reset to scheduled amount
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${differentAmountResponse.body.id}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.remainingAmount).toBe(1000.00); // Scheduled amount
      expect(response.body.actualAmount).toBeNull();
    });
  });

  describe('Status Transition Validation', () => {
    it('should transition from received to scheduled', async () => {
      // Verify initial received status
      const initialResponse = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(initialResponse.body.status).toBe('received');

      // Revert to scheduled
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('scheduled');

      // Verify persistence
      const verifyResponse = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe('scheduled');
    });

    it('should prevent reverting scheduled income', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${scheduledIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/already.*scheduled|not.*received/i);
    });

    it('should prevent reverting cancelled income', async () => {
      // Create and cancel income
      const cancelResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'To Be Cancelled',
          amount: 1000.00,
          scheduledDate: '2024-06-01',
          frequency: 'once'
        });

      // Mark as received first
      await request(API_BASE_URL)
        .post(`/api/income-events/${cancelResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-06-01',
          actualAmount: 1000.00
        });

      // Cancel the income (assuming this sets status to cancelled)
      await request(API_BASE_URL)
        .delete(`/api/income-events/${cancelResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      // Attempt to revert cancelled income
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${cancelResponse.body.id}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/cancelled.*cannot.*revert|invalid.*status/i);
    });
  });

  describe('Business Logic Constraints', () => {
    it('should prevent reverting income with active attributions', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedWithAttributionsId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/active.*attribution|attributed.*payment/i);
      expect(response.body).toHaveProperty('code');

      // Verify income still has received status
      const verifyResponse = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedWithAttributionsId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe('received');
    });

    it('should prevent reverting income with budget allocations', async () => {
      // Create income with budget allocation
      const budgetIncomeResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Budget Allocated Income',
          amount: 2000.00,
          scheduledDate: '2024-03-01',
          frequency: 'once'
        });

      await request(API_BASE_URL)
        .post(`/api/income-events/${budgetIncomeResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-03-01',
          actualAmount: 2000.00
        });

      // Create budget allocation (assuming this endpoint exists)
      const budgetResponse = await request(API_BASE_URL)
        .post('/api/budget-allocations')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          incomeEventId: budgetIncomeResponse.body.id,
          budgetCategoryId: 'some-budget-category-id',
          amount: 500.00,
          percentage: 25.0
        });

      if (budgetResponse.status === 201) {
        // Attempt to revert income with budget allocations
        const response = await request(API_BASE_URL)
          .post(`/api/income-events/${budgetIncomeResponse.body.id}/revert-received`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toMatch(/budget.*allocation|allocated.*budget/i);
      }
    });

    it('should allow reverting clean received income', async () => {
      // Income without attributions or allocations should be revertible
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('scheduled');
    });

    it('should validate income exists and belongs to family', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${fakeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Resource not found');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency after revert', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Verify all amounts are consistent
      expect(response.body.allocatedAmount).toBe(0);
      expect(response.body.remainingAmount).toBe(response.body.amount); // Should equal scheduled amount
      expect(response.body.allocatedAmount + response.body.remainingAmount).toBe(response.body.amount);

      // Verify actual values are null
      expect(response.body.actualDate).toBeNull();
      expect(response.body.actualAmount).toBeNull();

      // Verify the revert persists
      const getResponse = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe('scheduled');
      expect(getResponse.body.actualDate).toBeNull();
      expect(getResponse.body.actualAmount).toBeNull();
    });

    it('should handle multiple revert attempts gracefully', async () => {
      // First revert should succeed
      const firstResponse = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(firstResponse.body.status).toBe('scheduled');

      // Second revert should fail gracefully
      const secondResponse = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(secondResponse.body.error).toBe('Invalid request data');
      expect(secondResponse.body.message).toMatch(/already.*scheduled|not.*received/i);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent income event', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${fakeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Resource not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidIds = [
        'not-a-uuid',
        '123',
        'invalid-format-here',
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra' // Too long
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .post(`/api/income-events/${invalidId}/revert-received`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
      }
    });

    it('should handle database constraint violations gracefully', async () => {
      // Simulate scenario where constraints prevent reversion
      // This would depend on specific database implementation and business rules

      // For now, test that constraint violations return appropriate errors
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedWithAttributionsId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/cannot.*revert|active.*attribution/i);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should not revert income events from other families', async () => {
      // Create second family with received income
      const secondFamily = {
        email: 'other-revert@example.com',
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

      const otherIncomeResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Family Income',
          amount: 2000.00,
          scheduledDate: '2024-01-01',
          frequency: 'monthly'
        });

      await request(API_BASE_URL)
        .post(`/api/income-events/${otherIncomeResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          actualDate: '2024-01-01',
          actualAmount: 2000.00
        });

      // Original user should not be able to revert other family's income
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${otherIncomeResponse.body.id}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Resource not found');

      // Verify other family's income still received
      const verifyResponse = await request(API_BASE_URL)
        .get(`/api/income-events/${otherIncomeResponse.body.id}`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe('received');
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });

    it('should handle empty request body correctly', async () => {
      // Revert shouldn't require request body
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('scheduled');
    });
  });

  describe('Audit and Logging', () => {
    it('should log revert activities appropriately', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('scheduled');

      // Revert should be logged for audit purposes
      // This would typically be verified through audit log endpoints
      // For now, we just verify the operation completed successfully
    });

    it('should handle concurrent revert attempts gracefully', async () => {
      // Start multiple revert requests simultaneously
      const revertPromises = [
        request(API_BASE_URL)
          .post(`/api/income-events/${receivedIncomeId}/revert-received`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`),
        request(API_BASE_URL)
          .post(`/api/income-events/${receivedIncomeId}/revert-received`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`),
        request(API_BASE_URL)
          .post(`/api/income-events/${receivedIncomeId}/revert-received`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
      ];

      const responses = await Promise.allSettled(revertPromises);

      // One should succeed (200), others should fail (400 - already scheduled)
      const successResponses = responses.filter(r => r.status === 'fulfilled' && (r.value as any).status === 200);
      expect(successResponses).toHaveLength(1);
    });
  });

  describe('Performance', () => {
    it('should revert income within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should revert within 2 seconds
    });
  });

  describe('Edge Cases', () => {
    it('should handle reverting income with complex attributions correctly', async () => {
      // This test verifies the error message is clear for complex attribution scenarios
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedWithAttributionsId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/attribution|cannot.*revert/i);
      expect(response.body).toHaveProperty('code');
    });

    it('should maintain referential integrity after revert', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/income-events/${receivedIncomeId}/revert-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Verify income is findable in lists
      const listResponse = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const revertedIncome = listResponse.body.find((income: any) => income.id === receivedIncomeId);
      expect(revertedIncome).toBeDefined();
      expect(revertedIncome.status).toBe('scheduled');
    });
  });
});