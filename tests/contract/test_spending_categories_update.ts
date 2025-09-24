/**
 * Contract Test: PUT /api/spending-categories/{categoryId}
 * Task: T080 - Spending categories update endpoint contract validation
 *
 * This test validates the spending categories update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/spending-categories/{categoryId}', () => {
  let authTokens: any;
  let budgetCategoryId: string;
  let testCategoryId: string;
  const testUser = {
    email: 'spending.update@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Spending',
    lastName: 'Update',
    familyName: 'Spending Update Family'
  };

  beforeEach(async () => {
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

    budgetCategoryId = budgetCategoryResponse.body.id;

    const categoryResponse = await request(API_BASE_URL)
      .post('/api/spending-categories')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Original Category',
        budgetCategoryId: budgetCategoryId,
        color: '#FF0000',
        icon: 'bill'
      });

    testCategoryId = categoryResponse.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Spending Category Updates', () => {
    it('should update spending category and return 200', async () => {
      const updateData = {
        name: 'Updated Category',
        color: '#00FF00',
        icon: 'food',
        monthlyTarget: 250.00
      };

      const response = await request(API_BASE_URL)
        .put(`/api/spending-categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', testCategoryId);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('color', updateData.color);
      expect(response.body).toHaveProperty('icon', updateData.icon);
      expect(response.body).toHaveProperty('monthlyTarget', updateData.monthlyTarget);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should deactivate spending category', async () => {
      const updateData = {
        isActive: false
      };

      const response = await request(API_BASE_URL)
        .put(`/api/spending-categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('isActive', false);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent category', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/api/spending-categories/${fakeId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ name: 'Updated Name' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Spending category not found');
    });

    it('should return 400 for invalid color format', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/spending-categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ color: 'invalid-color' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/spending-categories/${testCategoryId}`)
        .send({ name: 'Updated Name' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });
});