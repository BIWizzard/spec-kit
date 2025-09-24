/**
 * Contract Test: PUT /api/families/members/{memberId}
 * Task: T047 - Update family member endpoint contract validation
 *
 * This test validates the family member update API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: PUT /api/families/members/{memberId}', () => {
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let familyId: string;
  let adminMemberId: string;
  let editorMemberId: string;
  let viewerMemberId: string;

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
        familyName: 'Test Family'
      })
      .expect(201);

    adminToken = adminResponse.body.tokens.accessToken;
    familyId = adminResponse.body.family.id;
    adminMemberId = adminResponse.body.user.id;

    // Register other users (would be through invitation in real scenario)
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
    editorMemberId = editorResponse.body.user.id;

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
    viewerMemberId = viewerResponse.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Member Update Requests (Admin)', () => {
    const validUpdateRequest = {
      firstName: 'Updated',
      lastName: 'Name',
      role: 'editor',
      permissions: {
        canManageBankAccounts: true,
        canEditPayments: false,
        canViewReports: true,
        canManageFamily: false
      }
    };

    it('should return 200 with updated member data for complete update', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validUpdateRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('permissions');
      expect(response.body).toHaveProperty('mfaEnabled');
      expect(response.body).toHaveProperty('emailVerified');
      expect(response.body).toHaveProperty('lastLoginAt');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate updated values
      expect(response.body.id).toBe(adminMemberId);
      expect(response.body.firstName).toBe(validUpdateRequest.firstName);
      expect(response.body.lastName).toBe(validUpdateRequest.lastName);
      expect(response.body.role).toBe(validUpdateRequest.role);

      // Validate permissions structure
      const { permissions } = response.body;
      expect(permissions.canManageBankAccounts).toBe(validUpdateRequest.permissions.canManageBankAccounts);
      expect(permissions.canEditPayments).toBe(validUpdateRequest.permissions.canEditPayments);
      expect(permissions.canViewReports).toBe(validUpdateRequest.permissions.canViewReports);
      expect(permissions.canManageFamily).toBe(validUpdateRequest.permissions.canManageFamily);

      // Validate unchanged values
      expect(response.body.email).toBe('admin@example.com');
      expect(typeof response.body.mfaEnabled).toBe('boolean');
      expect(typeof response.body.emailVerified).toBe('boolean');
    });

    it('should return 200 for partial updates (name fields only)', async () => {
      const nameUpdate = {
        firstName: 'PartialUpdate',
        lastName: 'Test'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(nameUpdate)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.firstName).toBe(nameUpdate.firstName);
      expect(response.body.lastName).toBe(nameUpdate.lastName);
      expect(response.body.role).toBe('admin'); // Should remain unchanged
      expect(response.body.email).toBe('admin@example.com'); // Should remain unchanged
    });

    it('should return 200 for role-only updates', async () => {
      const roleUpdate = {
        role: 'viewer'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleUpdate)
        .expect(200);

      expect(response.body.role).toBe(roleUpdate.role);
      expect(response.body.firstName).toBe('Admin'); // Should remain unchanged
      expect(response.body.lastName).toBe('User'); // Should remain unchanged
    });

    it('should return 200 for permissions-only updates', async () => {
      const permissionsUpdate = {
        permissions: {
          canManageBankAccounts: false,
          canEditPayments: false,
          canViewReports: true,
          canManageFamily: false
        }
      };

      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(permissionsUpdate)
        .expect(200);

      const { permissions } = response.body;
      expect(permissions.canManageBankAccounts).toBe(false);
      expect(permissions.canEditPayments).toBe(false);
      expect(permissions.canViewReports).toBe(true);
      expect(permissions.canManageFamily).toBe(false);
    });

    it('should update timestamp on successful update', async () => {
      const beforeUpdate = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const originalMember = beforeUpdate.body.members.find(m => m.id === adminMemberId);
      const originalUpdatedAt = originalMember ? originalMember.updatedAt : null;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'TimestampTest' })
        .expect(200);

      if (originalUpdatedAt) {
        expect(new Date(response.body.updatedAt).getTime())
          .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
      }
    });
  });

  describe('Self-Update Permissions (Limited Fields)', () => {
    it('should allow users to update their own name fields', async () => {
      const selfUpdate = {
        firstName: 'SelfUpdated',
        lastName: 'Name'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(selfUpdate)
        .expect(200);

      expect(response.body.firstName).toBe(selfUpdate.firstName);
      expect(response.body.lastName).toBe(selfUpdate.lastName);
    });

    it('should prevent users from updating their own role', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          firstName: 'Valid',
          role: 'admin' // Should not be allowed
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should prevent users from updating their own permissions', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          firstName: 'Valid',
          permissions: {
            canManageBankAccounts: true,
            canEditPayments: true,
            canViewReports: true,
            canManageFamily: true
          }
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('Invalid Update Requests', () => {
    it('should return 400 for empty request body', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid name field lengths', async () => {
      const invalidNameRequests = [
        { firstName: '' }, // Too short
        { firstName: 'a'.repeat(51) }, // Too long
        { lastName: '' }, // Too short
        { lastName: 'a'.repeat(51) } // Too long
      ];

      for (const invalidRequest of invalidNameRequests) {
        const response = await request(API_BASE_URL)
          .put(`/api/families/members/${adminMemberId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
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
          .put(`/api/families/members/${adminMemberId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            firstName: 'Valid',
            role: role
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid permissions structure', async () => {
      const invalidPermissions = [
        { canManageBankAccounts: 'yes' }, // String instead of boolean
        { canManageBankAccounts: true, invalidPermission: true }, // Unknown permission
        'invalid', // Not an object
        123 // Not an object
      ];

      for (const permissions of invalidPermissions) {
        const response = await request(API_BASE_URL)
          .put(`/api/families/members/${adminMemberId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            firstName: 'Valid',
            permissions: permissions
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for unknown fields in request', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Valid',
          unknownField: 'should not be allowed',
          email: 'cannot-change@example.com', // Email should not be changeable
          id: 'should-not-be-allowed'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Member ID Validation', () => {
    it('should return 400 for invalid member ID format', async () => {
      const invalidIds = [
        'not-a-uuid',
        '123',
        'invalid-uuid-format',
        ''
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .put(`/api/families/members/${invalidId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ firstName: 'Valid' })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 404 for non-existent member ID', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Valid' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Member not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 404 for member from different family', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${editorMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Valid' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Member not found');
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should return 403 for non-admin updating others (editor)', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ firstName: 'Should Not Work' })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 403 for non-admin updating others (viewer)', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ firstName: 'Should Not Work' })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .send({ firstName: 'Valid' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 401 with invalid authentication token', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ firstName: 'Valid' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content Type and Request Format', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send('firstName=Test')
        .expect(400);

      // Should reject form-encoded data
    });

    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Test' })
        .expect('Content-Type', /application\/json/)
        .expect(200);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{"firstName": "Test", invalid}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Data Persistence and Response Validation', () => {
    it('should persist changes across subsequent GET requests', async () => {
      const updateData = {
        firstName: 'Persisted',
        lastName: 'Update',
        role: 'editor',
        permissions: {
          canManageBankAccounts: false,
          canEditPayments: true,
          canViewReports: true,
          canManageFamily: false
        }
      };

      await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      const membersResponse = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const updatedMember = membersResponse.body.members.find(m => m.id === adminMemberId);
      expect(updatedMember.firstName).toBe(updateData.firstName);
      expect(updatedMember.lastName).toBe(updateData.lastName);
      expect(updatedMember.role).toBe(updateData.role);
    });

    it('should return valid UUIDs in response', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'UUID Test' })
        .expect(200);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(response.body.id).toMatch(uuidRegex);
    });

    it('should not expose sensitive information in response', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Security Test' })
        .expect(200);

      // Ensure no sensitive data is exposed
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('tokens');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('mfaSecret');
    });

    it('should validate all timestamp fields are valid ISO 8601', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/families/members/${adminMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Timestamp Test' })
        .expect(200);

      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);

      if (response.body.lastLoginAt) {
        expect(new Date(response.body.lastLoginAt)).toBeInstanceOf(Date);
      }
    });
  });
});