/**
 * Contract Test: GET /api/transactions/uncategorized
 * Task: T093 - Uncategorized transactions endpoint contract validation
 *
 * This test validates the uncategorized transactions API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/transactions/uncategorized', () => {
  let authTokens: any;
  let testAccountId: string;
  const testUser = {
    email: 'uncategorized@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Uncategorized',
    lastName: 'Test',
    familyName: 'Uncategorized Family'
  };

  beforeEach(async () => {
    // Clean up database before each test
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

    // Create test bank account
    const accountResponse = await request(API_BASE_URL)
      .post('/api/bank-accounts')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
      });

    testAccountId = accountResponse.body?.id || 'test-account-uuid';

    // Sync to create transactions
    await request(API_BASE_URL)
      .post(`/api/bank-accounts/${testAccountId}/sync`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Uncategorized Transactions Request', () => {
    it('should return 200 with uncategorized transactions', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('suggestedCategories');

      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(Array.isArray(response.body.suggestedCategories)).toBe(true);
      expect(typeof response.body.total).toBe('number');

      // All transactions should be uncategorized
      response.body.transactions.forEach((transaction: any) => {
        expect(transaction.spendingCategory).toBeNull();
        expect(transaction.userCategorized).toBe(false);
        expect(transaction.categoryConfidence).toBeLessThanOrEqual(0.8); // Default threshold
      });

      // Validate suggested categories structure
      response.body.suggestedCategories.forEach((suggestion: any) => {
        expect(suggestion).toHaveProperty('transactionId');
        expect(suggestion).toHaveProperty('suggestedCategory');
        expect(suggestion).toHaveProperty('confidence');

        expect(typeof suggestion.transactionId).toBe('string');
        expect(typeof suggestion.confidence).toBe('number');
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);

        if (suggestion.suggestedCategory) {
          expect(suggestion.suggestedCategory).toHaveProperty('id');
          expect(suggestion.suggestedCategory).toHaveProperty('name');
          expect(suggestion.suggestedCategory).toHaveProperty('color');
          expect(suggestion.suggestedCategory).toHaveProperty('icon');
        }
      });
    });

    it('should support limit parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .query({ limit: 25 })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeLessThanOrEqual(25);
    });

    it('should support custom confidence threshold', async () => {
      const customThreshold = 0.5;

      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .query({ confidenceThreshold: customThreshold })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // All returned transactions should have confidence <= custom threshold
      response.body.transactions.forEach((transaction: any) => {
        expect(transaction.categoryConfidence).toBeLessThanOrEqual(customThreshold);
      });
    });

    it('should use default parameters when not specified', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeLessThanOrEqual(100); // Default limit
    });
  });

  describe('Invalid Query Parameters', () => {
    it('should return 400 for invalid limit values', async () => {
      const invalidLimits = [
        { limit: -1 },
        { limit: 'invalid' },
        { limit: 1000 } // Too large
      ];

      for (const query of invalidLimits) {
        const response = await request(API_BASE_URL)
          .get('/api/transactions/uncategorized')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid confidence threshold', async () => {
      const invalidThresholds = [
        { confidenceThreshold: -0.1 }, // Below 0
        { confidenceThreshold: 1.1 },  // Above 1
        { confidenceThreshold: 'invalid' }
      ];

      for (const query of invalidThresholds) {
        const response = await request(API_BASE_URL)
          .get('/api/transactions/uncategorized')
          .query(query)
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return uncategorized transactions for authenticated user\'s family', async () => {
      // Create second family with transactions
      const secondFamily = {
        email: 'other@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Family',
        familyName: 'Other Family'
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

      // Create bank account for other family
      await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-other-family'
        });

      // Original user should not see other family's uncategorized transactions
      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // All transactions should belong to user's own accounts
      response.body.transactions.forEach((transaction: any) => {
        expect(transaction.bankAccount.id).toBe(testAccountId);
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000);
    });

    it('should enforce reasonable result limits', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .query({ limit: 500 }) // Maximum allowed
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.transactions.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Content-Type and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/transactions/uncategorized')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
    });
  });
});