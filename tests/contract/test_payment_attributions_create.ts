/**
 * Contract Test: POST /api/payments/{id}/attributions
 * Task: T081b - Create payment attribution endpoint
 *
 * This test validates the payment attribution creation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/payments/{id}/attributions', () => {
  let userToken: string;
  let familyId: string;
  let paymentId: string;
  let incomeEventId: string;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.paymentAttribution.deleteMany();
    await prisma.incomeEvent.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.spendingCategory.deleteMany();
    await prisma.budgetCategory.deleteMany();
    await prisma.session.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user and family
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'createattr@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Create',
        lastName: 'Attribution',
        familyName: 'Attribution Family'
      });

    userToken = registerResponse.body.tokens.accessToken;
    familyId = registerResponse.body.family.id;

    // Create budget and spending category
    const budgetCategory = await prisma.budgetCategory.create({
      data: {
        id: 'budget-category-1',
        familyId,
        name: 'Needs',
        targetPercentage: 50.0,
        color: '#FF5733',
        sortOrder: 1,
        isActive: true
      }
    });

    const spendingCategory = await prisma.spendingCategory.create({
      data: {
        id: 'spending-category-1',
        familyId,
        name: 'Housing',
        budgetCategoryId: budgetCategory.id,
        icon: '🏠',
        color: '#4CAF50',
        monthlyTarget: 1200.00,
        isActive: true
      }
    });

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        id: 'payment-1',
        familyId,
        payee: 'Landlord Properties',
        amount: 1200.00,
        dueDate: new Date('2024-01-01'),
        paymentType: 'recurring',
        frequency: 'monthly',
        status: 'scheduled',
        spendingCategoryId: spendingCategory.id,
        autoPayEnabled: false
      }
    });

    paymentId = payment.id;

    // Create income event
    const incomeEvent = await prisma.incomeEvent.create({
      data: {
        id: 'income-1',
        familyId,
        name: 'Monthly Salary',
        amount: 4000.00,
        scheduledDate: new Date('2024-01-01'),
        frequency: 'monthly',
        status: 'scheduled',
        allocatedAmount: 0.00,
        remainingAmount: 4000.00
      }
    });

    incomeEventId = incomeEvent.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Create Attribution Requests', () => {
    it('should return 201 and create payment attribution successfully', async () => {
      const attributionData = {
        incomeEventId,
        amount: 800.00,
        attributionType: 'manual'
      };

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(attributionData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message', 'Payment attribution created successfully');
      expect(response.body).toHaveProperty('attribution');

      // Validate attribution object
      const { attribution } = response.body;
      expect(attribution).toHaveProperty('id');
      expect(attribution).toHaveProperty('paymentId', paymentId);
      expect(attribution).toHaveProperty('incomeEventId', incomeEventId);
      expect(attribution).toHaveProperty('amount', 800.00);
      expect(attribution).toHaveProperty('attributionType', 'manual');
      expect(attribution).toHaveProperty('createdAt');
      expect(attribution).toHaveProperty('createdBy');

      // Validate data types
      expect(typeof attribution.id).toBe('string');
      expect(typeof attribution.createdAt).toBe('string');
      expect(typeof attribution.createdBy).toBe('string');
    });

    it('should update income event remaining amount after attribution', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 600.00,
          attributionType: 'manual'
        })
        .expect(201);

      expect(response.body).toHaveProperty('updatedIncomeEvent');
      expect(response.body.updatedIncomeEvent.allocatedAmount).toBe(600.00);
      expect(response.body.updatedIncomeEvent.remainingAmount).toBe(3400.00);
    });

    it('should create automatic attribution', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 1200.00,
          attributionType: 'automatic'
        })
        .expect(201);

      expect(response.body.attribution.attributionType).toBe('automatic');
      expect(response.body.attribution.createdBy).toBe('system');
    });

    it('should handle partial attribution amounts', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 500.00,
          attributionType: 'manual'
        })
        .expect(201);

      expect(response.body.attribution.amount).toBe(500.00);
      expect(response.body).toHaveProperty('paymentSummary');
      expect(response.body.paymentSummary.totalAttributed).toBe(500.00);
      expect(response.body.paymentSummary.remainingAmount).toBe(700.00);
      expect(response.body.paymentSummary.fullyAttributed).toBe(false);
    });
  });

  describe('Invalid Create Attribution Requests', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { amount: 800.00, attributionType: 'manual' }, // Missing incomeEventId
        { incomeEventId, attributionType: 'manual' }, // Missing amount
        { incomeEventId, amount: 800.00 }, // Missing attributionType
        {} // Empty request
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post(`/api/payments/${paymentId}/attributions`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for invalid amount values', async () => {
      const invalidAmounts = [0, -100, 'invalid', null];

      for (const amount of invalidAmounts) {
        const response = await request(API_BASE_URL)
          .post(`/api/payments/${paymentId}/attributions`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            incomeEventId,
            amount,
            attributionType: 'manual'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid attribution type', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 800.00,
          attributionType: 'invalid_type'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 404 for non-existent payment', async () => {
      const nonExistentPaymentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${nonExistentPaymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 800.00,
          attributionType: 'manual'
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
    });

    it('should return 404 for non-existent income event', async () => {
      const nonExistentIncomeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId: nonExistentIncomeId,
          amount: 800.00,
          attributionType: 'manual'
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Income event not found');
    });

    it('should return 400 when attribution exceeds income remaining amount', async () => {
      // First create an attribution that uses most of the income
      await prisma.paymentAttribution.create({
        data: {
          id: 'existing-attribution',
          paymentId,
          incomeEventId,
          amount: 3800.00,
          attributionType: 'manual',
          createdBy: 'user-1'
        }
      });

      // Update income event to reflect the allocation
      await prisma.incomeEvent.update({
        where: { id: incomeEventId },
        data: {
          allocatedAmount: 3800.00,
          remainingAmount: 200.00
        }
      });

      // Try to attribute more than remaining
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 500.00, // More than remaining 200
          attributionType: 'manual'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Insufficient income remaining');
      expect(response.body).toHaveProperty('availableAmount', 200.00);
      expect(response.body).toHaveProperty('requestedAmount', 500.00);
    });

    it('should return 409 for duplicate attribution', async () => {
      // Create first attribution
      await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 800.00,
          attributionType: 'manual'
        })
        .expect(201);

      // Try to create duplicate
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 400.00,
          attributionType: 'manual'
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Attribution already exists');
      expect(response.body).toHaveProperty('message', 'Payment is already attributed to this income event');
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .send({
          incomeEventId,
          amount: 800.00,
          attributionType: 'manual'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          incomeEventId,
          amount: 800.00,
          attributionType: 'manual'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Family Data Isolation', () => {
    it('should return 403 when trying to attribute payment from different family', async () => {
      // Create another family
      const otherFamilyResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'otherfamily@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Other',
          lastName: 'Family',
          familyName: 'Other Family'
        });

      const otherFamilyId = otherFamilyResponse.body.family.id;

      // Create income event in other family
      const otherIncomeEvent = await prisma.incomeEvent.create({
        data: {
          id: 'other-income-1',
          familyId: otherFamilyId,
          name: 'Other Family Salary',
          amount: 3000.00,
          scheduledDate: new Date('2024-01-01'),
          frequency: 'monthly',
          status: 'scheduled',
          allocatedAmount: 0.00,
          remainingAmount: 3000.00
        }
      });

      // Try to attribute current family's payment to other family's income
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId: otherIncomeEvent.id,
          amount: 800.00,
          attributionType: 'manual'
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body).toHaveProperty('message', 'Cannot attribute across different families');
    });
  });

  describe('Business Logic Validation', () => {
    it('should prevent over-attribution of payment', async () => {
      // Create multiple attributions that exceed payment amount
      await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 1000.00,
          attributionType: 'manual'
        })
        .expect(201);

      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 500.00, // Would exceed payment amount of 1200
          attributionType: 'manual'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Attribution exceeds payment amount');
      expect(response.body).toHaveProperty('paymentAmount', 1200.00);
      expect(response.body).toHaveProperty('currentlyAttributed', 1000.00);
      expect(response.body).toHaveProperty('availableAmount', 200.00);
    });

    it('should handle precision for currency amounts', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          incomeEventId,
          amount: 123.456, // Should be rounded to 2 decimal places
          attributionType: 'manual'
        })
        .expect(201);

      expect(response.body.attribution.amount).toBe(123.46);
    });
  });

  describe('Content-Type Validation', () => {
    it('should require application/json content type', async () => {
      await request(API_BASE_URL)
        .post(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send('incomeEventId=test&amount=800&attributionType=manual')
        .expect(400);
    });
  });
});