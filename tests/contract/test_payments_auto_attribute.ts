/**
 * Contract Test: POST /api/payments/{paymentId}/auto-attribute
 * Task: T073 - Payment auto-attribute endpoint contract validation
 *
 * This test validates the payment auto-attribute API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/payments/{paymentId}/auto-attribute', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  let testPaymentId: string;
  let incomeEventId: string;
  const testUser = {
    email: 'payments.autoattribute@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'AutoAttribute',
    familyName: 'Payment Auto Attribute Family'
  };

  beforeEach(async () => {
    await prisma.incomeAttribution.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.incomeEvent.deleteMany();
    await prisma.spendingCategory.deleteMany();
    await prisma.budgetCategory.deleteMany();
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

    const budgetCategoryResponse = await request(API_BASE_URL)
      .post('/api/budget-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Budget Category',
        targetAmount: 1000.00,
        period: 'monthly'
      });

    const spendingCategoryResponse = await request(API_BASE_URL)
      .post('/api/spending-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Spending Category',
        budgetCategoryId: budgetCategoryResponse.body.id,
        color: '#FF0000',
        icon: 'bill'
      });

    spendingCategoryId = spendingCategoryResponse.body.id;

    // Create income event for attribution
    const incomeResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Salary',
        amount: 3000.00,
        scheduledDate: '2024-01-15',
        frequency: 'monthly',
        source: 'Job'
      });

    incomeEventId = incomeResponse.body.id;

    const paymentResponse = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        payee: 'Test Payment',
        amount: 125.50,
        dueDate: '2024-02-01',
        paymentType: 'once',
        spendingCategoryId: spendingCategoryId
      });

    testPaymentId = paymentResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Auto-Attribution Requests', () => {
    it('should auto-attribute payment with default strategy', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('attributions');
      expect(response.body).toHaveProperty('totalAttributed');
      expect(response.body).toHaveProperty('remainingAmount');

      expect(Array.isArray(response.body.attributions)).toBe(true);
      expect(response.body.totalAttributed).toBe(125.50);
      expect(response.body.remainingAmount).toBe(0);

      // Validate attribution structure
      if (response.body.attributions.length > 0) {
        const attribution = response.body.attributions[0];
        expect(attribution).toHaveProperty('id');
        expect(attribution).toHaveProperty('incomeEventId');
        expect(attribution).toHaveProperty('incomeEventName');
        expect(attribution).toHaveProperty('amount');
        expect(attribution).toHaveProperty('attributionType', 'automatic');
        expect(attribution).toHaveProperty('createdAt');
        expect(attribution).toHaveProperty('createdByName');
      }
    });

    it('should auto-attribute with earliest_income strategy', async () => {
      const attributionRequest = {
        strategy: 'earliest_income'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(attributionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('attributions');
      expect(response.body).toHaveProperty('totalAttributed');
      expect(response.body).toHaveProperty('remainingAmount');
    });

    it('should auto-attribute with latest_income strategy', async () => {
      // Create another income event
      await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Later Salary',
          amount: 2000.00,
          scheduledDate: '2024-02-15',
          frequency: 'monthly',
          source: 'Job'
        });

      const attributionRequest = {
        strategy: 'latest_income'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(attributionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.totalAttributed).toBe(125.50);
    });

    it('should auto-attribute with proportional strategy', async () => {
      const attributionRequest = {
        strategy: 'proportional'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(attributionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.totalAttributed).toBe(125.50);
    });

    it('should auto-attribute with preferred income events', async () => {
      const attributionRequest = {
        strategy: 'earliest_income',
        preferredIncomeEventIds: [incomeEventId]
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(attributionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.attributions.length).toBeGreaterThan(0);
      expect(response.body.attributions[0].incomeEventId).toBe(incomeEventId);
    });

    it('should handle partial attribution when insufficient income', async () => {
      // Create payment larger than available income
      const largePaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Large Payment',
          amount: 5000.00, // larger than 3000 income
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${largePaymentResponse.body.id}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.totalAttributed).toBeLessThan(5000.00);
      expect(response.body.remainingAmount).toBeGreaterThan(0);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for invalid strategy', async () => {
      const attributionRequest = {
        strategy: 'invalid_strategy'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(attributionRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });

    it('should return 400 for invalid preferred income event IDs', async () => {
      const attributionRequest = {
        preferredIncomeEventIds: ['invalid-uuid']
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(attributionRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when no available income for attribution', async () => {
      // Consume all available income first
      await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          incomeEventId: incomeEventId,
          amount: 3000.00 // all available income
        });

      // Create another payment that can't be attributed
      const newPaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Unattributable Payment',
          amount: 100.00,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${newPaymentResponse.body.id}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Insufficient available income for attribution');
    });

    it('should return 404 for non-existent payment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${fakeId}/auto-attribute`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
    });

    it('should return 400 for invalid payment ID format', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/payments/invalid-uuid/auto-attribute')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/auto-attribute`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });
});