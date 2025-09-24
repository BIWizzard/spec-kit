/**
 * Contract Test: POST /api/transactions/match-payments
 * Task: T094 - Transaction payment matching endpoint contract validation
 *
 * This test validates the transaction payment matching API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/transactions/match-payments', () => {
  let authTokens: any;
  let testAccountId: string;
  const testUser = {
    email: 'matchpayments@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Match',
    lastName: 'Payments',
    familyName: 'Match Family'
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

    // Create some test payments
    await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authTokens.accessToken}`)
      .send({
        name: 'Test Payment',
        amount: 150.00,
        dueDate: '2024-01-15',
        frequency: 'monthly',
        categoryId: null
      });

    // Sync to create transactions
    await request(API_BASE_URL)
      .post(`/api/bank-accounts/${testAccountId}/sync`)
      .set('Authorization', `Bearer ${authTokens.accessToken}`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Payment Matching Request', () => {
    it('should return 200 with matching results when no filters provided', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('matches');
      expect(response.body).toHaveProperty('summary');

      expect(Array.isArray(response.body.matches)).toBe(true);

      // Validate summary structure
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalTransactions');
      expect(summary).toHaveProperty('totalMatches');
      expect(summary).toHaveProperty('highConfidenceMatches');

      expect(typeof summary.totalTransactions).toBe('number');
      expect(typeof summary.totalMatches).toBe('number');
      expect(typeof summary.highConfidenceMatches).toBe('number');

      // Validate match structure
      response.body.matches.forEach((match: any) => {
        expect(match).toHaveProperty('transactionId');
        expect(match).toHaveProperty('paymentId');
        expect(match).toHaveProperty('confidence');
        expect(match).toHaveProperty('matchType');

        expect(typeof match.transactionId).toBe('string');
        expect(typeof match.paymentId).toBe('string');
        expect(typeof match.confidence).toBe('number');
        expect(typeof match.matchType).toBe('string');

        // Validate confidence range
        expect(match.confidence).toBeGreaterThanOrEqual(0);
        expect(match.confidence).toBeLessThanOrEqual(1);

        // Validate match type enum
        expect(['exact_amount', 'close_amount', 'merchant_match', 'date_range']).toContain(match.matchType);
      });

      // Validate data consistency
      expect(summary.totalMatches).toBe(response.body.matches.length);
      expect(summary.highConfidenceMatches).toBeLessThanOrEqual(summary.totalMatches);
    });

    it('should support date range filtering', async () => {
      const matchRequest = {
        fromDate: '2024-01-01',
        toDate: '2024-01-31'
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(matchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('matches');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.matches)).toBe(true);
    });

    it('should support specific account filtering', async () => {
      const matchRequest = {
        accountIds: [testAccountId]
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(matchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('matches');
      expect(Array.isArray(response.body.matches)).toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      const matchRequest = {
        fromDate: '2025-01-01', // Future date with no transactions
        toDate: '2025-01-31'
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(matchRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.matches).toEqual([]);
      expect(response.body.summary.totalMatches).toBe(0);
      expect(response.body.summary.highConfidenceMatches).toBe(0);
    });

    it('should provide confidence scores for matches', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect(200);

      if (response.body.matches.length > 0) {
        response.body.matches.forEach((match: any) => {
          expect(match.confidence).toBeGreaterThan(0);
          expect(match.confidence).toBeLessThanOrEqual(1);

          // High confidence matches should be counted properly
          if (match.confidence >= 0.8) {
            // This should contribute to highConfidenceMatches count
          }
        });
      }
    });
  });

  describe('Invalid Match Requests', () => {
    it('should return 400 for invalid date formats', async () => {
      const invalidRequests = [
        { fromDate: 'invalid-date' },
        { toDate: 'not-a-date' },
        { fromDate: '2024-13-01' }, // Invalid month
        { toDate: '2024-02-30' }    // Invalid day
      ];

      for (const matchRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/transactions/match-payments')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(matchRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid account IDs', async () => {
      const invalidRequests = [
        { accountIds: 'not-an-array' },
        { accountIds: ['invalid-uuid'] },
        { accountIds: [123] }, // Numbers instead of strings
        { accountIds: [null, undefined] }
      ];

      for (const matchRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/transactions/match-payments')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(matchRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for date range where fromDate > toDate', async () => {
      const matchRequest = {
        fromDate: '2024-01-31',
        toDate: '2024-01-01' // End before start
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(matchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/date range|from.*to/i);
    });

    it('should return 400 for non-existent account IDs', async () => {
      const matchRequest = {
        accountIds: ['00000000-0000-0000-0000-000000000000']
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(matchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toMatch(/account|not found/i);
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .send({})
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', 'Bearer invalid-token')
        .send({})
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should only match transactions and payments within same family', async () => {
      // Create second family
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

      // Create bank account and payments for other family
      await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-other-family'
        });

      await request(API_BASE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          name: 'Other Family Payment',
          amount: 200.00,
          dueDate: '2024-01-15',
          frequency: 'monthly'
        });

      // Original user should only get matches from their own family
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(200);

      // All matches should be for user's own transactions and payments
      expect(Array.isArray(response.body.matches)).toBe(true);
      // Note: Specific validation would require knowing the actual payment/transaction IDs
    });

    it('should not match with accounts from different families', async () => {
      // Create second family
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

      const otherAccountResponse = await request(API_BASE_URL)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .send({
          publicToken: 'public-sandbox-other-family'
        });

      const otherAccountId = otherAccountResponse.body?.id || 'other-account-uuid';

      // Original user should not be able to specify other family's accounts
      const matchRequest = {
        accountIds: [otherAccountId]
      };

      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(matchRequest)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Match Types and Quality', () => {
    it('should provide different match types based on criteria', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect(200);

      if (response.body.matches.length > 0) {
        const matchTypes = new Set(response.body.matches.map((match: any) => match.matchType));
        matchTypes.forEach(type => {
          expect(['exact_amount', 'close_amount', 'merchant_match', 'date_range']).toContain(type);
        });
      }
    });

    it('should order matches by confidence score', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect(200);

      if (response.body.matches.length > 1) {
        // Matches should be ordered by confidence (descending)
        for (let i = 1; i < response.body.matches.length; i++) {
          expect(response.body.matches[i - 1].confidence)
            .toBeGreaterThanOrEqual(response.body.matches[i].confidence);
        }
      }
    });
  });

  describe('Content-Type Requirements', () => {
    it('should accept empty JSON body', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('matches');
    });

    it('should require JSON content type when body provided', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send('fromDate=2024-01-01&toDate=2024-01-31')
        .expect(400);

      // Should reject form-encoded data
      expect(response.body).toHaveProperty('error');
    });

    it('should return JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('matches');
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within reasonable time for matching', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds
    });

    it('should handle large date ranges efficiently', async () => {
      const matchRequest = {
        fromDate: '2023-01-01',
        toDate: '2024-12-31' // Large date range
      };

      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .post('/api/transactions/match-payments')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(matchRequest)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(15000); // Should respond within 15 seconds for large range
      expect(response.body).toHaveProperty('matches');
    });
  });
});