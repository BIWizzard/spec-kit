/**
 * Contract Test: POST /api/plaid/webhook
 * Task: T096 - Plaid webhook endpoint for transaction updates
 *
 * This test validates the Plaid webhook API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/plaid/webhook', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.transaction.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Webhook Requests', () => {
    it('should return 200 for valid TRANSACTIONS_UPDATED webhook', async () => {
      const webhookPayload = {
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'TRANSACTIONS_UPDATED',
        item_id: 'test-item-id',
        new_transactions: 5,
        removed_transactions: ['test-transaction-id'],
        environment: 'sandbox'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send(webhookPayload)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message', 'Webhook processed successfully');
      expect(response.body).toHaveProperty('processed', true);
      expect(response.body).toHaveProperty('webhook_type', 'TRANSACTIONS');
      expect(response.body).toHaveProperty('webhook_code', 'TRANSACTIONS_UPDATED');
    });

    it('should return 200 for ITEM_ERROR webhook', async () => {
      const webhookPayload = {
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'test-item-id',
        error: {
          error_type: 'ITEM_ERROR',
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'the login details of this item have changed',
          display_message: 'Please update your login information'
        },
        environment: 'sandbox'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.message).toBe('Webhook processed successfully');
      expect(response.body.processed).toBe(true);
      expect(response.body.webhook_type).toBe('ITEM');
      expect(response.body.webhook_code).toBe('ERROR');
    });

    it('should return 200 for ACCOUNTS_UPDATED webhook', async () => {
      const webhookPayload = {
        webhook_type: 'ACCOUNTS',
        webhook_code: 'ACCOUNTS_UPDATED',
        item_id: 'test-item-id',
        account_ids: ['account-1', 'account-2'],
        environment: 'sandbox'
      };

      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.processed).toBe(true);
      expect(response.body.webhook_type).toBe('ACCOUNTS');
    });
  });

  describe('Invalid Webhook Requests', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidPayloads = [
        { webhook_code: 'TRANSACTIONS_UPDATED', item_id: 'test' }, // Missing webhook_type
        { webhook_type: 'TRANSACTIONS', item_id: 'test' }, // Missing webhook_code
        { webhook_type: 'TRANSACTIONS', webhook_code: 'TRANSACTIONS_UPDATED' }, // Missing item_id
        {} // Empty payload
      ];

      for (const payload of invalidPayloads) {
        const response = await request(API_BASE_URL)
          .post('/api/plaid/webhook')
          .send(payload)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid webhook payload');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for invalid webhook_type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send({
          webhook_type: 'INVALID_TYPE',
          webhook_code: 'TRANSACTIONS_UPDATED',
          item_id: 'test-item-id',
          environment: 'sandbox'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid webhook payload');
    });

    it('should return 400 for invalid webhook_code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send({
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'INVALID_CODE',
          item_id: 'test-item-id',
          environment: 'sandbox'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid webhook payload');
    });

    it('should return 400 for malformed JSON', async () => {
      await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Security and Validation', () => {
    it('should not require authentication (public webhook endpoint)', async () => {
      // Plaid webhooks don't use Bearer tokens, they use webhook verification
      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send({
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'TRANSACTIONS_UPDATED',
          item_id: 'test-item-id',
          new_transactions: 1,
          environment: 'sandbox'
        })
        .expect(200);

      expect(response.body.processed).toBe(true);
    });

    it('should handle webhook verification if implemented', async () => {
      // Test with potential webhook signature verification
      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .set('Plaid-Verification', 'test-signature')
        .send({
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'TRANSACTIONS_UPDATED',
          item_id: 'test-item-id',
          new_transactions: 1,
          environment: 'sandbox'
        })
        .expect(200);

      expect(response.body.processed).toBe(true);
    });

    it('should reject webhooks with XSS attempts', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send({
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'TRANSACTIONS_UPDATED',
          item_id: '<script>alert("xss")</script>',
          environment: 'sandbox'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid webhook payload');
    });
  });

  describe('Webhook Processing Logic', () => {
    it('should handle large transaction batches', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send({
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'TRANSACTIONS_UPDATED',
          item_id: 'test-item-id',
          new_transactions: 1000,
          environment: 'sandbox'
        })
        .expect(200);

      expect(response.body.processed).toBe(true);
    });

    it('should return processing status for async operations', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send({
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'HISTORICAL_UPDATE',
          item_id: 'test-item-id',
          new_transactions: 500,
          environment: 'sandbox'
        })
        .expect(200);

      expect(response.body).toHaveProperty('processed');
      expect(response.body).toHaveProperty('async', true);
    });
  });

  describe('Content-Type Validation', () => {
    it('should require application/json content type', async () => {
      await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send('webhook_type=TRANSACTIONS&webhook_code=TRANSACTIONS_UPDATED')
        .expect(400);
    });

    it('should handle empty request body', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/plaid/webhook')
        .send()
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid webhook payload');
    });
  });
});