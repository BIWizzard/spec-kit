/**
 * Contract Test: GET /api/spending-categories
 * Task: T078 - Spending categories list endpoint contract validation
 *
 * This test validates the spending categories list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/spending-categories', () => {
  let authTokens: any;
  let budgetCategoryId: string;
  const testUser = {
    email: 'spending.categories@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Spending',
    lastName: 'Categories',
    familyName: 'Spending Categories Family'
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

  describe('Valid Spending Categories List Request', () => {
    it('should return empty list when no spending categories exist', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories.length).toBe(0);
    });

    it('should return spending categories when they exist', async () => {
      // Create test spending categories
      await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Bills & Utilities',
          budgetCategoryId: budgetCategoryId,
          color: '#FF0000',
          icon: 'bill',
          monthlyTarget: 300.00
        });

      await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Food & Dining',
          budgetCategoryId: budgetCategoryId,
          color: '#00FF00',
          icon: 'food'
        });

      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.categories.length).toBe(2);

      // Validate spending category structure per OpenAPI spec
      const category = response.body.categories[0];
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('parentCategoryId');
      expect(category).toHaveProperty('budgetCategoryId');
      expect(category).toHaveProperty('icon');
      expect(category).toHaveProperty('color');
      expect(category).toHaveProperty('monthlyTarget');
      expect(category).toHaveProperty('isActive');
      expect(category).toHaveProperty('createdAt');
      expect(category).toHaveProperty('updatedAt');

      // Validate data types
      expect(typeof category.id).toBe('string');
      expect(typeof category.name).toBe('string');
      expect(typeof category.budgetCategoryId).toBe('string');
      expect(typeof category.icon).toBe('string');
      expect(typeof category.color).toBe('string');
      expect(typeof category.isActive).toBe('boolean');
      expect(typeof category.createdAt).toBe('string');
      expect(typeof category.updatedAt).toBe('string');

      // Should be active by default
      expect(category.isActive).toBe(true);
    });

    it('should handle parent-child category relationships', async () => {
      // Create parent category
      const parentResponse = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Transportation',
          budgetCategoryId: budgetCategoryId,
          color: '#0000FF',
          icon: 'car'
        });

      // Create child category
      await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Fuel',
          parentCategoryId: parentResponse.body.id,
          budgetCategoryId: budgetCategoryId,
          color: '#00FFFF',
          icon: 'fuel'
        });

      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.categories.length).toBe(2);
      
      const childCategory = response.body.categories.find(
        (c: any) => c.name === 'Fuel'
      );
      expect(childCategory).toBeTruthy();
      expect(childCategory.parentCategoryId).toBe(parentResponse.body.id);
    });
  });

  describe('Query Parameters', () => {
    it('should include inactive categories when includeInactive is true', async () => {
      // Create active category
      await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Active Category',
          budgetCategoryId: budgetCategoryId,
          color: '#FF0000',
          icon: 'bill'
        });

      // Create inactive category
      const inactiveResponse = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Inactive Category',
          budgetCategoryId: budgetCategoryId,
          color: '#00FF00',
          icon: 'food'
        });

      // Deactivate the category
      await request(API_BASE_URL)
        .put(`/api/spending-categories/${inactiveResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          isActive: false
        });

      // Test with includeInactive = false (default)
      const activeOnlyResponse = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .query({ includeInactive: false })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(activeOnlyResponse.body.categories.length).toBe(1);
      expect(activeOnlyResponse.body.categories[0].name).toBe('Active Category');

      // Test with includeInactive = true
      const allCategoriesResponse = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .query({ includeInactive: true })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(allCategoriesResponse.body.categories.length).toBe(2);
    });

    it('should exclude inactive categories by default', async () => {
      // Create and then deactivate a category
      const categoryResponse = await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'To Be Inactive',
          budgetCategoryId: budgetCategoryId,
          color: '#FF0000',
          icon: 'bill'
        });

      await request(API_BASE_URL)
        .put(`/api/spending-categories/${categoryResponse.body.id}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          isActive: false
        });

      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.categories.length).toBe(0);
    });

    it('should return 400 for invalid includeInactive parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .query({ includeInactive: 'invalid-boolean' })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return spending categories for authenticated user\'s family', async () => {
      // Create spending category for current family
      await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Family Category',
          budgetCategoryId: budgetCategoryId,
          color: '#FF0000',
          icon: 'bill'
        });

      // Create second family with spending category
      const secondFamily = {
        email: 'other.spending@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Spending Family'
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

      const otherBudgetResponse = await request(API_BASE_URL)
        .post('/api/budget-categories')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Budget Category',
          targetAmount: 1500.00,
          period: 'monthly'
        });

      await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Family Category',
          budgetCategoryId: otherBudgetResponse.body.id,
          color: '#00FF00',
          icon: 'food'
        });

      // Original user should only see their family's categories
      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.categories.length).toBe(1);
      expect(response.body.categories[0].name).toBe('Family Category');
    });
  });

  describe('Ordering and Structure', () => {
    it('should return categories in consistent order', async () => {
      // Create multiple categories
      const categoryNames = ['Zebra Category', 'Alpha Category', 'Beta Category'];
      
      for (const name of categoryNames) {
        await request(API_BASE_URL)
          .post('/api/spending-categories')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            name,
            budgetCategoryId: budgetCategoryId,
            color: '#FF0000',
            icon: 'bill'
          });
      }

      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.categories.length).toBe(3);
      
      // Verify all categories are present
      const returnedNames = response.body.categories.map((c: any) => c.name);
      for (const name of categoryNames) {
        expect(returnedNames).toContain(name);
      }
    });

    it('should validate color format in returned data', async () => {
      await request(API_BASE_URL)
        .post('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Color Test Category',
          budgetCategoryId: budgetCategoryId,
          color: '#AB12CD',
          icon: 'bill'
        });

      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      const category = response.body.categories[0];
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle multiple categories efficiently', async () => {
      // Create many categories
      for (let i = 0; i < 20; i++) {
        await request(API_BASE_URL)
          .post('/api/spending-categories')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            name: `Category ${i + 1}`,
            budgetCategoryId: budgetCategoryId,
            color: '#FF0000',
            icon: 'bill'
          });
      }

      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/spending-categories')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000);
      expect(response.body.categories.length).toBe(20);
    });
  });
});