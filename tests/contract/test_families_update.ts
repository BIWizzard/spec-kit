/**
 * Contract Test: PUT /api/families
 * Task: T044 - Update family details endpoint contract validation
 *
 * This test validates the family update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/families', () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let familyId: string;

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Register admin user
    const adminResponse = await request(API_BASE_URL)
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

    adminToken = adminResponse.body.tokens.accessToken;
    familyId = adminResponse.body.family.id;

    // Register editor user (would be through invitation in real scenario)
    const editorResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'editor@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Editor',
        lastName: 'User',
        familyName: 'Editor Family'
      })
      .expect(201);

    editorToken = editorResponse.body.tokens.accessToken;

    // Register viewer user
    const viewerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'viewer@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Viewer',
        lastName: 'User',
        familyName: 'Viewer Family'
      })
      .expect(201);

    viewerToken = viewerResponse.body.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Family Update Requests (Admin)', () => {
    const validUpdateRequest = {
      name: 'Updated Family Name',
      settings: {
        timezone: 'America/Los_Angeles',
        currency: 'EUR',
        fiscalYearStart: 4
      }
    };

    it('should return 200 with updated family data for complete update', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validUpdateRequest)
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

      // Validate updated values
      expect(response.body.id).toBe(familyId);
      expect(response.body.name).toBe(validUpdateRequest.name);

      const { settings } = response.body;
      expect(settings.timezone).toBe(validUpdateRequest.settings.timezone);
      expect(settings.currency).toBe(validUpdateRequest.settings.currency);
      expect(settings.fiscalYearStart).toBe(validUpdateRequest.settings.fiscalYearStart);

      // Validate unchanged values
      expect(response.body.memberCount).toBe(1);
      expect(response.body.subscriptionStatus).toBe('trial');
    });

    it('should return 200 for partial updates (name only)', async () => {
      const partialUpdate = {
        name: 'Partially Updated Family'
      };

      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.name).toBe(partialUpdate.name);
      // Settings should remain unchanged
      expect(response.body.settings.timezone).toBe('America/New_York');
      expect(response.body.settings.currency).toBe('USD');
    });

    it('should return 200 for partial updates (settings only)', async () => {
      const settingsUpdate = {
        settings: {
          timezone: 'Europe/London',
          currency: 'GBP'
        }
      };

      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(settingsUpdate)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.name).toBe('Test Family'); // Should remain unchanged
      expect(response.body.settings.timezone).toBe(settingsUpdate.settings.timezone);
      expect(response.body.settings.currency).toBe(settingsUpdate.settings.currency);
      expect(response.body.settings.fiscalYearStart).toBe(1); // Should remain unchanged
    });

    it('should update only fiscalYearStart when provided', async () => {
      const fiscalUpdate = {
        settings: {
          fiscalYearStart: 7
        }
      };

      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fiscalUpdate)
        .expect(200);

      expect(response.body.settings.fiscalYearStart).toBe(7);
      expect(response.body.settings.timezone).toBe('America/New_York');
      expect(response.body.settings.currency).toBe('USD');
    });

    it('should update timestamp on successful update', async () => {
      // Get current timestamp
      const beforeUpdate = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const originalUpdatedAt = beforeUpdate.body.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(new Date(response.body.updatedAt).getTime())
        .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });
  });

  describe('Invalid Update Requests', () => {
    it('should return 400 for empty request body', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for invalid family name length', async () => {
      const invalidNameRequests = [
        { name: '' }, // Too short
        { name: 'a'.repeat(101) } // Too long
      ];

      for (const invalidRequest of invalidNameRequests) {
        const response = await request(API_BASE_URL)
          .put('/api/families')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('name');
      }
    });

    it('should return 400 for invalid currency code', async () => {
      const invalidCurrencies = [
        'US', // Too short
        'USDX', // Too long
        'usd', // Lowercase
        '123', // Numbers
        'US$' // Special characters
      ];

      for (const currency of invalidCurrencies) {
        const response = await request(API_BASE_URL)
          .put('/api/families')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            settings: { currency }
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('currency');
      }
    });

    it('should return 400 for invalid fiscal year start', async () => {
      const invalidFiscalYears = [0, 13, -1, 'January', null];

      for (const fiscalYearStart of invalidFiscalYears) {
        const response = await request(API_BASE_URL)
          .put('/api/families')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            settings: { fiscalYearStart }
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid timezone', async () => {
      const invalidTimezones = [
        'Invalid/Timezone',
        'UTC+5',
        'EST',
        '',
        'America/NonExistent'
      ];

      for (const timezone of invalidTimezones) {
        const response = await request(API_BASE_URL)
          .put('/api/families')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            settings: { timezone }
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('timezone');
      }
    });

    it('should return 400 for unknown fields in request', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Valid Name',
          unknownField: 'should not be allowed',
          settings: {
            timezone: 'America/New_York',
            invalidSetting: 'not allowed'
          }
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should return 403 for non-admin users (editor)', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Should Not Work' })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 403 for non-admin users (viewer)', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Should Not Work' })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .send({ name: 'Should Not Work' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Should Not Work' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content Type and Request Format', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('name=TestFamily')
        .expect(400);

      // Should reject form-encoded data
    });

    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Update' })
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{"name": "Test", invalid}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Data Validation and Persistence', () => {
    it('should persist changes across subsequent GET requests', async () => {
      const updateData = {
        name: 'Persisted Family Name',
        settings: {
          timezone: 'Asia/Tokyo',
          currency: 'JPY',
          fiscalYearStart: 4
        }
      };

      await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      const getResponse = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.name).toBe(updateData.name);
      expect(getResponse.body.settings.timezone).toBe(updateData.settings.timezone);
      expect(getResponse.body.settings.currency).toBe(updateData.settings.currency);
      expect(getResponse.body.settings.fiscalYearStart).toBe(updateData.settings.fiscalYearStart);
    });

    it('should maintain referential integrity with family members', async () => {
      await request(API_BASE_URL)
        .put('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Family' })
        .expect(200);

      // Family member should still be associated with updated family
      const familyResponse = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(familyResponse.body.memberCount).toBe(1);
    });
  });
});