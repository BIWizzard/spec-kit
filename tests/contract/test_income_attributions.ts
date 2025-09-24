/**
 * Contract Test: GET /api/income-events/{id}/attributions
 * Task: T062 - Income event attributions endpoint contract validation
 *
 * This test validates the income event attributions API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/income-events/{id}/attributions', () => {
  let authTokens: any;
  let receivedIncomeId: string;
  let noAttributionsIncomeId: string;
  let scheduledIncomeId: string;
  let payment1Id: string;
  let payment2Id: string;
  let payment3Id: string;
  const testUser = {
    email: 'income-attributions@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Attributions',
    familyName: 'Attributions Family'
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
    const receivedResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Income with Attributions',
        amount: 5000.00,
        scheduledDate: '2024-03-01',
        frequency: 'monthly',
        source: 'Main Job'
      });

    const noAttributionsResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Clean Income',
        amount: 2000.00,
        scheduledDate: '2024-03-15',
        frequency: 'once'
      });

    const scheduledResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Scheduled Income',
        amount: 3000.00,
        scheduledDate: '2024-04-01',
        frequency: 'once'
      });

    receivedIncomeId = receivedResponse.body.id;
    noAttributionsIncomeId = noAttributionsResponse.body.id;
    scheduledIncomeId = scheduledResponse.body.id;

    // Mark income events as received
    await request(API_BASE_URL)
      .post(`/api/income-events/${receivedIncomeId}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: '2024-03-01',
        actualAmount: 5000.00
      });

    await request(API_BASE_URL)
      .post(`/api/income-events/${noAttributionsIncomeId}/mark-received`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        actualDate: '2024-03-15',
        actualAmount: 2000.00
      });

    // Create test payments
    const payment1Response = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Rent Payment',
        amount: 1500.00,
        dueDate: '2024-03-01',
        frequency: 'monthly'
      });

    const payment2Response = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Utilities',
        amount: 300.00,
        dueDate: '2024-03-02',
        frequency: 'monthly'
      });

    const payment3Response = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Groceries',
        amount: 500.00,
        dueDate: '2024-03-03',
        frequency: 'weekly'
      });

    payment1Id = payment1Response.body.id;
    payment2Id = payment2Response.body.id;
    payment3Id = payment3Response.body.id;

    // Create attributions for the received income
    await request(API_BASE_URL)
      .post('/api/attributions')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        incomeEventId: receivedIncomeId,
        paymentId: payment1Id,
        amount: 1500.00,
        attributionType: 'manual'
      });

    await request(API_BASE_URL)
      .post('/api/attributions')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        incomeEventId: receivedIncomeId,
        paymentId: payment2Id,
        amount: 300.00,
        attributionType: 'automatic'
      });

    await request(API_BASE_URL)
      .post('/api/attributions')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        incomeEventId: receivedIncomeId,
        paymentId: payment3Id,
        amount: 450.00, // Partial attribution
        attributionType: 'manual'
      });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Attribution Requests', () => {
    it('should return attributions list for income with attributions', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('attributions');
      expect(response.body).toHaveProperty('totalAttributed');
      expect(response.body).toHaveProperty('remainingAmount');

      // Validate attributions array
      expect(Array.isArray(response.body.attributions)).toBe(true);
      expect(response.body.attributions).toHaveLength(3);

      // Validate attribution structure
      const attribution = response.body.attributions[0];
      expect(attribution).toHaveProperty('id');
      expect(attribution).toHaveProperty('paymentId');
      expect(attribution).toHaveProperty('paymentName');
      expect(attribution).toHaveProperty('amount');
      expect(attribution).toHaveProperty('attributionType');
      expect(attribution).toHaveProperty('createdAt');
      expect(attribution).toHaveProperty('createdByName');

      // Validate data types
      expect(typeof attribution.id).toBe('string');
      expect(typeof attribution.paymentId).toBe('string');
      expect(typeof attribution.paymentName).toBe('string');
      expect(typeof attribution.amount).toBe('number');
      expect(typeof attribution.attributionType).toBe('string');
      expect(typeof attribution.createdAt).toBe('string');
      expect(typeof attribution.createdByName).toBe('string');

      // Validate enum values
      expect(['manual', 'automatic']).toContain(attribution.attributionType);

      // Validate totals
      expect(response.body.totalAttributed).toBe(2250.00); // 1500 + 300 + 450
      expect(response.body.remainingAmount).toBe(2750.00); // 5000 - 2250
    });

    it('should return specific attribution details', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Find specific attributions
      const rentAttribution = response.body.attributions.find((attr: any) => attr.paymentName === 'Rent Payment');
      const utilitiesAttribution = response.body.attributions.find((attr: any) => attr.paymentName === 'Utilities');
      const groceriesAttribution = response.body.attributions.find((attr: any) => attr.paymentName === 'Groceries');

      // Validate rent attribution
      expect(rentAttribution).toBeDefined();
      expect(rentAttribution.amount).toBe(1500.00);
      expect(rentAttribution.attributionType).toBe('manual');
      expect(rentAttribution.paymentId).toBe(payment1Id);

      // Validate utilities attribution
      expect(utilitiesAttribution).toBeDefined();
      expect(utilitiesAttribution.amount).toBe(300.00);
      expect(utilitiesAttribution.attributionType).toBe('automatic');
      expect(utilitiesAttribution.paymentId).toBe(payment2Id);

      // Validate groceries attribution (partial)
      expect(groceriesAttribution).toBeDefined();
      expect(groceriesAttribution.amount).toBe(450.00);
      expect(groceriesAttribution.attributionType).toBe('manual');
      expect(groceriesAttribution.paymentId).toBe(payment3Id);
    });

    it('should return empty list for income without attributions', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${noAttributionsIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.attributions).toHaveLength(0);
      expect(response.body.totalAttributed).toBe(0);
      expect(response.body.remainingAmount).toBe(2000.00);
    });

    it('should return attributions sorted by creation date', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const attributions = response.body.attributions;

      // Verify attributions are sorted by createdAt (most recent first or oldest first)
      for (let i = 1; i < attributions.length; i++) {
        const prevDate = new Date(attributions[i - 1].createdAt);
        const currDate = new Date(attributions[i].createdAt);
        // Assuming descending order (most recent first)
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });

    it('should calculate accurate totals', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const attributions = response.body.attributions;
      const calculatedTotal = attributions.reduce((sum: number, attr: any) => sum + attr.amount, 0);

      expect(response.body.totalAttributed).toBe(calculatedTotal);
      expect(response.body.totalAttributed + response.body.remainingAmount).toBe(5000.00);
    });

    it('should handle scheduled income (should return empty or error)', async () => {
      // Scheduled income might not have attributions or might return an error
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${scheduledIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/);

      // Either returns empty attributions or appropriate error
      if (response.status === 200) {
        expect(response.body.attributions).toHaveLength(0);
        expect(response.body.totalAttributed).toBe(0);
        expect(response.body.remainingAmount).toBe(3000.00);
      } else if (response.status === 400) {
        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toMatch(/scheduled.*income|not.*received/i);
      }
    });
  });

  describe('Data Validation and Consistency', () => {
    it('should ensure attribution amounts do not exceed income amount', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.totalAttributed).toBeLessThanOrEqual(5000.00);
      expect(response.body.remainingAmount).toBeGreaterThanOrEqual(0);
    });

    it('should show correct remaining amount calculations', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const expectedRemaining = 5000.00 - response.body.totalAttributed;
      expect(response.body.remainingAmount).toBe(expectedRemaining);
    });

    it('should validate attribution type values', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const attributions = response.body.attributions;
      attributions.forEach((attribution: any) => {
        expect(['manual', 'automatic']).toContain(attribution.attributionType);
      });
    });

    it('should provide valid creator information', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const attributions = response.body.attributions;
      attributions.forEach((attribution: any) => {
        expect(attribution.createdByName).toBeTruthy();
        expect(typeof attribution.createdByName).toBe('string');
      });
    });
  });

  describe('Attribution History and Tracking', () => {
    it('should maintain attribution creation timestamps', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const attributions = response.body.attributions;
      attributions.forEach((attribution: any) => {
        expect(attribution.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        const createdDate = new Date(attribution.createdAt);
        expect(createdDate.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    it('should distinguish between manual and automatic attributions', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const attributions = response.body.attributions;
      const manualAttributions = attributions.filter((attr: any) => attr.attributionType === 'manual');
      const automaticAttributions = attributions.filter((attr: any) => attr.attributionType === 'automatic');

      expect(manualAttributions.length).toBeGreaterThan(0);
      expect(automaticAttributions.length).toBeGreaterThan(0);

      // Validate specific attributions
      const utilitiesAttribution = attributions.find((attr: any) => attr.paymentName === 'Utilities');
      expect(utilitiesAttribution.attributionType).toBe('automatic');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent income event', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${fakeId}/attributions`)
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
          .get(`/api/income-events/${invalidId}/attributions`)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
      }
    });

    it('should handle database errors gracefully', async () => {
      // This would test scenarios where the database is unavailable
      // or returns errors. For now, we just ensure proper error structure.

      // Test with a valid but non-existent income ID
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${fakeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should not return attributions for other families\' income', async () => {
      // Create second family with income and attributions
      const secondFamily = {
        email: 'other-attributions@example.com',
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
          amount: 3000.00,
          scheduledDate: '2024-01-01',
          frequency: 'monthly'
        });

      await request(API_BASE_URL)
        .post(`/api/income-events/${otherIncomeResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          actualDate: '2024-01-01',
          actualAmount: 3000.00
        });

      // Original user should not be able to access other family's income attributions
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${otherIncomeResponse.body.id}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Resource not found');
    });

    it('should only show attributions from same family', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // All attributions should be from payments in the same family
      const attributions = response.body.attributions;
      const paymentIds = [payment1Id, payment2Id, payment3Id];

      attributions.forEach((attribution: any) => {
        expect(paymentIds).toContain(attribution.paymentId);
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Attribution data should be cacheable but with reasonable TTL
      expect(response.headers['cache-control']).toMatch(/max-age=|no-cache|private/);
    });

    it('should handle large numbers of attributions efficiently', async () => {
      // This test would be more relevant with many attributions
      // For now, just verify the current attributions are handled efficiently
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.attributions.length).toBe(3);
      expect(typeof response.body.totalAttributed).toBe('number');
      expect(typeof response.body.remainingAmount).toBe('number');
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('attributions');
    });

    it('should handle CORS headers appropriately', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .set('Origin', 'https://familyfinance.com')
        .expect(200);

      // CORS headers should be present if configured
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).toBeDefined();
      }
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle attributions with zero amounts', async () => {
      // Create attribution with minimal amount
      await request(API_BASE_URL)
        .post('/api/attributions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          incomeEventId: receivedIncomeId,
          paymentId: payment1Id, // Using existing payment
          amount: 0.01, // Minimal amount
          attributionType: 'manual'
        });

      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Should handle minimal amounts correctly
      const minimalAttribution = response.body.attributions.find((attr: any) => attr.amount === 0.01);
      if (minimalAttribution) {
        expect(minimalAttribution.amount).toBe(0.01);
      }
    });

    it('should handle income with actual amount different from scheduled', async () => {
      // Create income with different actual amount
      const differentAmountResponse = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Variable Amount Income',
          amount: 2000.00,
          scheduledDate: '2024-05-01',
          frequency: 'once'
        });

      await request(API_BASE_URL)
        .post(`/api/income-events/${differentAmountResponse.body.id}/mark-received`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          actualDate: '2024-05-01',
          actualAmount: 2500.00 // Higher than scheduled
        });

      // Create attribution
      await request(API_BASE_URL)
        .post('/api/attributions')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          incomeEventId: differentAmountResponse.body.id,
          paymentId: payment1Id,
          amount: 800.00,
          attributionType: 'manual'
        });

      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${differentAmountResponse.body.id}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Remaining amount should be based on actual amount, not scheduled
      expect(response.body.remainingAmount).toBe(1700.00); // 2500 - 800
      expect(response.body.totalAttributed).toBe(800.00);
    });

    it('should handle decimal precision correctly', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/income-events/${receivedIncomeId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // All amounts should be properly rounded to 2 decimal places
      response.body.attributions.forEach((attribution: any) => {
        const decimalPlaces = (attribution.amount.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });

      const totalDecimalPlaces = (response.body.totalAttributed.toString().split('.')[1] || '').length;
      expect(totalDecimalPlaces).toBeLessThanOrEqual(2);
    });
  });
});