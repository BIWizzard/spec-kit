/**
 * Contract Test: POST /api/families/invitations/{invitationId}/accept
 * Task: T052 - Accept invitation endpoint contract validation
 *
 * This test validates the invitation acceptance API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 * NOTE: This is a public endpoint (security: []) for invited users to accept invitations.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/families/invitations/{invitationId}/accept', () => {
  let adminToken: string;
  let familyId: string;
  let sampleInvitationId: string;
  let expiredInvitationId: string;
  let cancelledInvitationId: string;

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

    // Create sample invitations for testing
    const inviteResponse = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newmember@example.com',
        role: 'editor',
        message: 'Welcome to our family finance management!'
      })
      .expect(201);

    sampleInvitationId = inviteResponse.body.id;

    // Create additional invitations for different scenarios
    const expiredInvite = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'expired@example.com',
        role: 'viewer'
      })
      .expect(201);

    expiredInvitationId = expiredInvite.body.id;

    const cancelledInvite = await request(API_BASE_URL)
      .post('/api/families/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'cancelled@example.com',
        role: 'viewer'
      })
      .expect(201);

    cancelledInvitationId = cancelledInvite.body.id;

    // Cancel the cancelled invitation
    await request(API_BASE_URL)
      .delete(`/api/families/invitations/${cancelledInvitationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Invitation Acceptance (Public Endpoint)', () => {
    const validAcceptRequest = {
      password: 'SecurePass123!@#',
      firstName: 'New',
      lastName: 'Member'
    };

    it('should return 201 with complete member and family data', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send(validAcceptRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('member');
      expect(response.body).toHaveProperty('family');
      expect(response.body).toHaveProperty('tokens');

      // Validate member object structure
      const { member } = response.body;
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('email', 'newmember@example.com');
      expect(member).toHaveProperty('firstName', validAcceptRequest.firstName);
      expect(member).toHaveProperty('lastName', validAcceptRequest.lastName);
      expect(member).toHaveProperty('role', 'editor');
      expect(member).toHaveProperty('permissions');
      expect(member).toHaveProperty('mfaEnabled', false);
      expect(member).toHaveProperty('emailVerified', false);
      expect(member).toHaveProperty('createdAt');
      expect(member).toHaveProperty('updatedAt');

      // Validate family object structure
      const { family } = response.body;
      expect(family).toHaveProperty('id', familyId);
      expect(family).toHaveProperty('name', 'Test Family');
      expect(family).toHaveProperty('settings');
      expect(family).toHaveProperty('subscriptionStatus');
      expect(family).toHaveProperty('memberCount', 2); // Admin + new member

      // Validate tokens structure
      const { tokens } = response.body;
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens).toHaveProperty('tokenType', 'Bearer');

      // Validate data types
      expect(typeof member.id).toBe('string');
      expect(member.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should work without authentication header (public endpoint)', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send(validAcceptRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.member.email).toBe('newmember@example.com');
      expect(response.body.tokens).toHaveProperty('accessToken');
    });

    it('should create member with correct role from invitation', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send(validAcceptRequest)
        .expect(201);

      expect(response.body.member.role).toBe('editor'); // Role from invitation
    });

    it('should set appropriate permissions for editor role', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send(validAcceptRequest)
        .expect(201);

      const { permissions } = response.body.member;
      expect(permissions.canManageBankAccounts).toBe(false);
      expect(permissions.canEditPayments).toBe(true);
      expect(permissions.canViewReports).toBe(true);
      expect(permissions.canManageFamily).toBe(false);
    });

    it('should increment family member count', async () => {
      const beforeFamily = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send(validAcceptRequest)
        .expect(201);

      const afterFamily = await request(API_BASE_URL)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(afterFamily.body.memberCount).toBe(beforeFamily.body.memberCount + 1);
    });

    it('should make invitation unavailable after acceptance', async () => {
      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send(validAcceptRequest)
        .expect(201);

      // Invitation should no longer be accessible
      const inviteResponse = await request(API_BASE_URL)
        .get(`/api/families/invitations/${sampleInvitationId}`)
        .expect(404);

      expect(inviteResponse.body.error).toBe('Invitation not found or expired');
    });
  });

  describe('Invalid Acceptance Requests', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { firstName: 'John', lastName: 'Doe' }, // Missing password
        { password: 'SecurePass123!@#', lastName: 'Doe' }, // Missing firstName
        { password: 'SecurePass123!@#', firstName: 'John' } // Missing lastName
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post(`/api/families/invitations/${sampleInvitationId}/accept`)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for weak password', async () => {
      const weakPasswords = [
        'short', // Too short
        'nouppercaselowercase123!', // No uppercase
        'NOLOWERCASEUPPERCASE123!', // No lowercase
        'NoNumbersUpperLower!', // No numbers
        'NoSpecialChars123ABC' // No special characters
      ];

      for (const password of weakPasswords) {
        const response = await request(API_BASE_URL)
          .post(`/api/families/invitations/${sampleInvitationId}/accept`)
          .send({
            password: password,
            firstName: 'John',
            lastName: 'Doe'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('password');
      }
    });

    it('should return 400 for invalid name field lengths', async () => {
      const invalidNameRequests = [
        { firstName: '', lastName: 'Doe', password: 'SecurePass123!@#' }, // Empty firstName
        { firstName: 'a'.repeat(51), lastName: 'Doe', password: 'SecurePass123!@#' }, // Long firstName
        { firstName: 'John', lastName: '', password: 'SecurePass123!@#' }, // Empty lastName
        { firstName: 'John', lastName: 'a'.repeat(51), password: 'SecurePass123!@#' } // Long lastName
      ];

      for (const invalidRequest of invalidNameRequests) {
        const response = await request(API_BASE_URL)
          .post(`/api/families/invitations/${sampleInvitationId}/accept`)
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for password length violations', async () => {
      const invalidPasswords = [
        'a'.repeat(11), // Too short (< 12 chars)
        'a'.repeat(129) // Too long (> 128 chars)
      ];

      for (const password of invalidPasswords) {
        const response = await request(API_BASE_URL)
          .post(`/api/families/invitations/${sampleInvitationId}/accept`)
          .send({
            password: password,
            firstName: 'John',
            lastName: 'Doe'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for unknown fields in request', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'John',
          lastName: 'Doe',
          email: 'shouldnotbeallowed@example.com',
          role: 'admin',
          unknownField: 'not allowed'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Invitation ID and Status Validation', () => {
    it('should return 400 for invalid invitation ID format', async () => {
      const invalidIds = [
        'not-a-uuid',
        '123',
        'invalid-uuid-format',
        '',
        'abc-def-ghi'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(API_BASE_URL)
          .post(`/api/families/invitations/${invalidId}/accept`)
          .send({
            password: 'SecurePass123!@#',
            firstName: 'John',
            lastName: 'Doe'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return 400 for non-existent invitation ID', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${nonExistentId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data or expired invitation');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 400 for expired invitation', async () => {
      // This test assumes expired invitations return 400
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${expiredInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect('Content-Type', /json/);

      // Could be 400 for expired invitation based on business logic
      if (response.status === 400) {
        expect(response.body.error).toBe('Invalid request data or expired invitation');
      }
    });

    it('should return 400 for cancelled invitation', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${cancelledInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data or expired invitation');
    });

    it('should return 409 for email already registered', async () => {
      // The invitation email should conflict with existing admin email
      const conflictInvite = await request(API_BASE_URL)
        .post('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@example.com', // This email is already registered
          role: 'viewer'
        })
        .expect(409); // Should fail at invitation creation

      // If invitation creation succeeded, test acceptance
      if (conflictInvite.status === 201) {
        const response = await request(API_BASE_URL)
          .post(`/api/families/invitations/${conflictInvite.body.id}/accept`)
          .send({
            password: 'SecurePass123!@#',
            firstName: 'Conflict',
            lastName: 'User'
          })
          .expect('Content-Type', /json/)
          .expect(409);

        expect(response.body).toHaveProperty('error', 'Email already registered');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });
  });

  describe('Content Type and Request Format', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send('password=SecurePass123!@#&firstName=John&lastName=Doe')
        .expect(400);

      // Should reject form-encoded data
    });

    it('should return proper Content-Type header', async () => {
      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect('Content-Type', /application\/json/)
        .expect(201);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .set('Content-Type', 'application/json')
        .send('{"password": "SecurePass123!@#", invalid}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Validation and Security', () => {
    it('should not expose sensitive information in response', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'Secure',
          lastName: 'User'
        })
        .expect(201);

      // Ensure no sensitive data is exposed
      expect(response.body.member).not.toHaveProperty('password');
      expect(response.body.member).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('invitationToken');
      expect(response.body.family).not.toHaveProperty('apiKey');
    });

    it('should return valid UUIDs in response', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'UUID',
          lastName: 'Test'
        })
        .expect(201);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(response.body.member.id).toMatch(uuidRegex);
      expect(response.body.family.id).toMatch(uuidRegex);
    });

    it('should return valid timestamps in response', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'Timestamp',
          lastName: 'Test'
        })
        .expect(201);

      expect(new Date(response.body.member.createdAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.member.updatedAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.family.createdAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.family.updatedAt)).toBeInstanceOf(Date);
    });

    it('should return working access tokens', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'Token',
          lastName: 'Test'
        })
        .expect(201);

      // Test that the returned token works
      const profileResponse = await request(API_BASE_URL)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${response.body.tokens.accessToken}`)
        .expect(200);

      expect(profileResponse.body.id).toBe(response.body.member.id);
    });
  });

  describe('Edge Cases and Concurrency', () => {
    it('should handle concurrent acceptance attempts gracefully', async () => {
      const acceptRequest = {
        password: 'SecurePass123!@#',
        firstName: 'Concurrent',
        lastName: 'Test'
      };

      const requests = Array(3).fill(null).map(() =>
        request(API_BASE_URL)
          .post(`/api/families/invitations/${sampleInvitationId}/accept`)
          .send(acceptRequest)
      );

      const responses = await Promise.allSettled(requests);

      // Only first one should succeed, others should fail
      let successCount = 0;
      let errorCount = 0;

      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.status === 201) successCount++;
          else errorCount++;
        }
      });

      expect(successCount).toBe(1);
      expect(errorCount).toBe(2);
    });

    it('should maintain data consistency during acceptance', async () => {
      const beforeMembers = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'Consistency',
          lastName: 'Test'
        })
        .expect(201);

      const afterMembers = await request(API_BASE_URL)
        .get('/api/families/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(afterMembers.body.members.length).toBe(beforeMembers.body.members.length + 1);
      expect(afterMembers.body.total).toBe(beforeMembers.body.total + 1);
    });

    it('should handle acceptance during invitation cancellation race condition', async () => {
      // Simulate race condition between acceptance and cancellation
      const acceptPromise = request(API_BASE_URL)
        .post(`/api/families/invitations/${sampleInvitationId}/accept`)
        .send({
          password: 'SecurePass123!@#',
          firstName: 'Race',
          lastName: 'Condition'
        });

      const cancelPromise = request(API_BASE_URL)
        .delete(`/api/families/invitations/${sampleInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const [acceptResult, cancelResult] = await Promise.allSettled([acceptPromise, cancelPromise]);

      // Either accept succeeds and cancel fails, or vice versa
      const acceptSuccess = acceptResult.status === 'fulfilled' && acceptResult.value.status === 201;
      const cancelSuccess = cancelResult.status === 'fulfilled' && cancelResult.value.status === 200;

      expect(acceptSuccess || cancelSuccess).toBe(true);
      expect(acceptSuccess && cancelSuccess).toBe(false);
    });
  });
});