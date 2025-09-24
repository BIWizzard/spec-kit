/**
 * Contract Test: POST /api/auth/login
 * Task: T028 - Authentication login endpoint contract validation
 *
 * This test validates the login API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/auth/login', () => {
  const testUser = {
    email: 'testlogin@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Test',
    lastName: 'Login',
    familyName: 'Test Family'
  };

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create test user for login tests
    await request(API_BASE_URL)
      .post('/api/auth/register')
      .send(testUser);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Valid Login Request', () => {
    it('should return 200 with valid credentials', async () => {
      const loginRequest = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send(loginRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body).toHaveProperty('mfaRequired');

      // Validate user object structure
      const { user } = response.body;
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', testUser.email);
      expect(user).toHaveProperty('firstName', testUser.firstName);
      expect(user).toHaveProperty('lastName', testUser.lastName);
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('permissions');
      expect(user).toHaveProperty('mfaEnabled');
      expect(user).toHaveProperty('emailVerified');
      expect(user).toHaveProperty('lastLoginAt');
      expect(user).toHaveProperty('createdAt');

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
      expect(typeof response.body.mfaRequired).toBe('boolean');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should accept rememberMe option', async () => {
      const loginRequest = {
        email: testUser.email,
        password: testUser.password,
        rememberMe: true
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send(loginRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Should return longer-lived tokens when rememberMe is true
      expect(response.body.tokens.expiresIn).toBeGreaterThan(3600); // More than 1 hour
    });

    it('should default rememberMe to false', async () => {
      const loginRequest = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send(loginRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      // Default expiration should be reasonable (not extended)
      expect(response.body.tokens.expiresIn).toBeLessThanOrEqual(3600); // 1 hour or less
    });

    it('should be case-insensitive for email', async () => {
      const loginRequest = {
        email: testUser.email.toUpperCase(),
        password: testUser.password
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send(loginRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.user.email).toBe(testUser.email.toLowerCase());
    });
  });

  describe('MFA Authentication Flow', () => {
    let userWithMFA: any;

    beforeEach(async () => {
      // Create user and enable MFA
      const registerResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'mfauser@example.com',
          password: 'SecurePass123!@#',
          firstName: 'MFA',
          lastName: 'User',
          familyName: 'MFA Family'
        });

      userWithMFA = registerResponse.body.user;

      // Setup and enable MFA (this would normally involve TOTP setup)
      await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${registerResponse.body.tokens.accessToken}`);

      await request(API_BASE_URL)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${registerResponse.body.tokens.accessToken}`)
        .send({ totpCode: '123456' });
    });

    it('should require TOTP code when MFA is enabled', async () => {
      const loginRequest = {
        email: 'mfauser@example.com',
        password: 'SecurePass123!@#'
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send(loginRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.mfaRequired).toBe(true);
      expect(response.body.tokens).toBeUndefined(); // No tokens until MFA verified
    });

    it('should accept valid TOTP code with MFA enabled', async () => {
      const loginRequest = {
        email: 'mfauser@example.com',
        password: 'SecurePass123!@#',
        totpCode: '123456' // Valid TOTP code
      };

      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send(loginRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.mfaRequired).toBe(false);
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens).toHaveProperty('accessToken');
    });

    it('should reject invalid TOTP code format', async () => {
      const invalidTotpCodes = [
        '12345',     // Too short
        '1234567',   // Too long
        '12345a',    // Contains letters
        'abcdef'     // All letters
      ];

      for (const totpCode of invalidTotpCodes) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/login')
          .send({
            email: 'mfauser@example.com',
            password: 'SecurePass123!@#',
            totpCode
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Invalid Login Requests', () => {
    it('should return 401 for invalid credentials', async () => {
      const invalidCredentials = [
        {
          email: testUser.email,
          password: 'WrongPassword123!'
        },
        {
          email: 'nonexistent@example.com',
          password: testUser.password
        },
        {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!'
        }
      ];

      for (const credentials of invalidCredentials) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/login')
          .send(credentials)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid credentials');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { password: testUser.password },       // Missing email
        { email: testUser.email },             // Missing password
        {}                                     // Missing both
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/login')
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('code');
      }
    });

    it('should return 400 for invalid email format', async () => {
      const invalidEmailFormats = [
        'plainaddress',
        'email@',
        '@domain.com',
        'email..email@domain.com'
      ];

      for (const email of invalidEmailFormats) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/login')
          .send({
            email,
            password: testUser.password
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });
  });

  describe('Account Lockout Protection', () => {
    it('should return 423 after multiple failed login attempts', async () => {
      const invalidCredentials = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(API_BASE_URL)
          .post('/api/auth/login')
          .send(invalidCredentials)
          .expect(401);
      }

      // Next attempt should be locked
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect('Content-Type', /json/)
        .expect(423);

      expect(response.body).toHaveProperty('error', 'Account locked due to failed attempts');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should lock account even with correct password after lockout', async () => {
      const invalidCredentials = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      // Trigger lockout with failed attempts
      for (let i = 0; i < 5; i++) {
        await request(API_BASE_URL)
          .post('/api/auth/login')
          .send(invalidCredentials)
          .expect(401);
      }

      // Even correct password should be locked
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect('Content-Type', /json/)
        .expect(423);

      expect(response.body.error).toBe('Account locked due to failed attempts');
    });
  });

  describe('Content-Type and Security Headers', () => {
    it('should require application/json content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send('email=test@example.com&password=SecurePass123!@#')
        .expect(400);

      // Should reject form-encoded data for security
    });

    it('should not require authentication (security: [])', async () => {
      // This endpoint should be accessible without Bearer token
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
    });
  });

  describe('Response Time Requirements', () => {
    it('should respond within reasonable time for valid login', async () => {
      const startTime = Date.now();

      await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should have consistent response time for invalid login (prevent timing attacks)', async () => {
      const validLoginTime = async () => {
        const startTime = Date.now();
        await request(API_BASE_URL)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password
          });
        return Date.now() - startTime;
      };

      const invalidLoginTime = async () => {
        const startTime = Date.now();
        await request(API_BASE_URL)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword123!'
          });
        return Date.now() - startTime;
      };

      const validTime = await validLoginTime();
      const invalidTime = await invalidLoginTime();

      // Times should be relatively similar to prevent timing attacks
      const timeDifference = Math.abs(validTime - invalidTime);
      expect(timeDifference).toBeLessThan(1000); // Within 1 second difference
    });
  });
});