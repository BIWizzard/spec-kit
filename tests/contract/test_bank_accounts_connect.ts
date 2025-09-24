/**
 * Contract Test: POST /api/bank-accounts
 * Task: T083 - Bank account connection endpoint contract validation
 *
 * This test validates the bank account connection API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/bank-accounts', () => {
  let authTokens: any;
  const testUser = {
    email: 'bankconnect@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Bank',
    lastName: 'Connect',
    familyName: 'Connect Family'
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

  describe('Valid Bank Account Connection Request', () => {
    it('should return 201 when connecting bank account with public token', async () => {
      const connectRequest = {
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
      };

      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(connectRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('institutionName');
      expect(response.body).toHaveProperty('accountName');
      expect(response.body).toHaveProperty('accountType');
      expect(response.body).toHaveProperty('accountNumber');
      expect(response.body).toHaveProperty('currentBalance');
      expect(response.body).toHaveProperty('availableBalance');
      expect(response.body).toHaveProperty('lastSyncAt');
      expect(response.body).toHaveProperty('syncStatus');
      expect(response.body).toHaveProperty('transactionCount');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('plaidAccountId');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.institutionName).toBe('string');
      expect(typeof response.body.accountName).toBe('string');
      expect(typeof response.body.accountType).toBe('string');
      expect(typeof response.body.currentBalance).toBe('number');
      expect(typeof response.body.transactionCount).toBe('number');

      // Validate enums
      expect(['checking', 'savings', 'credit', 'loan']).toContain(response.body.accountType);
      expect(['active', 'error', 'disconnected']).toContain(response.body.syncStatus);
    });

    it('should support specific account IDs selection', async () => {
      const connectRequest = {
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx',
        accountIds: ['plaid-account-123', 'plaid-account-456']
      };

      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(connectRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('plaidAccountId');
    });

    it('should handle multiple accounts from single institution', async () => {
      const connectRequest = {
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx',
        accountIds: ['checking-123', 'savings-456', 'credit-789']
      };

      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(connectRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Should create multiple account entries or handle multiple accounts
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .send({
          publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Authorization', () => {
    it('should return 403 for insufficient permissions', async () => {
      // Create user without family management permissions (test future role-based access)
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

      // For now, should work with default permissions
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${limitedLoginResponse.body.tokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
        })
        .expect('Content-Type', /json/);

      // Could be 201 (success) or 403 (forbidden) depending on future permission model
      expect([201, 403]).toContain(response.status);
    });
  });

  describe('Invalid Connection Requests', () => {
    it('should return 400 for missing public token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid public token format', async () => {
      const invalidTokens = [
        'invalid-token',
        '',
        '12345',
        'public-invalid-format'
      ];

      for (const publicToken of invalidTokens) {
        const response = await request(API_BASE_URL)
          .post('/api/bank-accounts')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({ publicToken })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for expired public token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-expired-token'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/token|expired|invalid/i);
    });

    it('should return 400 for invalid account IDs format', async () => {
      const invalidAccountIds = [
        'not-an-array',
        123,
        [''],
        [null],
        [undefined]
      ];

      for (const accountIds of invalidAccountIds) {
        const response = await request(API_BASE_URL)
          .post('/api/bank-accounts')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx',
            accountIds
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Plaid Integration Errors', () => {
    it('should return 400 for Plaid API errors', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-error-token'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle institution connection errors gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-institution-error'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Duplicate Connection Handling', () => {
    it('should handle duplicate account connection attempts', async () => {
      const connectRequest = {
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx',
        accountIds: ['same-account-123']
      };

      // First connection should succeed
      await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(connectRequest)
        .expect(201);

      // Second connection of same account should handle gracefully
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(connectRequest)
        .expect('Content-Type', /json/);

      // Could be 201 (update), 409 (conflict), or 400 (already connected)
      expect([201, 400, 409]).toContain(response.status);
    });
  });

  describe('Family Data Isolation', () => {
    it('should associate bank account with correct family', async () => {
      const connectRequest = {
        publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
      };

      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(connectRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify account belongs to the authenticated user's family
      const listResponse = await request(API_BASE_URL)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(listResponse.body.accounts.length).toBe(1);
      expect(listResponse.body.accounts[0].id).toBe(response.body.id);
    });
  });

  describe('Content-Type and Headers', () => {
    it('should require JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send('publicToken=public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
        })
        .expect('Content-Type', /json/);

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time for connection', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
        });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds (Plaid calls can be slower)
    });
  });
});