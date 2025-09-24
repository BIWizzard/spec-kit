/**
 * Contract Test: GET /api/families
 * Task: T043 - Get family details endpoint contract validation
 *
 * This test validates the family retrieval API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: GET /api/families', () => {
  let authToken: string;
  let familyId: string;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Register a test user to get auth token
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Admin',
        lastName: 'User',
        familyName: 'Test Family',
        timezone: 'America/New_York',
        currency: 'USD'
      })
      .expect(201);

    authToken = registerResponse.body.tokens.accessToken;
    familyId = registerResponse.body.family.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authenticated Family Retrieval', () => {
    it('should return 200 with complete family details', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('settings');
      expect(response.body).toHaveProperty('subscriptionStatus');
      expect(response.body).toHaveProperty('memberCount');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate family basic properties
      expect(response.body.id).toBe(familyId);
      expect(response.body.name).toBe('Test Family');
      expect(typeof response.body.memberCount).toBe('number');
      expect(response.body.memberCount).toBe(1);

      // Validate subscription status enum
      expect(['trial', 'active', 'suspended', 'cancelled'])
        .toContain(response.body.subscriptionStatus);

      // Validate settings structure
      const { settings } = response.body;
      expect(settings).toHaveProperty('timezone');
      expect(settings).toHaveProperty('currency');
      expect(settings).toHaveProperty('fiscalYearStart');

      expect(settings.timezone).toBe('America/New_York');
      expect(settings.currency).toBe('USD');
      expect(typeof settings.fiscalYearStart).toBe('number');
      expect(settings.fiscalYearStart).toBeGreaterThanOrEqual(1);
      expect(settings.fiscalYearStart).toBeLessThanOrEqual(12);

      // Validate date formats
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);
    });

    it('should return family with default subscription status for new families', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // New families should start with trial status
      expect(response.body.subscriptionStatus).toBe('trial');
    });

    it('should return family settings with correct data types', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { settings } = response.body;

      expect(typeof settings.timezone).toBe('string');
      expect(typeof settings.currency).toBe('string');
      expect(typeof settings.fiscalYearStart).toBe('number');

      // Validate currency format (ISO 4217)
      expect(settings.currency).toMatch(/^[A-Z]{3}$/);
    });

    it('should include accurate member count', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Initially should have 1 member (the creator)
      expect(response.body.memberCount).toBe(1);
    });

    it('should return consistent family ID across requests', async () => {
      const response1 = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response2 = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body.id).toBe(response2.body.id);
      expect(response1.body.id).toBe(familyId);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with malformed authorization header', async () => {
      const malformedHeaders = [
        'invalid-token',
        'Basic sometoken',
        'Bearer',
        'Bearer ',
        `Bearer ${authToken} extra`
      ];

      for (const header of malformedHeaders) {
        const response = await request(API_BASE_URL)
          .get('/api/families')
          .set('Authorization', header)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should require Bearer token authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Basic ${Buffer.from('user:pass').toString('base64')}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Headers and Format', () => {
    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should return valid JSON response', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });

    it('should not include sensitive information in response', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Ensure no sensitive data is exposed
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('secret');
      expect(response.body.settings).not.toHaveProperty('apiKey');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent requests properly', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/families')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(familyId);
      });
    });

    it('should return consistent data structure on multiple calls', async () => {
      const response1 = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response2 = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Compare structure (keys should be identical)
      expect(Object.keys(response1.body).sort()).toEqual(Object.keys(response2.body).sort());
      expect(Object.keys(response1.body.settings).sort()).toEqual(Object.keys(response2.body.settings).sort());
    });
  });
});