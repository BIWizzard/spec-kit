/**
 * Contract Test: GET /api/payments/{id}/attributions
 * Task: T081a - List payment attributions endpoint
 *
 * This test validates the payment attributions list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/payments/{id}/attributions', () => {
  let userToken: string;
  let familyId: string;
  let paymentId: string;

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
        email: 'attributions@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Attribution',
        lastName: 'Test',
        familyName: 'Attribution Family'
      });

    userToken = registerResponse.body.tokens.accessToken;
    familyId = registerResponse.body.family.id;

    // Create budget category
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

    // Create spending category
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

    // Create income events
    const incomeEvent1 = await prisma.incomeEvent.create({
      data: {
        id: 'income-1',
        familyId,
        name: 'Monthly Salary',
        amount: 4000.00,
        scheduledDate: new Date('2024-01-01'),
        frequency: 'monthly',
        status: 'scheduled',
        allocatedAmount: 800.00,
        remainingAmount: 3200.00
      }
    });

    const incomeEvent2 = await prisma.incomeEvent.create({
      data: {
        id: 'income-2',
        familyId,
        name: 'Freelance Work',
        amount: 1500.00,
        scheduledDate: new Date('2024-01-15'),
        frequency: 'once',
        status: 'scheduled',
        allocatedAmount: 400.00,
        remainingAmount: 1100.00
      }
    });

    // Create payment attributions
    await prisma.paymentAttribution.createMany({
      data: [
        {
          id: 'attribution-1',
          paymentId: payment.id,
          incomeEventId: incomeEvent1.id,
          amount: 800.00,
          attributionType: 'manual',
          createdBy: 'user-1'
        },
        {
          id: 'attribution-2',
          paymentId: payment.id,
          incomeEventId: incomeEvent2.id,
          amount: 400.00,
          attributionType: 'automatic',
          createdBy: 'system'
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid List Requests', () => {
    it('should return 200 with list of payment attributions', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('attributions');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('paymentAmount');
      expect(response.body).toHaveProperty('remainingAmount');
      expect(response.body).toHaveProperty('fullyAttributed');

      // Validate attributions array
      expect(Array.isArray(response.body.attributions)).toBe(true);
      expect(response.body.attributions).toHaveLength(2);

      // Validate each attribution object
      response.body.attributions.forEach((attribution: any) => {
        expect(attribution).toHaveProperty('id');
        expect(attribution).toHaveProperty('paymentId', paymentId);
        expect(attribution).toHaveProperty('incomeEventId');
        expect(attribution).toHaveProperty('amount');
        expect(attribution).toHaveProperty('attributionType');
        expect(attribution).toHaveProperty('createdAt');
        expect(attribution).toHaveProperty('createdBy');
        expect(attribution).toHaveProperty('incomeEvent');

        // Validate data types
        expect(typeof attribution.id).toBe('string');
        expect(typeof attribution.amount).toBe('number');
        expect(['manual', 'automatic']).toContain(attribution.attributionType);
        expect(typeof attribution.createdAt).toBe('string');

        // Validate nested incomeEvent object
        expect(attribution.incomeEvent).toHaveProperty('id');
        expect(attribution.incomeEvent).toHaveProperty('name');
        expect(attribution.incomeEvent).toHaveProperty('amount');
        expect(attribution.incomeEvent).toHaveProperty('scheduledDate');
      });

      // Validate summary calculations
      expect(typeof response.body.totalAmount).toBe('number');
      expect(typeof response.body.paymentAmount).toBe('number');
      expect(typeof response.body.remainingAmount).toBe('number');
      expect(typeof response.body.fullyAttributed).toBe('boolean');

      expect(response.body.totalAmount).toBe(1200.00); // 800 + 400
      expect(response.body.paymentAmount).toBe(1200.00);
      expect(response.body.remainingAmount).toBe(0.00);
      expect(response.body.fullyAttributed).toBe(true);
    });

    it('should return empty list for payment with no attributions', async () => {
      // Create payment without attributions
      const spendingCategory = await prisma.spendingCategory.findFirst();
      const paymentWithoutAttributions = await prisma.payment.create({
        data: {
          id: 'payment-no-attributions',
          familyId,
          payee: 'Utility Company',
          amount: 150.00,
          dueDate: new Date('2024-02-01'),
          paymentType: 'recurring',
          frequency: 'monthly',
          status: 'scheduled',
          spendingCategoryId: spendingCategory!.id,
          autoPayEnabled: true
        }
      });

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentWithoutAttributions.id}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.attributions).toEqual([]);
      expect(response.body.totalAmount).toBe(0.00);
      expect(response.body.paymentAmount).toBe(150.00);
      expect(response.body.remainingAmount).toBe(150.00);
      expect(response.body.fullyAttributed).toBe(false);
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions?limit=1&offset=0`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.attributions).toHaveLength(1);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('limit', 1);
      expect(response.body.pagination).toHaveProperty('offset', 0);
      expect(response.body.pagination).toHaveProperty('total', 2);
      expect(response.body.pagination).toHaveProperty('hasMore', true);
    });

    it('should support sorting by creation date', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions?sortBy=createdAt&sortOrder=desc`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.attributions).toHaveLength(2);

      // Verify sorting (newest first)
      const createdDates = response.body.attributions.map((a: any) => new Date(a.createdAt));
      expect(createdDates[0] >= createdDates[1]).toBe(true);
    });

    it('should filter by attribution type', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions?type=manual`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.attributions).toHaveLength(1);
      expect(response.body.attributions[0].attributionType).toBe('manual');
    });
  });

  describe('Invalid List Requests', () => {
    it('should return 404 for non-existent payment', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${nonExistentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid payment ID format', async () => {
      const invalidIds = ['invalid-id', '123', 'not-a-uuid'];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .get(`/api/payments/${invalidId}/attributions`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid payment ID');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid query parameters', async () => {
      const invalidParams = [
        'limit=invalid',
        'offset=-1',
        'sortBy=invalid_field',
        'sortOrder=invalid_order',
        'type=invalid_type'
      ];

      for (const params of invalidParams) {
        const response = await request(API_BASE_URL)
          .get(`/api/payments/${paymentId}/attributions?${params}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid query parameters');
      }
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Family Data Isolation', () => {
    it('should return 403 when trying to access payment from different family', async () => {
      // Create another family with payment
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

      const otherBudgetCategory = await prisma.budgetCategory.create({
        data: {
          id: 'other-budget-category',
          familyId: otherFamilyId,
          name: 'Other Needs',
          targetPercentage: 50.0,
          color: '#FF5733',
          sortOrder: 1,
          isActive: true
        }
      });

      const otherSpendingCategory = await prisma.spendingCategory.create({
        data: {
          id: 'other-spending-category',
          familyId: otherFamilyId,
          name: 'Other Housing',
          budgetCategoryId: otherBudgetCategory.id,
          icon: '🏠',
          color: '#2196F3',
          isActive: true
        }
      });

      const otherPayment = await prisma.payment.create({
        data: {
          id: 'other-payment-id',
          familyId: otherFamilyId,
          payee: 'Other Landlord',
          amount: 1000.00,
          dueDate: new Date('2024-02-01'),
          paymentType: 'recurring',
          frequency: 'monthly',
          status: 'scheduled',
          spendingCategoryId: otherSpendingCategory.id,
          autoPayEnabled: false
        }
      });

      // Try to access other family's payment with current user's token
      const response = await request(API_BASE_URL)
        .get(`/api/payments/${otherPayment.id}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body).toHaveProperty('message', 'Access denied to this payment');
    });
  });

  describe('Edge Cases', () => {
    it('should handle payment with partial attributions', async () => {
      // Delete one attribution to make it partial
      await prisma.paymentAttribution.delete({
        where: { id: 'attribution-2' }
      });

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.attributions).toHaveLength(1);
      expect(response.body.totalAmount).toBe(800.00);
      expect(response.body.paymentAmount).toBe(1200.00);
      expect(response.body.remainingAmount).toBe(400.00);
      expect(response.body.fullyAttributed).toBe(false);
    });

    it('should handle over-attributed payments', async () => {
      // Add another attribution that exceeds payment amount
      const incomeEvent3 = await prisma.incomeEvent.create({
        data: {
          id: 'income-3',
          familyId,
          name: 'Bonus Payment',
          amount: 500.00,
          scheduledDate: new Date('2024-01-20'),
          frequency: 'once',
          status: 'scheduled',
          allocatedAmount: 200.00,
          remainingAmount: 300.00
        }
      });

      await prisma.paymentAttribution.create({
        data: {
          id: 'attribution-3',
          paymentId,
          incomeEventId: incomeEvent3.id,
          amount: 200.00,
          attributionType: 'manual',
          createdBy: 'user-1'
        }
      });

      const response = await request(API_BASE_URL)
        .get(`/api/payments/${paymentId}/attributions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.totalAmount).toBe(1400.00); // 800 + 400 + 200
      expect(response.body.paymentAmount).toBe(1200.00);
      expect(response.body.remainingAmount).toBe(-200.00); // Over-attributed
      expect(response.body.fullyAttributed).toBe(true);
      expect(response.body).toHaveProperty('overAttributed', true);
    });
  });
});