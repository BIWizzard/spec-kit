/**
 * Contract Test: GET /api/payments/{paymentId}
 * Task: T068 - Payment details endpoint contract validation
 *
 * This test validates the payment details API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/payments/{paymentId}', () => {
  let authTokens: any;
  let spendingCategoryId: string;
  let testPaymentId: string;
  const testUser = {
    email: 'payments.details@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Payments',
    lastName: 'Details',
    familyName: 'Payment Details Family'
  };

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.incomeAttribution.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.incomeEvent.deleteMany();
    await prisma.spendingCategory.deleteMany();
    await prisma.budgetCategory.deleteMany();
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

    // Create budget category and spending category
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

    // Create test payment
    const paymentResponse = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        payee: 'Electric Company',
        amount: 125.50,
        dueDate: '2024-02-01',
        paymentType: 'recurring',
        frequency: 'monthly',
        spendingCategoryId: spendingCategoryId,
        autoPayEnabled: false,
        notes: 'Monthly electric bill'
      });

    testPaymentId = paymentResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Payment Details Request', () => {
    it('should return 200 with detailed payment information', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate detailed payment response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id', testPaymentId);
      expect(response.body).toHaveProperty('payee', 'Electric Company');
      expect(response.body).toHaveProperty('amount', 125.50);
      expect(response.body).toHaveProperty('dueDate', '2024-02-01');
      expect(response.body).toHaveProperty('paidDate');
      expect(response.body).toHaveProperty('paidAmount');
      expect(response.body).toHaveProperty('paymentType', 'recurring');
      expect(response.body).toHaveProperty('frequency', 'monthly');
      expect(response.body).toHaveProperty('status', 'scheduled');
      expect(response.body).toHaveProperty('spendingCategory');
      expect(response.body).toHaveProperty('autoPayEnabled', false);
      expect(response.body).toHaveProperty('attributedAmount', 0);
      expect(response.body).toHaveProperty('remainingAmount', 125.50);
      expect(response.body).toHaveProperty('nextDueDate');
      expect(response.body).toHaveProperty('notes', 'Monthly electric bill');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('attributions');

      // Validate attributions array structure
      expect(Array.isArray(response.body.attributions)).toBe(true);

      // Validate spending category structure
      const spendingCategory = response.body.spendingCategory;
      expect(spendingCategory).toHaveProperty('id');
      expect(spendingCategory).toHaveProperty('name');
      expect(spendingCategory).toHaveProperty('color');
      expect(spendingCategory).toHaveProperty('icon');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.payee).toBe('string');
      expect(typeof response.body.amount).toBe('number');
      expect(typeof response.body.dueDate).toBe('string');
      expect(typeof response.body.autoPayEnabled).toBe('boolean');
      expect(typeof response.body.createdAt).toBe('string');
      expect(typeof response.body.updatedAt).toBe('string');
    });

    it('should include attributions when they exist', async () => {
      // Create income event
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

      // Create attribution
      await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/attributions`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          incomeEventId: incomeResponse.body.id,
          amount: 125.50
        });

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.attributions.length).toBeGreaterThan(0);

      // Validate attribution structure
      const attribution = response.body.attributions[0];
      expect(attribution).toHaveProperty('id');
      expect(attribution).toHaveProperty('incomeEventId');
      expect(attribution).toHaveProperty('incomeEventName');
      expect(attribution).toHaveProperty('amount');
      expect(attribution).toHaveProperty('attributionType');
      expect(attribution).toHaveProperty('createdAt');
      expect(attribution).toHaveProperty('createdByName');

      // Validate attribution data types
      expect(typeof attribution.id).toBe('string');
      expect(typeof attribution.incomeEventId).toBe('string');
      expect(typeof attribution.incomeEventName).toBe('string');
      expect(typeof attribution.amount).toBe('number');
      expect(typeof attribution.attributionType).toBe('string');
      expect(typeof attribution.createdAt).toBe('string');
      expect(typeof attribution.createdByName).toBe('string');

      // Validate enum values
      expect(['manual', 'automatic']).toContain(attribution.attributionType);

      // Validate updated attribution amounts
      expect(response.body.attributedAmount).toBe(125.50);
      expect(response.body.remainingAmount).toBe(0);
    });

    it('should handle paid payments correctly', async () => {
      // Mark payment as paid
      await request(API_BASE_URL)
        .post(`/api/payments/${testPaymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          paidDate: '2024-02-01',
          paidAmount: 120.00,
          notes: 'Paid with discount'
        });

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('paid');
      expect(response.body.paidDate).toBe('2024-02-01');
      expect(response.body.paidAmount).toBe(120.00);
    });

    it('should handle overdue payments correctly', async () => {
      // Create overdue payment
      const overduePaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Overdue Payment',
          amount: 100.00,
          dueDate: '2023-01-01', // past date
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${overduePaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('overdue');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent payment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${fakeId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid payment ID format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/payments/invalid-uuid')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });

    it('should return 404 for payment from another family', async () => {
      // Create second family with their own payment
      const secondFamily = {
        email: 'other.payment.details@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Payment Family'
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

      // Create budget and spending category for other family
      const otherBudgetResponse = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Budget Category',
          targetAmount: 1500.00,
          period: 'monthly'
        });

      const otherSpendingResponse = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Spending Category',
          budgetCategoryId: otherBudgetResponse.body.id,
          color: '#00FF00',
          icon: 'food'
        });

      // Create payment for other family
      const otherPaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          payee: 'Other Family Payment',
          amount: 200.00,
          dueDate: '2024-02-01',
          paymentType: 'once',
          spendingCategoryId: otherSpendingResponse.body.id
        });

      // Original user should not be able to access other family's payment
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${otherPaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Payment not found');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${testPaymentId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${testPaymentId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Different Payment Types', () => {
    it('should handle one-time payment details', async () => {
      const oncePaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'One-time Payment',
          amount: 75.00,
          dueDate: '2024-03-01',
          paymentType: 'once',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${oncePaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.paymentType).toBe('once');
      expect(response.body.frequency).toBe('once');
      expect(response.body.nextDueDate).toBeNull();
    });

    it('should handle variable payment details', async () => {
      const variablePaymentResponse = await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          payee: 'Variable Payment',
          amount: 150.00,
          dueDate: '2024-03-15',
          paymentType: 'variable',
          frequency: 'monthly',
          spendingCategoryId: spendingCategoryId
        });

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${variablePaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.paymentType).toBe('variable');
      expect(response.body.frequency).toBe('monthly');
      expect(response.body.nextDueDate).toBeTruthy();
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(typeof response.body).toBe('object');
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get(`/api/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);
    });
  });
});