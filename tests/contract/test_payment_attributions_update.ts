/**
 * Contract Test: PUT /api/payments/{id}/attributions/{attributionId}
 * Task: T081c - Update payment attribution endpoint
 *
 * This test validates the payment attribution update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/payments/{id}/attributions/{attributionId}', () => {
  let userToken: string;
  let familyId: string;
  let paymentId: string;
  let incomeEventId: string;
  let attributionId: string;

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
        email: 'updateattr@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Update',
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
        allocatedAmount: 800.00,
        remainingAmount: 3200.00
      }
    });

    incomeEventId = incomeEvent.id;

    // Create payment attribution
    const attribution = await prisma.paymentAttribution.create({
      data: {
        id: 'attribution-1',
        paymentId: payment.id,
        incomeEventId: incomeEvent.id,
        amount: 800.00,
        attributionType: 'manual',
        createdBy: 'user-1'
      }
    });

    attributionId = attribution.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Update Attribution Requests', () => {
    it('should return 200 and update attribution amount successfully', async () => {
      const updateData = {
        amount: 600.00
      };

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message', 'Payment attribution updated successfully');
      expect(response.body).toHaveProperty('attribution');

      // Validate updated attribution object
      const { attribution } = response.body;
      expect(attribution).toHaveProperty('id', attributionId);
      expect(attribution).toHaveProperty('amount', 600.00);
      expect(attribution).toHaveProperty('updatedAt');
      expect(typeof attribution.updatedAt).toBe('string');
    });

    it('should update attribution type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          attributionType: 'automatic'
        })
        .expect(200);

      expect(response.body.attribution.attributionType).toBe('automatic');
    });

    it('should update both amount and type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 900.00,
          attributionType: 'automatic'
        })
        .expect(200);

      expect(response.body.attribution.amount).toBe(900.00);
      expect(response.body.attribution.attributionType).toBe('automatic');
    });

    it('should update income event allocations after amount change', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1000.00 // Increase from 800 to 1000
        })
        .expect(200);

      expect(response.body).toHaveProperty('updatedIncomeEvent');
      expect(response.body.updatedIncomeEvent.allocatedAmount).toBe(1000.00);
      expect(response.body.updatedIncomeEvent.remainingAmount).toBe(3000.00);
    });

    it('should handle partial updates with empty body', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(200);

      // Should return current attribution unchanged
      expect(response.body.attribution.amount).toBe(800.00);
      expect(response.body.attribution.attributionType).toBe('manual');
    });
  });

  describe('Invalid Update Attribution Requests', () => {
    it('should return 400 for invalid amount values', async () => {
      const invalidAmounts = [0, -100, 'invalid', null];

      for (const amount of invalidAmounts) {
        const response = await request(API_BASE_URL)
          .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ amount })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid attribution type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          attributionType: 'invalid_type'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 404 for non-existent payment', async () => {
      const nonExistentPaymentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${nonExistentPaymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 600.00
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
    });

    it('should return 404 for non-existent attribution', async () => {
      const nonExistentAttributionId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${nonExistentAttributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 600.00
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Attribution not found');
    });

    it('should return 400 for invalid UUID formats', async () => {
      const invalidIds = ['invalid-id', '123', 'not-a-uuid'];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .put(`/api/payments/${invalidId}/attributions/${attributionId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            amount: 600.00
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid payment ID');
      }
    });

    it('should return 400 when updated amount exceeds income remaining', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 4000.00 // More than income event total (4000 - current allocation + this would exceed)
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Insufficient income remaining');
      expect(response.body).toHaveProperty('availableAmount');
      expect(response.body).toHaveProperty('requestedAmount', 4000.00);
    });

    it('should return 400 when updated amount exceeds payment amount', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1500.00 // More than payment amount of 1200
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Attribution exceeds payment amount');
      expect(response.body).toHaveProperty('paymentAmount', 1200.00);
      expect(response.body).toHaveProperty('requestedAmount', 1500.00);
    });

    it('should return 409 when attribution belongs to different payment', async () => {
      // Create another payment and attribution
      const otherPayment = await prisma.payment.create({
        data: {
          id: 'other-payment',
          familyId,
          payee: 'Utility Company',
          amount: 150.00,
          dueDate: new Date('2024-01-15'),
          paymentType: 'recurring',
          frequency: 'monthly',
          status: 'scheduled',
          spendingCategoryId: 'spending-category-1',
          autoPayEnabled: true
        }
      });

      const otherAttribution = await prisma.paymentAttribution.create({
        data: {
          id: 'other-attribution',
          paymentId: otherPayment.id,
          incomeEventId,
          amount: 150.00,
          attributionType: 'manual',
          createdBy: 'user-1'
        }
      });

      // Try to update other attribution via wrong payment
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${otherAttribution.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 100.00
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Attribution does not belong to specified payment');
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .send({
          amount: 600.00
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          amount: 600.00
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          amount: 600.00
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Family Data Isolation', () => {
    it('should return 403 when trying to update attribution from different family', async () => {
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

      // Create payment and attribution in other family
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
          id: 'other-payment',
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

      const otherIncomeEvent = await prisma.incomeEvent.create({
        data: {
          id: 'other-income',
          familyId: otherFamilyId,
          name: 'Other Salary',
          amount: 3000.00,
          scheduledDate: new Date('2024-02-01'),
          frequency: 'monthly',
          status: 'scheduled',
          allocatedAmount: 500.00,
          remainingAmount: 2500.00
        }
      });

      const otherAttribution = await prisma.paymentAttribution.create({
        data: {
          id: 'other-attribution',
          paymentId: otherPayment.id,
          incomeEventId: otherIncomeEvent.id,
          amount: 500.00,
          attributionType: 'manual',
          createdBy: 'other-user'
        }
      });

      // Try to update other family's attribution with current user's token
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${otherPayment.id}/attributions/${otherAttribution.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 400.00
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body).toHaveProperty('message', 'Access denied to this payment');
    });
  });

  describe('Business Logic Validation', () => {
    it('should handle currency precision correctly', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 123.456 // Should be rounded to 2 decimal places
        })
        .expect(200);

      expect(response.body.attribution.amount).toBe(123.46);
    });

    it('should update attribution history/audit trail', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 700.00
        })
        .expect(200);

      expect(response.body).toHaveProperty('auditTrail');
      expect(response.body.auditTrail).toHaveProperty('previousAmount', 800.00);
      expect(response.body.auditTrail).toHaveProperty('newAmount', 700.00);
      expect(response.body.auditTrail).toHaveProperty('updatedBy');
    });

    it('should provide payment and income event summaries after update', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 500.00
        })
        .expect(200);

      expect(response.body).toHaveProperty('paymentSummary');
      expect(response.body.paymentSummary).toHaveProperty('totalAttributed', 500.00);
      expect(response.body.paymentSummary).toHaveProperty('remainingAmount', 700.00);
      expect(response.body.paymentSummary).toHaveProperty('fullyAttributed', false);

      expect(response.body).toHaveProperty('updatedIncomeEvent');
      expect(response.body.updatedIncomeEvent).toHaveProperty('allocatedAmount', 500.00);
      expect(response.body.updatedIncomeEvent).toHaveProperty('remainingAmount', 3500.00);
    });
  });

  describe('Content-Type Validation', () => {
    it('should require application/json content type', async () => {
      await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send('amount=600')
        .expect(400);
    });

    it('should handle empty request body gracefully', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send()
        .expect(200);

      // Should return unchanged attribution
      expect(response.body.attribution.amount).toBe(800.00);
    });
  });
});