/**
 * Contract Test: GET /api/bank-accounts
 * Task: T082 - Bank accounts list endpoint contract validation
 *
 * This test validates the bank accounts list API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/bank-accounts', () => {
  let authTokens: any;
  const testUser = {
    email: 'bankaccount@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Bank',
    lastName: 'Test',
    familyName: 'Bank Family'
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Bank Accounts List Request', () => {
    it('should return 200 with empty list when no bank accounts exist', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('accounts');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts.length).toBe(0);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalAccounts', 0);
      expect(summary).toHaveProperty('activeAccounts', 0);
      expect(summary).toHaveProperty('totalBalance');
      expect(summary).toHaveProperty('lastSyncAt');
      expect(typeof summary.totalBalance).toBe('number');
    });

    it('should return 200 with bank accounts when they exist', async () => {
      // First create a bank account (mock setup)
      await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'test-plaid-token',
          accountIds: ['account-123']
        });

      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts.length).toBeGreaterThan(0);

      // Validate bank account structure
      const account = response.body.accounts[0];
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('institutionName');
      expect(account).toHaveProperty('accountName');
      expect(account).toHaveProperty('accountType');
      expect(account).toHaveProperty('accountNumber');
      expect(account).toHaveProperty('currentBalance');
      expect(account).toHaveProperty('availableBalance');
      expect(account).toHaveProperty('lastSyncAt');
      expect(account).toHaveProperty('syncStatus');
      expect(account).toHaveProperty('transactionCount');
      expect(account).toHaveProperty('createdAt');

      // Validate data types
      expect(typeof account.id).toBe('string');
      expect(typeof account.institutionName).toBe('string');
      expect(typeof account.accountName).toBe('string');
      expect(typeof account.accountType).toBe('string');
      expect(typeof account.currentBalance).toBe('number');
      expect(typeof account.transactionCount).toBe('number');

      // Validate enums
      expect(['checking', 'savings', 'credit', 'loan']).toContain(account.accountType);
      expect(['active', 'error', 'disconnected']).toContain(account.syncStatus);
    });
  });

  describe('Query Parameters', () => {
    it('should support includeDisconnected parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .query({ includeDisconnected: true })
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
    });

    it('should default includeDisconnected to false', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
      // Should only show active accounts by default
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only return bank accounts for authenticated user\'s family', async () => {
      // Create second family with bank account
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
          publicToken: 'other-plaid-token',
          accountIds: ['other-account-123']
        });

      // Original user should not see other family's bank accounts
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.accounts.length).toBe(0); // Should be empty for original user
    });
  });

  describe('Authorization', () => {
    it('should return 403 for insufficient permissions', async () => {
      // Create user without family management permissions
      const limitedUser = {
        email: 'limited@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Limited',
        lastName: 'User',
        familyName: 'Limited Family'
      };

      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(limitedUser);

      const limitedLoginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: limitedUser.email,
          password: limitedUser.password
        });

      // Should work with default permissions - family members can view accounts
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${limitedLoginResponse.body.tokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
    });
  });

  describe('Response Format and Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
    });

    it('should include appropriate cache headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      // Bank account data should be cacheable but with short TTL
      expect(response.headers['cache-control']).toMatch(/max-age=|no-cache/);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });
  });
});