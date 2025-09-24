/**
 * Contract Test: POST /api/families/members
 * Task: T046 - Invite new family member endpoint contract validation
 *
 * This test validates the family member invitation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/families/members', () => {
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

    // Register editor and viewer users (separate families)
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

  describe('Valid Invitation Requests (Admin Only)', () => {
    const validInvitationRequest = {
      email: 'newmember@example.com',
      role: 'viewer',
      permissions: {
        canManageBankAccounts: false,
        canEditPayments: true,
        canViewReports: true,
        canManageFamily: false
      },
      message: 'Welcome to our family finance management!'
    };

    it('should return 201 with invitation details for complete request', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitationRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('message');

      // Validate response data
      expect(typeof response.body.id).toBe('string');
      expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(response.body.email).toBe(validInvitationRequest.email);
      expect(response.body.role).toBe(validInvitationRequest.role);
      expect(response.body.message).toBe(validInvitationRequest.message);

      // Validate expiration date is in the future
      const expirationDate = new Date(response.body.expiresAt);
      expect(expirationDate).toBeInstanceOf(Date);
      expect(expirationDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return 201 for minimal valid request (required fields only)', async () => {
      const minimalRequest = {
        email: 'minimal@example.com',
        role: 'editor'
      };

      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(minimalRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.email).toBe(minimalRequest.email);
      expect(response.body.role).toBe(minimalRequest.role);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should use default role when not specified', async () => {
      const requestWithoutRole = {
        email: 'defaultrole@example.com'
      };

      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(requestWithoutRole)
        .expect(201);

      expect(response.body.role).toBe('viewer'); // Default per OpenAPI spec
    });

    it('should accept all valid role values', async () => {
      const validRoles = ['admin', 'editor', 'viewer'];

      for (const role of validRoles) {
        const response = await request(API_BASE_URL)
          .post('/api/families/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: `${role}@example.com`,
            role: role
          })
          .expect(201);

        expect(response.body.role).toBe(role);
      }
    });

    it('should accept custom permission configurations', async () => {
      const customPermissions = {
        canManageBankAccounts: true,
        canEditPayments: false,
        canViewReports: true,
        canManageFamily: false
      };

      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'custom@example.com',
          role: 'editor',
          permissions: customPermissions
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('custom@example.com');
    });

    it('should handle message field up to maximum length', async () => {
      const longMessage = 'a'.repeat(500); // Maximum length per OpenAPI spec

      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'longmessage@example.com',
          role: 'viewer',
          message: longMessage
        })
        .expect(201);

      expect(response.body.message).toBe(longMessage);
    });
  });

  describe('Invalid Invitation Requests', () => {
    it('should return 400 for missing email field', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'viewer'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidEmails = [
        'plainaddress',
        'email@',
        '@domain.com',
        'email..email@domain.com',
        'email@domain..com',
        '',
        'spaces in@email.com',
        'email@domain',
        'email@.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(API_BASE_URL)
          .post('/api/families/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: email,
            role: 'viewer'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('email');
      }
    });

    it('should return 400 for email exceeding maximum length', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'; // > 255 chars

      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: longEmail,
          role: 'viewer'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('email');
    });

    it('should return 400 for invalid role values', async () => {
      const invalidRoles = [
        'superadmin',
        'guest',
        'moderator',
        'user',
        'owner',
        '',
        'ADMIN',
        123,
        null
      ];

      for (const role of invalidRoles) {
        const response = await request(API_BASE_URL)
          .post('/api/families/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'test@example.com',
            role: role
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('role');
      }
    });

    it('should return 400 for message exceeding maximum length', async () => {
      const longMessage = 'a'.repeat(501); // > 500 chars

      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          role: 'viewer',
          message: longMessage
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.message).toContain('message');
    });

    it('should return 400 for invalid permission structure', async () => {
      const invalidPermissions = [
        { canManageBankAccounts: 'yes' }, // String instead of boolean
        { canManageBankAccounts: true, invalidPermission: true }, // Unknown permission
        'invalid', // Not an object
        123 // Not an object
      ];

      for (const permissions of invalidPermissions) {
        const response = await request(API_BASE_URL)
          .post('/api/families/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'test@example.com',
            role: 'viewer',
            permissions: permissions
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for unknown fields in request', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          role: 'viewer',
          unknownField: 'should not be allowed',
          anotherField: 123
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Conflict Detection', () => {
    it('should return 409 for duplicate email invitation', async () => {
      const invitationData = {
        email: 'duplicate@example.com',
        role: 'viewer'
      };

      // Send first invitation
      await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invitationData)
        .expect(201);

      // Try to send duplicate invitation
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invitationData)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Member already exists');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 409 for email already registered in system', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@example.com', // Already registered
          role: 'viewer'
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.error).toBe('Member already exists');
    });

    it('should be case-insensitive for email conflict detection', async () => {
      await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'casetest@example.com',
          role: 'viewer'
        })
        .expect(201);

      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'CASETEST@EXAMPLE.COM',
          role: 'viewer'
        })
        .expect(409);

      expect(response.body.error).toBe('Member already exists');
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should return 403 for non-admin users (editor)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          email: 'shouldnotwork@example.com',
          role: 'viewer'
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 403 for non-admin users (viewer)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          email: 'shouldnotwork@example.com',
          role: 'viewer'
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .send({
          email: 'test@example.com',
          role: 'viewer'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          email: 'test@example.com',
          role: 'viewer'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content Type and Request Format', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('email=test@example.com&role=viewer')
        .expect(400);

      // Should reject form-encoded data
    });

    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          role: 'viewer'
        })
        .expect('Content-Type', /application\/json/)
        .expect(201);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com", invalid}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Validation', () => {
    it('should return invitation with valid UUID', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'uuid@example.com',
          role: 'viewer'
        })
        .expect(201);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(response.body.id).toMatch(uuidRegex);
    });

    it('should set expiration date appropriately in future', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'expiry@example.com',
          role: 'viewer'
        })
        .expect(201);

      const expirationDate = new Date(response.body.expiresAt);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

      expect(expirationDate.getTime()).toBeGreaterThan(now.getTime());
      expect(expirationDate.getTime()).toBeLessThanOrEqual(sevenDaysFromNow.getTime());
    });

    it('should not expose sensitive system information', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'secure@example.com',
          role: 'viewer'
        })
        .expect(201);

      // Ensure no sensitive data is exposed
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('secret');
      expect(response.body).not.toHaveProperty('invitationToken');
      expect(response.body).not.toHaveProperty('familyId');
    });
  });
});