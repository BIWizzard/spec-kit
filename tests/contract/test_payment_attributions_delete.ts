/**
 * Contract Test: DELETE /api/payments/{id}/attributions/{attributionId}
 * Task: T081d - Delete payment attribution endpoint
 *
 * This test validates the payment attribution deletion API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/payments/{id}/attributions/{attributionId}', () => {
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
        email: 'deleteattr@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Delete',
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

  describe('Valid Delete Attribution Requests', () => {
    it('should return 200 and delete attribution successfully', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message', 'Payment attribution deleted successfully');
      expect(response.body).toHaveProperty('deletedAttribution');

      // Validate deleted attribution object
      const { deletedAttribution } = response.body;
      expect(deletedAttribution).toHaveProperty('id', attributionId);
      expect(deletedAttribution).toHaveProperty('paymentId', paymentId);
      expect(deletedAttribution).toHaveProperty('incomeEventId', incomeEventId);
      expect(deletedAttribution).toHaveProperty('amount', 800.00);
      expect(deletedAttribution).toHaveProperty('attributionType', 'manual');
      expect(deletedAttribution).toHaveProperty('deletedAt');
      expect(typeof deletedAttribution.deletedAt).toBe('string');
    });

    it('should update income event allocations after deletion', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('updatedIncomeEvent');
      expect(response.body.updatedIncomeEvent.allocatedAmount).toBe(0.00); // 800 - 800 = 0
      expect(response.body.updatedIncomeEvent.remainingAmount).toBe(4000.00); // 3200 + 800 = 4000
    });

    it('should provide payment summary after deletion', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('paymentSummary');
      expect(response.body.paymentSummary).toHaveProperty('totalAttributed', 0.00);
      expect(response.body.paymentSummary).toHaveProperty('remainingAmount', 1200.00);
      expect(response.body.paymentSummary).toHaveProperty('fullyAttributed', false);
    });

    it('should handle deletion when multiple attributions exist', async () => {
      // Create another income event and attribution
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

      const attribution2 = await prisma.paymentAttribution.create({
        data: {
          id: 'attribution-2',
          paymentId,
          incomeEventId: incomeEvent2.id,
          amount: 400.00,
          attributionType: 'automatic',
          createdBy: 'system'
        }
      });

      // Delete the first attribution
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Payment should still have one attribution
      expect(response.body.paymentSummary.totalAttributed).toBe(400.00);
      expect(response.body.paymentSummary.remainingAmount).toBe(800.00);
      expect(response.body.paymentSummary.fullyAttributed).toBe(false);
    });
  });

  describe('Invalid Delete Attribution Requests', () => {
    it('should return 404 for non-existent payment', async () => {
      const nonExistentPaymentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${nonExistentPaymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Payment not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 404 for non-existent attribution', async () => {
      const nonExistentAttributionId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${nonExistentAttributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Attribution not found');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid payment ID format', async () => {
      const invalidIds = ['invalid-id', '123', 'not-a-uuid', ''];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .delete(`/api/payments/${invalidId}/attributions/${attributionId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid payment ID');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid attribution ID format', async () => {
      const invalidIds = ['invalid-id', '123', 'not-a-uuid', ''];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .delete(`/api/payments/${paymentId}/attributions/${invalidId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid attribution ID');
      }
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

      // Try to delete other attribution via wrong payment
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${otherAttribution.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Attribution does not belong to specified payment');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 409 when trying to delete already deleted attribution', async () => {
      // Delete the attribution first
      await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Try to delete again
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Attribution already deleted');
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Authorization and Family Data Isolation', () => {
    it('should return 403 when trying to delete attribution from different family', async () => {
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

      // Try to delete other family's attribution with current user's token
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${otherPayment.id}/attributions/${otherAttribution.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body).toHaveProperty('message', 'Access denied to this payment');
    });

    it('should only allow family members with edit permissions', async () => {
      // This would be tested if role-based permissions are implemented
      // For now, admin user should be able to delete
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('Payment attribution deleted successfully');
    });
  });

  describe('Audit Trail and History', () => {
    it('should create audit log entry for deletion', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('auditTrail');
      expect(response.body.auditTrail).toHaveProperty('action', 'delete_attribution');
      expect(response.body.auditTrail).toHaveProperty('deletedBy');
      expect(response.body.auditTrail).toHaveProperty('deletedAt');
      expect(response.body.auditTrail).toHaveProperty('originalAmount', 800.00);
    });

    it('should preserve attribution data for audit purposes', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Deleted attribution should still contain all original data
      expect(response.body.deletedAttribution).toHaveProperty('amount', 800.00);
      expect(response.body.deletedAttribution).toHaveProperty('attributionType', 'manual');
      expect(response.body.deletedAttribution).toHaveProperty('createdBy', 'user-1');
      expect(response.body.deletedAttribution).toHaveProperty('createdAt');
    });
  });

  describe('Business Logic Effects', () => {
    it('should handle cascading effects on payment and income calculations', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Payment should become unattributed
      expect(response.body.paymentSummary.fullyAttributed).toBe(false);
      expect(response.body.paymentSummary.totalAttributed).toBe(0.00);
      expect(response.body.paymentSummary.remainingAmount).toBe(1200.00);

      // Income event should have amount returned to remaining
      expect(response.body.updatedIncomeEvent.allocatedAmount).toBe(0.00);
      expect(response.body.updatedIncomeEvent.remainingAmount).toBe(4000.00);
    });

    it('should provide impact summary for deletion', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('impactSummary');
      expect(response.body.impactSummary).toHaveProperty('amountReleased', 800.00);
      expect(response.body.impactSummary).toHaveProperty('paymentNowUnattributed', true);
      expect(response.body.impactSummary).toHaveProperty('incomeAmountReturned', 800.00);
    });
  });

  describe('Edge Cases', () => {
    it('should handle deletion when payment status is paid', async () => {
      // Update payment status to paid
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'paid',
          paidDate: new Date(),
          paidAmount: 1200.00
        }
      });

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('Payment attribution deleted successfully');
      expect(response.body).toHaveProperty('warning', 'Payment was already paid - attribution removed from historical record');
    });

    it('should handle deletion when income event is received', async () => {
      // Update income event status to received
      await prisma.incomeEvent.update({
        where: { id: incomeEventId },
        data: {
          status: 'received',
          actualDate: new Date(),
          actualAmount: 4000.00
        }
      });

      const response = await request(API_BASE_URL)
        .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('Payment attribution deleted successfully');
      expect(response.body).toHaveProperty('warning', 'Income was already received - attribution removed from historical record');
    });

    it('should handle concurrent deletion attempts', async () => {
      // Make multiple concurrent delete requests
      const promises = Array(2).fill(0).map(() =>
        request(API_BASE_URL)
          .delete(`/api/payments/${paymentId}/attributions/${attributionId}`)
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.allSettled(promises);

      // One should succeed (200), one should fail (409 - already deleted)
      const statuses = responses.map(r =>
        r.status === 'fulfilled' ? r.value.status : 500
      );

      expect(statuses).toContain(200); // One success
      expect(statuses).toContain(409); // One conflict (already deleted)
    });
  });
});