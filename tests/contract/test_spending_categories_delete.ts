/**
 * Contract Test: DELETE /api/spending-categories/{id}
 * Task: T081 - Delete spending category endpoint
 *
 * This test validates the spending category deletion API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: DELETE /api/spending-categories/{id}', () => {
  let userToken: string;
  let familyId: string;
  let categoryId: string;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.transaction.deleteMany();
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
        email: 'categorytest@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Category',
        lastName: 'Test',
        familyName: 'Category Family'
      });

    userToken = registerResponse.body.tokens.accessToken;
    familyId = registerResponse.body.family.id;

    // Create test budget category first
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

    // Create test spending category
    const spendingCategory = await prisma.spendingCategory.create({
      data: {
        id: 'spending-category-1',
        familyId,
        name: 'Groceries',
        budgetCategoryId: budgetCategory.id,
        icon: '🛒',
        color: '#4CAF50',
        monthlyTarget: 500.00,
        isActive: true
      }
    });

    categoryId = spendingCategory.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Delete Requests', () => {
    it('should return 200 and delete spending category successfully', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message', 'Spending category deleted successfully');
      expect(response.body).toHaveProperty('deletedCategory');

      // Validate deleted category object
      const { deletedCategory } = response.body;
      expect(deletedCategory).toHaveProperty('id', categoryId);
      expect(deletedCategory).toHaveProperty('name', 'Groceries');
      expect(deletedCategory).toHaveProperty('isActive', false); // Should be soft deleted
      expect(deletedCategory).toHaveProperty('deletedAt');
      expect(typeof deletedCategory.deletedAt).toBe('string');
    });

    it('should soft delete category (set isActive to false)', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.deletedCategory.isActive).toBe(false);
      expect(response.body.deletedCategory).toHaveProperty('deletedAt');
    });

    it('should handle deletion with force parameter for hard delete', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}?force=true`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toBe('Spending category deleted successfully');
      expect(response.body).toHaveProperty('hardDelete', true);
    });
  });

  describe('Invalid Delete Requests', () => {
    it('should return 404 for non-existent category', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Spending category not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid category ID format', async () => {
      const invalidIds = ['invalid-id', '123', 'not-a-uuid', ''];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .delete(`/api/spending-categories/${invalidId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid category ID');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 409 when category has associated transactions', async () => {
      // Create bank account first
      const bankAccount = await prisma.bankAccount.create({
        data: {
          id: 'bank-account-1',
          familyId,
          plaidAccountId: 'plaid-account-1',
          plaidItemId: 'plaid-item-1',
          institutionName: 'Test Bank',
          accountName: 'Checking',
          accountType: 'checking',
          accountNumber: '1234',
          currentBalance: 1000.00,
          availableBalance: 950.00,
          syncStatus: 'active'
        }
      });

      // Create transaction using the spending category
      await prisma.transaction.create({
        data: {
          id: 'transaction-1',
          bankAccountId: bankAccount.id,
          plaidTransactionId: 'plaid-transaction-1',
          amount: -50.00,
          date: new Date(),
          description: 'Grocery Store Purchase',
          spendingCategoryId: categoryId,
          categoryConfidence: 0.95,
          userCategorized: false,
          pending: false
        }
      });

      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Cannot delete category with associated transactions');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('associatedCount');
      expect(typeof response.body.associatedCount).toBe('number');
    });

    it('should return 409 when category has associated payments', async () => {
      // Create payment using the spending category
      await prisma.payment.create({
        data: {
          id: 'payment-1',
          familyId,
          payee: 'Grocery Store',
          amount: 100.00,
          dueDate: new Date(),
          paymentType: 'once',
          status: 'scheduled',
          spendingCategoryId: categoryId,
          autoPayEnabled: false
        }
      });

      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.error).toBe('Cannot delete category with associated payments');
      expect(response.body).toHaveProperty('associatedCount');
    });

    it('should return 409 when trying to delete already deleted category', async () => {
      // Delete the category first
      await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Try to delete again
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Category already deleted');
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Authorization and Family Data Isolation', () => {
    it('should return 403 when trying to delete category from different family', async () => {
      // Create another family with spending category
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

      const otherCategory = await prisma.spendingCategory.create({
        data: {
          id: 'other-category-id',
          familyId: otherFamilyId,
          name: 'Other Category',
          budgetCategoryId: otherBudgetCategory.id,
          icon: '🏠',
          color: '#2196F3',
          isActive: true
        }
      });

      // Try to delete other family's category with current user's token
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${otherCategory.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body).toHaveProperty('message', 'Access denied to this spending category');
    });

    it('should only allow family members with edit permissions', async () => {
      // This would be tested if role-based permissions are implemented
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Admin user should be able to delete
      expect(response.body.message).toBe('Spending category deleted successfully');
    });
  });

  describe('Query Parameters', () => {
    it('should handle force deletion parameter', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}?force=true`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('hardDelete', true);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}?force=invalid`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('Cascading Effects', () => {
    it('should provide information about cascading effects', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/spending-categories/${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('cascadeEffects');
      expect(response.body.cascadeEffects).toHaveProperty('uncategorizedTransactions');
      expect(response.body.cascadeEffects).toHaveProperty('affectedPayments');
    });
  });
});