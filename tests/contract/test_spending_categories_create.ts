/**
 * Contract Test: POST /api/spending-categories
 * Task: T079 - Spending categories create endpoint contract validation
 *
 * This test validates the spending categories creation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/spending-categories', () => {
  let authTokens: any;
  let budgetCategoryId: string;
  const testUser = {
    email: 'spending.create@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Spending',
    lastName: 'Create',
    familyName: 'Spending Create Family'
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Spending Category Creation', () => {
    it('should create spending category with required fields and return 201', async () => {
      const categoryData = {
        name: 'Bills & Utilities',
        budgetCategoryId: budgetCategoryId
      };

      const response = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(categoryData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', categoryData.name);
      expect(response.body).toHaveProperty('budgetCategoryId', categoryData.budgetCategoryId);
      expect(response.body).toHaveProperty('parentCategoryId', null);
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create spending category with all optional fields', async () => {
      const parentResponse = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Parent Category',
          budgetCategoryId: budgetCategoryId
        });

      const categoryData = {
        name: 'Transportation',
        parentCategoryId: parentResponse.body.id,
        budgetCategoryId: budgetCategoryId,
        icon: 'car',
        color: '#FF0000',
        monthlyTarget: 500.00
      };

      const response = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(categoryData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('parentCategoryId', categoryData.parentCategoryId);
      expect(response.body).toHaveProperty('icon', categoryData.icon);
      expect(response.body).toHaveProperty('color', categoryData.color);
      expect(response.body).toHaveProperty('monthlyTarget', categoryData.monthlyTarget);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidCategories = [
        { budgetCategoryId }, // missing name
        { name: 'Test Category' } // missing budgetCategoryId
      ];

      for (const categoryData of invalidCategories) {
        const response = await request(API_BASE_URL)
          .post('/api/spending-categories')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(categoryData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
      }
    });

    it('should return 400 for invalid color format', async () => {
      const invalidColors = ['red', '#FF', '#GGGGGG', 'FF0000'];

      for (const color of invalidColors) {
        const response = await request(API_BASE_URL)
          .post('/api/spending-categories')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            name: 'Test Category',
            budgetCategoryId,
            color
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid monthly target', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Test Category',
          budgetCategoryId,
          monthlyTarget: -100.00
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .send({
          name: 'Test Category',
          budgetCategoryId
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });
});