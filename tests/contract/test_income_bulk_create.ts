/**
 * Contract Test: POST /api/income-events/bulk
 * Task: T065 - Income bulk create endpoint contract validation
 *
 * This test validates the bulk income creation API contract against the OpenAPI specification.
 * MUST FAIL initially until the endpoint is implemented per TDD methodology.
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Contract Test: POST /api/income-events/bulk', () => {
  let authTokens: any;
  const testUser = {
    email: 'income-bulk@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Income',
    lastName: 'Bulk',
    familyName: 'Bulk Family'
  };

  beforeEach(async () => {
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

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

  describe('Valid Bulk Creation Operations', () => {
    it('should create multiple income events successfully', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'January Salary',
            amount: 5000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly',
            source: 'Main Job'
          },
          {
            name: 'Freelance Project',
            amount: 2500.00,
            scheduledDate: '2024-01-20',
            frequency: 'once',
            source: 'Client ABC'
          },
          {
            name: 'Weekly Bonus',
            amount: 300.00,
            scheduledDate: '2024-01-22',
            frequency: 'weekly',
            source: 'Side Gig'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('created');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('errors');

      // Should create all 3 income events
      expect(response.body.created).toHaveLength(3);
      expect(response.body.summary.totalCreated).toBe(3);
      expect(response.body.summary.totalFailed).toBe(0);
      expect(response.body.errors).toHaveLength(0);

      // Validate individual created income events
      const created = response.body.created;

      // January Salary
      const salary = created.find((item: any) => item.name === 'January Salary');
      expect(salary).toBeDefined();
      expect(salary.amount).toBe(5000.00);
      expect(salary.frequency).toBe('monthly');
      expect(salary.nextOccurrence).toBe('2024-02-15');
      expect(salary.status).toBe('scheduled');

      // Freelance Project
      const freelance = created.find((item: any) => item.name === 'Freelance Project');
      expect(freelance).toBeDefined();
      expect(freelance.amount).toBe(2500.00);
      expect(freelance.frequency).toBe('once');
      expect(freelance.nextOccurrence).toBeNull();

      // Weekly Bonus
      const bonus = created.find((item: any) => item.name === 'Weekly Bonus');
      expect(bonus).toBeDefined();
      expect(bonus.frequency).toBe('weekly');
      expect(bonus.nextOccurrence).toBe('2024-01-29');
    });

    it('should handle mixed valid and invalid income events', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Valid Income 1',
            amount: 3000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          },
          {
            name: '', // Invalid - empty name
            amount: 2000.00,
            scheduledDate: '2024-01-20',
            frequency: 'monthly'
          },
          {
            name: 'Valid Income 2',
            amount: 1500.00,
            scheduledDate: '2024-01-25',
            frequency: 'once'
          },
          {
            name: 'Invalid Income',
            amount: -100, // Invalid - negative amount
            scheduledDate: '2024-01-30',
            frequency: 'monthly'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(207); // Multi-status response

      expect(response.body.created).toHaveLength(2); // Only valid ones
      expect(response.body.errors).toHaveLength(2); // Invalid ones
      expect(response.body.summary.totalCreated).toBe(2);
      expect(response.body.summary.totalFailed).toBe(2);

      // Validate error details
      const errors = response.body.errors;
      expect(errors[0]).toHaveProperty('index', 1); // Second item (0-indexed)
      expect(errors[0]).toHaveProperty('error', 'Invalid request data');
      expect(errors[0]).toHaveProperty('message');

      expect(errors[1]).toHaveProperty('index', 3); // Fourth item
      expect(errors[1]).toHaveProperty('error', 'Invalid request data');
    });

    it('should calculate nextOccurrence correctly for all frequencies', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Weekly Income',
            amount: 500.00,
            scheduledDate: '2024-01-01', // Monday
            frequency: 'weekly'
          },
          {
            name: 'Monthly Income',
            amount: 3000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          },
          {
            name: 'One-time Income',
            amount: 1000.00,
            scheduledDate: '2024-01-20',
            frequency: 'once'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      const created = response.body.created;

      const weekly = created.find((item: any) => item.frequency === 'weekly');
      expect(weekly.nextOccurrence).toBe('2024-01-08');

      const monthly = created.find((item: any) => item.frequency === 'monthly');
      expect(monthly.nextOccurrence).toBe('2024-02-15');

      const oneTime = created.find((item: any) => item.frequency === 'once');
      expect(oneTime.nextOccurrence).toBeNull();
    });

    it('should set proper initial values for all income events', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Test Income',
            amount: 2000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly',
            source: 'Test Source',
            notes: 'Test notes'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      const income = response.body.created[0];
      expect(income.status).toBe('scheduled');
      expect(income.allocatedAmount).toBe(0);
      expect(income.remainingAmount).toBe(2000.00);
      expect(income.actualDate).toBeNull();
      expect(income.actualAmount).toBeNull();
      expect(income.source).toBe('Test Source');
      expect(income.notes).toBe('Test notes');
    });
  });

  describe('Input Validation', () => {
    it('should require incomeEvents array', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/incomeEvents.*required|missing.*income/i);
    });

    it('should require non-empty incomeEvents array', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ incomeEvents: [] })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/empty.*array|at.*least.*one/i);
    });

    it('should enforce maximum batch size', async () => {
      // Try to create 101 income events (assuming max is 100)
      const incomeEvents = Array.from({ length: 101 }, (_, i) => ({
        name: `Income ${i + 1}`,
        amount: 1000.00,
        scheduledDate: '2024-01-15',
        frequency: 'monthly'
      }));

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ incomeEvents })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body.message).toMatch(/maximum.*batch.*size|too.*many/i);
    });

    it('should validate each income event individually', async () => {
      const bulkData = {
        incomeEvents: [
          {
            // Missing name
            amount: 1000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          },
          {
            name: 'Invalid Amount',
            amount: 'invalid-amount', // Invalid amount type
            scheduledDate: '2024-01-20',
            frequency: 'monthly'
          },
          {
            name: 'Invalid Date',
            amount: 1500.00,
            scheduledDate: 'invalid-date', // Invalid date format
            frequency: 'monthly'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(207);

      expect(response.body.created).toHaveLength(0);
      expect(response.body.errors).toHaveLength(3);
      expect(response.body.summary.totalFailed).toBe(3);

      // Each error should have index and details
      response.body.errors.forEach((error: any, index: number) => {
        expect(error).toHaveProperty('index', index);
        expect(error).toHaveProperty('error', 'Invalid request data');
        expect(error).toHaveProperty('message');
      });
    });

    it('should validate frequency values', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Invalid Frequency',
            amount: 1000.00,
            scheduledDate: '2024-01-15',
            frequency: 'invalid-frequency'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(207);

      expect(response.body.created).toHaveLength(0);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].index).toBe(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Test Income',
            amount: 1000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    it('should return 401 with invalid token', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Test Income',
            amount: 1000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', 'Bearer invalid-token')
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('Family Data Isolation', () => {
    it('should create income events for authenticated user\'s family only', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Family Income 1',
            amount: 1000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          },
          {
            name: 'Family Income 2',
            amount: 2000.00,
            scheduledDate: '2024-01-20',
            frequency: 'once'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify income events were created for this family
      const listResponse = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(2);

      // Create second family and verify they can't see the income
      const secondFamily = {
        email: 'other-bulk@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Other',
        lastName: 'Bulk',
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

      const otherListResponse = await request(API_BASE_URL)
        .get('/api/income-events')
        .set('Authorization', `Bearer ${otherLoginResponse.body.tokens.accessToken}`)
        .expect(200);

      expect(otherListResponse.body).toHaveLength(0);
    });
  });

  describe('Performance and Batch Processing', () => {
    it('should handle moderate batch sizes efficiently', async () => {
      const incomeEvents = Array.from({ length: 25 }, (_, i) => ({
        name: `Batch Income ${i + 1}`,
        amount: 1000.00 + i,
        scheduledDate: '2024-01-15',
        frequency: i % 2 === 0 ? 'monthly' : 'once'
      }));

      const startTime = Date.now();
      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ incomeEvents })
        .expect('Content-Type', /json/)
        .expect(201);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds

      expect(response.body.created).toHaveLength(25);
      expect(response.body.summary.totalCreated).toBe(25);
      expect(response.body.summary.totalFailed).toBe(0);
    });

    it('should provide comprehensive summary information', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Summary Test 1',
            amount: 1000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          },
          {
            name: 'Summary Test 2',
            amount: 2000.00,
            scheduledDate: '2024-01-20',
            frequency: 'once'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body.summary).toHaveProperty('totalCreated', 2);
      expect(response.body.summary).toHaveProperty('totalFailed', 0);
      expect(response.body.summary).toHaveProperty('totalScheduledAmount', 3000.00);

      if (response.body.summary.processingTime) {
        expect(typeof response.body.summary.processingTime).toBe('number');
      }
    });
  });

  describe('Response Format Validation', () => {
    it('should return proper JSON content type', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'JSON Test Income',
            amount: 1000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          }
        ]
      };

      await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);
    });

    it('should handle empty successful creation correctly', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: '', // Invalid
            amount: 1000.00,
            scheduledDate: '2024-01-15',
            frequency: 'monthly'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(207);

      expect(response.body.created).toHaveLength(0);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.summary.totalCreated).toBe(0);
      expect(response.body.summary.totalFailed).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle different frequency combinations', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Weekly Income',
            amount: 400.00,
            scheduledDate: '2024-01-01',
            frequency: 'weekly'
          },
          {
            name: 'Biweekly Income',
            amount: 800.00,
            scheduledDate: '2024-01-01',
            frequency: 'biweekly'
          },
          {
            name: 'Monthly Income',
            amount: 3000.00,
            scheduledDate: '2024-01-01',
            frequency: 'monthly'
          },
          {
            name: 'Quarterly Income',
            amount: 9000.00,
            scheduledDate: '2024-01-01',
            frequency: 'quarterly'
          },
          {
            name: 'Annual Income',
            amount: 50000.00,
            scheduledDate: '2024-01-01',
            frequency: 'annual'
          },
          {
            name: 'One-time Income',
            amount: 5000.00,
            scheduledDate: '2024-01-01',
            frequency: 'once'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.created).toHaveLength(6);

      // Check next occurrences are calculated correctly for each frequency
      const created = response.body.created;

      const weekly = created.find((item: any) => item.frequency === 'weekly');
      expect(weekly.nextOccurrence).toBe('2024-01-08');

      const biweekly = created.find((item: any) => item.frequency === 'biweekly');
      expect(biweekly.nextOccurrence).toBe('2024-01-15');

      const monthly = created.find((item: any) => item.frequency === 'monthly');
      expect(monthly.nextOccurrence).toBe('2024-02-01');

      const quarterly = created.find((item: any) => item.frequency === 'quarterly');
      expect(quarterly.nextOccurrence).toBe('2024-04-01');

      const annual = created.find((item: any) => item.frequency === 'annual');
      expect(annual.nextOccurrence).toBe('2025-01-01');

      const once = created.find((item: any) => item.frequency === 'once');
      expect(once.nextOccurrence).toBeNull();
    });

    it('should handle special date scenarios', async () => {
      const bulkData = {
        incomeEvents: [
          {
            name: 'Leap Year Income',
            amount: 1000.00,
            scheduledDate: '2024-02-29', // Leap year date
            frequency: 'annual'
          },
          {
            name: 'End of Month',
            amount: 2000.00,
            scheduledDate: '2024-01-31',
            frequency: 'monthly'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/api/income-events/bulk')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bulkData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.created).toHaveLength(2);

      const leapYear = response.body.created.find((item: any) => item.name === 'Leap Year Income');
      expect(leapYear.nextOccurrence).toBe('2025-02-28'); // Non-leap year fallback

      const endOfMonth = response.body.created.find((item: any) => item.name === 'End of Month');
      expect(endOfMonth.nextOccurrence).toBe('2024-02-29'); // Leap year February
    });
  });
});