/**
 * Performance Test: API Endpoints Response Time (<200ms)
 * Task: T445 - Performance testing for API endpoints with <200ms target
 *
 * Tests all API endpoints to ensure response times meet performance requirements.
 * Target: <200ms response time for p95 performance.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  FAST: 50,      // <50ms for simple operations
  NORMAL: 100,   // <100ms for moderate operations
  SLOW: 200,     // <200ms for complex operations (p95 requirement)
  VERY_SLOW: 500 // <500ms for database-heavy operations
};

interface PerformanceResult {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  threshold: number;
  passed: boolean;
}

const performanceResults: PerformanceResult[] = [];

describe('API Endpoints Performance Tests', () => {
  let authToken: string;
  let familyId: string;
  let testIncomeEventId: string;
  let testPaymentId: string;
  let testBankAccountId: string;
  let testBudgetCategoryId: string;

  const testUser = {
    email: 'perftest@example.com',
    password: 'SecurePass123!@#',
    firstName: 'Perf',
    lastName: 'Test',
    familyName: 'Performance Test Family'
  };

  beforeAll(async () => {
    // Clean up and setup test data
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Register test user
    const registerResponse = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send(testUser);

    authToken = registerResponse.body.tokens.accessToken;
    familyId = registerResponse.body.user.familyId;

    // Create test data for performance tests
    const incomeResponse = await request(API_BASE_URL)
      .post('/api/income-events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Performance Test Income',
        amount: 5000,
        scheduledDate: '2024-02-01',
        frequency: 'monthly'
      });
    testIncomeEventId = incomeResponse.body.incomeEvent.id;

    const paymentResponse = await request(API_BASE_URL)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payee: 'Performance Test Payment',
        amount: 1000,
        dueDate: '2024-02-15',
        paymentType: 'recurring',
        frequency: 'monthly'
      });
    testPaymentId = paymentResponse.body.payment.id;

    const budgetResponse = await request(API_BASE_URL)
      .post('/api/budget-categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Performance Test Budget',
        targetPercentage: 50,
        color: '#FFD166'
      });
    testBudgetCategoryId = budgetResponse.body.budgetCategory.id;
  });

  afterAll(async () => {
    // Print performance summary
    console.log('\n=== API PERFORMANCE SUMMARY ===');
    console.log(`Total Endpoints Tested: ${performanceResults.length}`);

    const passedTests = performanceResults.filter(r => r.passed);
    const failedTests = performanceResults.filter(r => !r.passed);

    console.log(`Passed: ${passedTests.length}/${performanceResults.length}`);
    console.log(`Failed: ${failedTests.length}/${performanceResults.length}`);

    if (failedTests.length > 0) {
      console.log('\n=== FAILED PERFORMANCE TESTS ===');
      failedTests.forEach(test => {
        console.log(`❌ ${test.method} ${test.endpoint}: ${test.responseTime}ms (threshold: ${test.threshold}ms)`);
      });
    }

    // Performance percentiles
    const responseTimes = performanceResults.map(r => r.responseTime).sort((a, b) => a - b);
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

    console.log('\n=== RESPONSE TIME PERCENTILES ===');
    console.log(`P50 (median): ${p50}ms`);
    console.log(`P95: ${p95}ms`);
    console.log(`P99: ${p99}ms`);
    console.log(`Min: ${Math.min(...responseTimes)}ms`);
    console.log(`Max: ${Math.max(...responseTimes)}ms`);
    console.log(`Average: ${Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)}ms`);

    await prisma.$disconnect();
  });

  const measurePerformance = async (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    threshold: number,
    requestConfig: {
      auth?: boolean;
      body?: any;
      headers?: any;
    } = {}
  ): Promise<PerformanceResult> => {
    const startTime = process.hrtime.bigint();

    let req = request(API_BASE_URL)[method.toLowerCase()](endpoint);

    if (requestConfig.auth) {
      req = req.set('Authorization', `Bearer ${authToken}`);
    }

    if (requestConfig.headers) {
      Object.keys(requestConfig.headers).forEach(key => {
        req = req.set(key, requestConfig.headers[key]);
      });
    }

    if (requestConfig.body) {
      req = req.send(requestConfig.body);
    }

    const response = await req;

    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    const result: PerformanceResult = {
      endpoint,
      method,
      responseTime,
      statusCode: response.status,
      threshold,
      passed: responseTime <= threshold
    };

    performanceResults.push(result);
    return result;
  };

  describe('Authentication Endpoints Performance', () => {
    it('POST /api/auth/login should respond within 100ms', async () => {
      const result = await measurePerformance('POST', '/api/auth/login', PERFORMANCE_THRESHOLDS.NORMAL, {
        body: {
          email: testUser.email,
          password: testUser.password
        }
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('GET /api/auth/me should respond within 50ms', async () => {
      const result = await measurePerformance('GET', '/api/auth/me', PERFORMANCE_THRESHOLDS.FAST, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FAST);
    });

    it('POST /api/auth/refresh should respond within 50ms', async () => {
      // First get a refresh token
      const loginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const result = await measurePerformance('POST', '/api/auth/refresh', PERFORMANCE_THRESHOLDS.FAST, {
        body: {
          refreshToken: loginResponse.body.tokens.refreshToken
        }
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FAST);
    });

    it('GET /api/auth/sessions should respond within 100ms', async () => {
      const result = await measurePerformance('GET', '/api/auth/sessions', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });
  });

  describe('Family Management Endpoints Performance', () => {
    it('GET /api/families should respond within 50ms', async () => {
      const result = await measurePerformance('GET', '/api/families', PERFORMANCE_THRESHOLDS.FAST, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FAST);
    });

    it('GET /api/families/members should respond within 100ms', async () => {
      const result = await measurePerformance('GET', '/api/families/members', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('GET /api/families/activity should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/families/activity', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });
  });

  describe('Income Events Endpoints Performance', () => {
    it('GET /api/income-events should respond within 100ms', async () => {
      const result = await measurePerformance('GET', '/api/income-events', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('POST /api/income-events should respond within 100ms', async () => {
      const result = await measurePerformance('POST', '/api/income-events', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true,
        body: {
          name: 'Performance Test Income 2',
          amount: 4000,
          scheduledDate: '2024-03-01',
          frequency: 'monthly'
        }
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('GET /api/income-events/upcoming should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/income-events/upcoming', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('GET /api/income-events/summary should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/income-events/summary', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it(`GET /api/income-events/{id} should respond within 50ms`, async () => {
      const result = await measurePerformance('GET', `/api/income-events/${testIncomeEventId}`, PERFORMANCE_THRESHOLDS.FAST, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FAST);
    });
  });

  describe('Payment Management Endpoints Performance', () => {
    it('GET /api/payments should respond within 100ms', async () => {
      const result = await measurePerformance('GET', '/api/payments', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('POST /api/payments should respond within 100ms', async () => {
      const result = await measurePerformance('POST', '/api/payments', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true,
        body: {
          payee: 'Performance Test Payment 2',
          amount: 500,
          dueDate: '2024-03-15',
          paymentType: 'once'
        }
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('GET /api/payments/upcoming should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/payments/upcoming', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('GET /api/payments/overdue should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/payments/overdue', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('GET /api/payments/summary should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/payments/summary', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it(`GET /api/payments/{id} should respond within 50ms`, async () => {
      const result = await measurePerformance('GET', `/api/payments/${testPaymentId}`, PERFORMANCE_THRESHOLDS.FAST, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FAST);
    });
  });

  describe('Budget Management Endpoints Performance', () => {
    it('GET /api/budget-categories should respond within 100ms', async () => {
      const result = await measurePerformance('GET', '/api/budget-categories', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('POST /api/budget-categories should respond within 100ms', async () => {
      const result = await measurePerformance('POST', '/api/budget-categories', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true,
        body: {
          name: 'Performance Test Budget 2',
          targetPercentage: 30,
          color: '#8FAD77'
        }
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('GET /api/budget/overview should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/budget/overview', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('GET /api/budget/performance should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/budget/performance', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('GET /api/budget-allocations should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/budget-allocations', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });
  });

  describe('Bank Integration Endpoints Performance', () => {
    it('GET /api/bank-accounts should respond within 100ms', async () => {
      const result = await measurePerformance('GET', '/api/bank-accounts', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });

    it('GET /api/transactions should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/transactions', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('GET /api/transactions/uncategorized should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/transactions/uncategorized', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('POST /api/plaid/link-token should respond within 100ms', async () => {
      const result = await measurePerformance('POST', '/api/plaid/link-token', PERFORMANCE_THRESHOLDS.NORMAL, {
        auth: true,
        body: {
          userId: 'performance-test-user'
        }
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
    });
  });

  describe('Reports and Analytics Endpoints Performance', () => {
    it('GET /api/reports/cash-flow should respond within 500ms', async () => {
      const result = await measurePerformance('GET', '/api/reports/cash-flow?timeRange=3months', PERFORMANCE_THRESHOLDS.VERY_SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.VERY_SLOW);
    });

    it('GET /api/reports/spending-analysis should respond within 500ms', async () => {
      const result = await measurePerformance('GET', '/api/reports/spending-analysis?timeRange=3months', PERFORMANCE_THRESHOLDS.VERY_SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.VERY_SLOW);
    });

    it('GET /api/reports/budget-performance should respond within 500ms', async () => {
      const result = await measurePerformance('GET', '/api/reports/budget-performance?timeRange=3months', PERFORMANCE_THRESHOLDS.VERY_SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.VERY_SLOW);
    });

    it('GET /api/reports/net-worth should respond within 200ms', async () => {
      const result = await measurePerformance('GET', '/api/reports/net-worth', PERFORMANCE_THRESHOLDS.SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('GET /api/analytics/dashboard should respond within 500ms', async () => {
      const result = await measurePerformance('GET', '/api/analytics/dashboard', PERFORMANCE_THRESHOLDS.VERY_SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.VERY_SLOW);
    });

    it('GET /api/analytics/trends should respond within 500ms', async () => {
      const result = await measurePerformance('GET', '/api/analytics/trends', PERFORMANCE_THRESHOLDS.VERY_SLOW, {
        auth: true
      });

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.VERY_SLOW);
    });
  });

  describe('Infrastructure Endpoints Performance', () => {
    it('GET /api/health should respond within 10ms', async () => {
      const result = await measurePerformance('GET', '/api/health', 10, {});

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(10);
    });

    it('GET /api/docs should respond within 50ms', async () => {
      const result = await measurePerformance('GET', '/api/docs', PERFORMANCE_THRESHOLDS.FAST, {});

      expect(result.passed).toBe(true);
      expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FAST);
    });
  });

  describe('Performance Consistency Tests', () => {
    it('should maintain consistent performance across multiple requests', async () => {
      const iterations = 10;
      const endpoint = '/api/auth/me';
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const result = await measurePerformance('GET', endpoint, PERFORMANCE_THRESHOLDS.FAST, {
          auth: true
        });
        responseTimes.push(result.responseTime);
      }

      // Calculate standard deviation
      const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const variance = responseTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / responseTimes.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be low for consistent performance
      expect(stdDev).toBeLessThan(mean * 0.5); // Within 50% of mean

      console.log(`\nConsistency Test Results for ${endpoint}:`);
      console.log(`Mean: ${mean.toFixed(2)}ms`);
      console.log(`Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`Min: ${Math.min(...responseTimes).toFixed(2)}ms`);
      console.log(`Max: ${Math.max(...responseTimes).toFixed(2)}ms`);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const endpoint = '/api/families';

      const promises = Array(concurrentRequests).fill(null).map(async () => {
        return measurePerformance('GET', endpoint, PERFORMANCE_THRESHOLDS.NORMAL, {
          auth: true
        });
      });

      const results = await Promise.all(promises);

      // All concurrent requests should meet performance requirements
      results.forEach((result, index) => {
        expect(result.passed).toBe(true);
        expect(result.responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.NORMAL);
      });

      const avgResponseTime = results.reduce((sum, result) => sum + result.responseTime, 0) / results.length;
      console.log(`\nConcurrent Requests Test Results:`);
      console.log(`Concurrent Requests: ${concurrentRequests}`);
      console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish performance baselines', async () => {
      // Define baseline response times for critical endpoints
      const baselines = {
        'GET /api/auth/me': 30,
        'GET /api/families': 40,
        'GET /api/income-events': 80,
        'GET /api/payments': 80,
        'GET /api/budget-categories': 80
      };

      for (const [endpoint, baseline] of Object.entries(baselines)) {
        const [method, path] = endpoint.split(' ');
        const result = await measurePerformance(method as any, path, baseline, {
          auth: true
        });

        // Log baseline comparison
        const performanceRatio = result.responseTime / baseline;
        const status = performanceRatio <= 1 ? '✅' : performanceRatio <= 1.5 ? '⚠️' : '❌';

        console.log(`${status} ${endpoint}: ${result.responseTime.toFixed(2)}ms (baseline: ${baseline}ms, ratio: ${performanceRatio.toFixed(2)}x)`);

        // Allow up to 50% performance degradation before failing
        expect(performanceRatio).toBeLessThanOrEqual(1.5);
      }
    });
  });
});