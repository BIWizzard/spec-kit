/**
 * Contract Test: POST /api/income-events
 * Task: T056 - Income event creation endpoint contract validation
 *
 * This test validates the income event creation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/income-events', () => {
  let authTokens: any;
  const testUser = {
    email: 'income-create@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Create',
    familyName: 'Create Family'
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

  describe('Valid Income Event Creation', () => {
    it('should create one-time income event successfully', async () => {
      const incomeData = {
        name: 'Freelance Project',
        amount: 2500.00,
        scheduledDate: '2024-03-15',
        frequency: 'once',
        source: 'Client ABC',
        notes: 'Website redesign project'
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(incomeData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', incomeData.name);
      expect(response.body).toHaveProperty('amount', incomeData.amount);
      expect(response.body).toHaveProperty('scheduledDate', incomeData.scheduledDate);
      expect(response.body).toHaveProperty('frequency', incomeData.frequency);
      expect(response.body).toHaveProperty('source', incomeData.source);
      expect(response.body).toHaveProperty('notes', incomeData.notes);
      expect(response.body).toHaveProperty('status', 'scheduled');
      expect(response.body).toHaveProperty('allocatedAmount', 0);
      expect(response.body).toHaveProperty('remainingAmount', incomeData.amount);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate data types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.amount).toBe('number');
      expect(typeof response.body.allocatedAmount).toBe('number');
      expect(typeof response.body.remainingAmount).toBe('number');
    });

    it('should create recurring monthly income event successfully', async () => {
      const incomeData = {
        name: 'Monthly Salary',
        amount: 5000.00,
        scheduledDate: '2024-01-01',
        frequency: 'monthly',
        source: 'ABC Corporation',
        autoBudgetAllocation: true
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(incomeData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('frequency', 'monthly');
      expect(response.body).toHaveProperty('nextOccurrence');
      expect(response.body.nextOccurrence).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should create weekly income event successfully', async () => {
      const incomeData = {
        name: 'Weekly Wages',
        amount: 800.00,
        scheduledDate: '2024-01-08',
        frequency: 'weekly',
        source: 'Part-time Job'
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(incomeData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.frequency).toBe('weekly');
    });

    it('should create biweekly income event successfully', async () => {
      const incomeData = {
        name: 'Biweekly Paycheck',
        amount: 1750.00,
        scheduledDate: '2024-01-15',
        frequency: 'biweekly'
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(incomeData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.frequency).toBe('biweekly');
    });

    it('should create quarterly income event successfully', async () => {
      const incomeData = {
        name: 'Quarterly Bonus',
        amount: 10000.00,
        scheduledDate: '2024-03-31',
        frequency: 'quarterly'
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(incomeData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.frequency).toBe('quarterly');
    });

    it('should create annual income event successfully', async () => {
      const incomeData = {
        name: 'Annual Bonus',
        amount: 15000.00,
        scheduledDate: '2024-12-31',
        frequency: 'annual'
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(incomeData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.frequency).toBe('annual');
    });

    it('should handle minimal required fields', async () => {
      const incomeData = {
        name: 'Minimal Income',
        amount: 100.00,
        scheduledDate: '2024-01-01',
        frequency: 'once'
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(incomeData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.name).toBe(incomeData.name);
      expect(response.body.source).toBeNull();
      expect(response.body.notes).toBeNull();
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        {}, // Empty object
        { name: 'Test' }, // Missing amount, scheduledDate, frequency
        { amount: 100 }, // Missing name, scheduledDate, frequency
        { name: 'Test', amount: 100 }, // Missing scheduledDate, frequency
        { name: 'Test', amount: 100, scheduledDate: '2024-01-01' } // Missing frequency
      ];

      for (const invalidData of invalidRequests) {
        const response = await request(API_BASE_URL)
          .post('/api/income-events')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send(invalidData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid request data');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid amount values', async () => {
      const invalidAmounts = [
        0, // Zero amount
        -100, // Negative amount
        1000000, // Exceeds maximum
        'invalid', // Non-numeric
        null
      ];

      for (const invalidAmount of invalidAmounts) {
        const response = await request(API_BASE_URL)
          .post('/api/income-events')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            name: 'Test Income',
            amount: invalidAmount,
            scheduledDate: '2024-01-01',
            frequency: 'once'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid date formats', async () => {
      const invalidDates = [
        'invalid-date',
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        '01-01-2024', // Wrong format
        '2024/01/01', // Wrong format
        null,
        ''
      ];

      for (const invalidDate of invalidDates) {
        const response = await request(API_BASE_URL)
          .post('/api/income-events')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            name: 'Test Income',
            amount: 1000.00,
            scheduledDate: invalidDate,
            frequency: 'once'
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for invalid frequency values', async () => {
      const invalidFrequencies = [
        'invalid',
        'daily',
        'yearly', // Should be 'annual'
        null,
        ''
      ];

      for (const invalidFreq of invalidFrequencies) {
        const response = await request(API_BASE_URL)
          .post('/api/income-events')
          .set('Authorization', `Bearer ${authTokens.accessToken}`)
          .send({
            name: 'Test Income',
            amount: 1000.00,
            scheduledDate: '2024-01-01',
            frequency: invalidFreq
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should return 400 for string length violations', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'a'.repeat(256), // Exceeds max length
          amount: 1000.00,
          scheduledDate: '2024-01-01',
          frequency: 'once',
          source: 'b'.repeat(256), // Exceeds max length
          notes: 'c'.repeat(1001) // Exceeds max length
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for empty name', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: '',
          amount: 1000.00,
          scheduledDate: '2024-01-01',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .send({
          name: 'Test Income',
          amount: 1000.00,
          scheduledDate: '2024-01-01',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Test Income',
          amount: 1000.00,
          scheduledDate: '2024-01-01',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate past scheduled dates appropriately', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateString = pastDate.toISOString().split('T')[0];

      // Should allow past dates for one-time events (e.g., recording past income)
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Past Income',
          amount: 1000.00,
          scheduledDate: pastDateString,
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.scheduledDate).toBe(pastDateString);
    });

    it('should handle decimal precision correctly', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Precise Amount',
          amount: 1234.56,
          scheduledDate: '2024-01-01',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.amount).toBe(1234.56);
    });

    it('should set default values appropriately', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Default Values Test',
          amount: 1000.00,
          scheduledDate: '2024-01-01',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.status).toBe('scheduled');
      expect(response.body.allocatedAmount).toBe(0);
      expect(response.body.remainingAmount).toBe(1000.00);
      expect(response.body.actualAmount).toBeNull();
      expect(response.body.actualDate).toBeNull();
    });
  });

  describe('Family Data Isolation', () => {
    it('should create income events only for authenticated user\'s family', async () => {
      // Create income event
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Family Income',
          amount: 3000.00,
          scheduledDate: '2024-01-01',
          frequency: 'monthly'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify it's created for the correct family
      const listResponse = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].id).toBe(response.body.id);
    });
  });

  describe('Content-Type and Headers', () => {
    it('should require JSON content type', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body.error).toMatch(/content.*type|invalid.*data/i);
    });

    it('should return JSON content type', async () => {
      await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Content Type Test',
          amount: 1000.00,
          scheduledDate: '2024-01-01',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(201);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid amount', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Minimum Amount',
          amount: 0.01,
          scheduledDate: '2024-01-01',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.amount).toBe(0.01);
    });

    it('should handle maximum valid amount', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Maximum Amount',
          amount: 999999.99,
          scheduledDate: '2024-01-01',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.amount).toBe(999999.99);
    });

    it('should handle leap year dates', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({
          name: 'Leap Year Income',
          amount: 1000.00,
          scheduledDate: '2024-02-29',
          frequency: 'once'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.scheduledDate).toBe('2024-02-29');
    });
  });
});