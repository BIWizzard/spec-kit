/**
 * Contract Test: POST /api/auth/register
 * Task: T027 - Authentication registration endpoint contract validation
 *
 * This test validates the registration API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/register', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Registration Request', () => {
    const validRegisterRequest = {
      email: 'test@example.com',
      password: 'SecurePass123!@#',
      firstName: 'John',
      lastName: 'Doe',
      familyName: 'Doe Family',
      timezone: 'America/New_York',
      currency: 'USD'
    };

    it('should return 201 with valid registration data', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(validRegisterRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('family');
      expect(response.body).toHaveProperty('tokens');

      // Validate user object structure
      const { user } = response.body;
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', validRegisterRequest.email);
      expect(user).toHaveProperty('firstName', validRegisterRequest.firstName);
      expect(user).toHaveProperty('lastName', validRegisterRequest.lastName);
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('permissions');
      expect(user).toHaveProperty('mfaEnabled');
      expect(user).toHaveProperty('emailVerified');
      expect(user).toHaveProperty('createdAt');

      // Validate family object structure
      const { family } = response.body;
      expect(family).toHaveProperty('id');
      expect(family).toHaveProperty('name', validRegisterRequest.familyName);
      expect(family).toHaveProperty('settings');

      // Validate family settings structure
      expect(family.settings).toHaveProperty('timezone', validRegisterRequest.timezone);
      expect(family.settings).toHaveProperty('currency', validRegisterRequest.currency);
      expect(family.settings).toHaveProperty('fiscalYearStart');

      // Validate tokens structure
      const { tokens } = response.body;
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens).toHaveProperty('tokenType', 'Bearer');

      // Validate data types
      expect(typeof user.id).toBe('string');
      expect(typeof user.mfaEnabled).toBe('boolean');
      expect(typeof user.emailVerified).toBe('boolean');
      expect(typeof family.id).toBe('string');
      expect(typeof family.settings.fiscalYearStart).toBe('number');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should create family member with admin role by default', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(validRegisterRequest)
        .expect(201);

      expect(response.body.user.role).toBe('admin');
    });

    it('should set default permissions for admin role', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(validRegisterRequest)
        .expect(201);

      const { permissions } = response.body.user;
      expect(permissions.canManageBankAccounts).toBe(true);
      expect(permissions.canEditPayments).toBe(true);
      expect(permissions.canViewReports).toBe(true);
      expect(permissions.canManageFamily).toBe(true);
    });

    it('should use default values for optional fields', async () => {
      const minimalRequest = {
        email: 'minimal@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Jane',
        lastName: 'Smith',
        familyName: 'Smith Family'
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(minimalRequest)
        .expect(201);

      expect(response.body.family.settings.timezone).toBe('America/New_York');
      expect(response.body.family.settings.currency).toBe('USD');
    });
  });

  describe('Invalid Registration Requests', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { password: 'SecurePass123!@#', firstName: 'John', lastName: 'Doe', familyName: 'Doe Family' },
        { email: 'test@example.com', firstName: 'John', lastName: 'Doe', familyName: 'Doe Family' },
        { email: 'test@example.com', password: 'SecurePass123!@#', lastName: 'Doe', familyName: 'Doe Family' },
        { email: 'test@example.com', password: 'SecurePass123!@#', firstName: 'John', familyName: 'Doe Family' },
        { email: 'test@example.com', password: 'SecurePass123!@#', firstName: 'John', lastName: 'Doe' }
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/register')
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for invalid email format', async () => {
      const invalidEmailRequests = [
        'plainaddress',
        'email@',
        '@domain.com',
        'email..email@domain.com',
        'email@domain..com'
      ].map(email => ({
        email,
        password: 'SecurePass123!@#',
        firstName: 'John',
        lastName: 'Doe',
        familyName: 'Doe Family'
      }));

      for (const request of invalidEmailRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/register')
          .send(request)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for weak password', async () => {
      const weakPasswords = [
        'short',           // Too short
        'nouppercaselowercase123!',  // No uppercase
        'NOLOWERCASEUPPERCASE123!',  // No lowercase
        'NoNumbersUpperLower!',      // No numbers
        'NoSpecialChars123ABC'       // No special characters
      ];

      for (const password of weakPasswords) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password,
            firstName: 'John',
            lastName: 'Doe',
            familyName: 'Doe Family'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
        expect(response.body.message).toContain('password');
      }
    });

    it('should return 400 for invalid currency code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!@#',
          firstName: 'John',
          lastName: 'Doe',
          familyName: 'Doe Family',
          currency: 'INVALID'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for string length violations', async () => {
      const violations = [
        {
          field: 'firstName',
          value: '',
          expected: 'minimum length 1'
        },
        {
          field: 'firstName',
          value: 'a'.repeat(51),
          expected: 'maximum length 50'
        },
        {
          field: 'lastName',
          value: '',
          expected: 'minimum length 1'
        },
        {
          field: 'lastName',
          value: 'a'.repeat(51),
          expected: 'maximum length 50'
        },
        {
          field: 'familyName',
          value: '',
          expected: 'minimum length 1'
        },
        {
          field: 'familyName',
          value: 'a'.repeat(101),
          expected: 'maximum length 100'
        }
      ];

      for (const violation of violations) {
        const request = {
          email: 'test@example.com',
          password: 'SecurePass123!@#',
          firstName: 'John',
          lastName: 'Doe',
          familyName: 'Doe Family'
        };
        request[violation.field] = violation.value;

        const response = await request(API_BASE_URL)
          .post('/api/auth/register')
          .send(request)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Duplicate Email Handling', () => {
    const existingUserRequest = {
      email: 'existing@example.com',
      password: 'SecurePass123!@#',
      firstName: 'Existing',
      lastName: 'User',
      familyName: 'Existing Family'
    };

    it('should return 409 for duplicate email', async () => {
      // Register first user
      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(existingUserRequest)
        .expect(201);

      // Try to register with same email
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          ...existingUserRequest,
          firstName: 'Different',
          familyName: 'Different Family'
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Email already exists');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should be case-insensitive for email uniqueness', async () => {
      // Register with lowercase email
      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(existingUserRequest)
        .expect(201);

      // Try to register with uppercase email
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          ...existingUserRequest,
          email: existingUserRequest.email.toUpperCase()
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.error).toBe('Email already exists');
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send('email=test@example.com&password=SecurePass123!@#')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should not require authentication (security: [])', async () => {
      // This endpoint should be accessible without Bearer token
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'noauth@example.com',
          password: 'SecurePass123!@#',
          firstName: 'No',
          lastName: 'Auth',
          familyName: 'No Auth Family'
        })
        .expect(201);

      expect(response.body).toHaveProperty('tokens');
    });
  });
});