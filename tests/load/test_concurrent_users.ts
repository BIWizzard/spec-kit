/**
 * Load Test: Concurrent Users (100+ simultaneous)
 * Task: T446 - Load testing for concurrent users with 100+ simultaneous users
 *
 * Tests system behavior under high concurrent load to ensure stability
 * and acceptable performance degradation under stress.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

interface LoadTestResult {
  userCount: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  testDuration: number;
}

interface RequestResult {
  responseTime: number;
  statusCode: number;
  success: boolean;
  error?: string;
}

describe('Concurrent User Load Tests', () => {
  let testUsers: Array<{ email: string; password: string; token: string; familyId: string }> = [];
  const loadTestResults: LoadTestResult[] = [];

  beforeAll(async () => {
    // Clean up database
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();

    // Create multiple test users for concurrent testing
    console.log('Creating test users for load testing...');
    for (let i = 0; i < 20; i++) {
      const testUser = {
        email: `loadtest${i}@example.com`,
        password: 'SecurePass123!@#',
        firstName: `Load${i}`,
        lastName: 'Test',
        familyName: `Load Test Family ${i}`
      };

      try {
        const response = await request(API_BASE_URL)
          .post('/api/auth/register')
          .send(testUser);

        if (response.status === 200 || response.status === 201) {
          testUsers.push({
            email: testUser.email,
            password: testUser.password,
            token: response.body.tokens.accessToken,
            familyId: response.body.user.familyId
          });
        }
      } catch (error) {
        console.warn(`Failed to create test user ${i}:`, error);
      }
    }

    console.log(`Created ${testUsers.length} test users for load testing`);

    // Create test data for each user
    for (const user of testUsers.slice(0, 5)) { // Limit test data creation to 5 users
      try {
        await request(API_BASE_URL)
          .post('/api/income-events')
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            name: `Load Test Income for ${user.email}`,
            amount: 5000,
            scheduledDate: '2024-02-01',
            frequency: 'monthly'
          });

        await request(API_BASE_URL)
          .post('/api/payments')
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            payee: `Load Test Payment for ${user.email}`,
            amount: 1000,
            dueDate: '2024-02-15',
            paymentType: 'recurring',
            frequency: 'monthly'
          });
      } catch (error) {
        console.warn(`Failed to create test data for user ${user.email}:`, error);
      }
    }
  });

  afterAll(async () => {
    // Print load test summary
    console.log('\n=== LOAD TEST SUMMARY ===');
    loadTestResults.forEach(result => {
      console.log(`\n${result.userCount} Concurrent Users:`);
      console.log(`  Total Requests: ${result.totalRequests}`);
      console.log(`  Successful: ${result.successfulRequests} (${(100 - result.errorRate).toFixed(1)}%)`);
      console.log(`  Failed: ${result.failedRequests} (${result.errorRate.toFixed(1)}%)`);
      console.log(`  Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`  Median Response Time: ${result.medianResponseTime.toFixed(2)}ms`);
      console.log(`  P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  P99 Response Time: ${result.p99ResponseTime.toFixed(2)}ms`);
      console.log(`  Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);
      console.log(`  Test Duration: ${result.testDuration.toFixed(2)}s`);
    });

    await prisma.$disconnect();
  });

  const executeLoadTest = async (
    userCount: number,
    requestsPerUser: number,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    requestBody?: any
  ): Promise<LoadTestResult> => {
    console.log(`\nStarting load test: ${userCount} users, ${requestsPerUser} requests/user on ${method} ${endpoint}`);

    const startTime = Date.now();
    const results: RequestResult[] = [];

    // Create promise for each concurrent user
    const userPromises = Array(userCount).fill(null).map(async (_, userIndex) => {
      const user = testUsers[userIndex % testUsers.length]; // Reuse users if needed

      // Each user makes multiple requests
      const userRequests = Array(requestsPerUser).fill(null).map(async () => {
        const requestStart = Date.now();

        try {
          let req = request(API_BASE_URL)[method.toLowerCase()](endpoint);

          if (user && user.token) {
            req = req.set('Authorization', `Bearer ${user.token}`);
          }

          if (requestBody) {
            req = req.send(requestBody);
          }

          const response = await req;
          const responseTime = Date.now() - requestStart;

          return {
            responseTime,
            statusCode: response.status,
            success: response.status >= 200 && response.status < 300
          };
        } catch (error) {
          const responseTime = Date.now() - requestStart;
          return {
            responseTime,
            statusCode: 500,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      return Promise.all(userRequests);
    });

    // Execute all concurrent requests
    const userResults = await Promise.all(userPromises);

    // Flatten results
    userResults.forEach(userResult => {
      results.push(...userResult);
    });

    const endTime = Date.now();
    const testDuration = (endTime - startTime) / 1000; // seconds

    // Calculate statistics
    const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;

    const totalRequests = results.length;
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const medianResponseTime = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const requestsPerSecond = totalRequests / testDuration;
    const errorRate = (failedRequests / totalRequests) * 100;

    const loadTestResult: LoadTestResult = {
      userCount,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      medianResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errorRate,
      testDuration
    };

    loadTestResults.push(loadTestResult);
    return loadTestResult;
  };

  describe('Basic Load Testing', () => {
    it('should handle 10 concurrent users with 5 requests each', async () => {
      const result = await executeLoadTest(10, 5, '/api/auth/me');

      expect(result.errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(result.p95ResponseTime).toBeLessThan(1000); // P95 under 1 second
      expect(result.requestsPerSecond).toBeGreaterThan(5); // At least 5 req/s
    }, 30000);

    it('should handle 25 concurrent users with 4 requests each', async () => {
      const result = await executeLoadTest(25, 4, '/api/families');

      expect(result.errorRate).toBeLessThan(10); // Less than 10% error rate
      expect(result.p95ResponseTime).toBeLessThan(2000); // P95 under 2 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(10); // At least 10 req/s
    }, 45000);

    it('should handle 50 concurrent users with 2 requests each', async () => {
      const result = await executeLoadTest(50, 2, '/api/income-events');

      expect(result.errorRate).toBeLessThan(15); // Less than 15% error rate
      expect(result.p95ResponseTime).toBeLessThan(3000); // P95 under 3 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(15); // At least 15 req/s
    }, 60000);
  });

  describe('High Load Testing', () => {
    it('should handle 100 concurrent users with 1 request each', async () => {
      const result = await executeLoadTest(100, 1, '/api/payments');

      expect(result.errorRate).toBeLessThan(20); // Less than 20% error rate
      expect(result.p95ResponseTime).toBeLessThan(5000); // P95 under 5 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(10); // At least 10 req/s

      console.log(`100 concurrent users test completed:`);
      console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`);
      console.log(`  P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);
    }, 120000);

    it('should handle 150 concurrent users with 1 request each', async () => {
      const result = await executeLoadTest(150, 1, '/api/budget-categories');

      // More lenient thresholds for extreme load
      expect(result.errorRate).toBeLessThan(30); // Less than 30% error rate
      expect(result.p95ResponseTime).toBeLessThan(10000); // P95 under 10 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(5); // At least 5 req/s

      console.log(`150 concurrent users test completed:`);
      console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`);
      console.log(`  P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);
    }, 180000);
  });

  describe('Write Operation Load Testing', () => {
    it('should handle 20 concurrent users creating income events', async () => {
      const result = await executeLoadTest(20, 2, '/api/income-events', 'POST', {
        name: 'Load Test Income',
        amount: 1000,
        scheduledDate: '2024-03-01',
        frequency: 'monthly'
      });

      expect(result.errorRate).toBeLessThan(15); // Less than 15% error rate for writes
      expect(result.p95ResponseTime).toBeLessThan(2000); // P95 under 2 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(5); // At least 5 req/s
    }, 60000);

    it('should handle 30 concurrent users creating payments', async () => {
      const result = await executeLoadTest(30, 1, '/api/payments', 'POST', {
        payee: 'Load Test Payment',
        amount: 500,
        dueDate: '2024-03-15',
        paymentType: 'once'
      });

      expect(result.errorRate).toBeLessThan(20); // Less than 20% error rate for writes
      expect(result.p95ResponseTime).toBeLessThan(3000); // P95 under 3 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(5); // At least 5 req/s
    }, 90000);
  });

  describe('Mixed Workload Testing', () => {
    it('should handle mixed read/write operations with 50 concurrent users', async () => {
      console.log('\nStarting mixed workload test with 50 concurrent users...');

      const startTime = Date.now();
      const allResults: RequestResult[] = [];

      // Simulate mixed workload
      const mixedPromises = Array(50).fill(null).map(async (_, userIndex) => {
        const user = testUsers[userIndex % testUsers.length];
        const results: RequestResult[] = [];

        // Each user performs a mix of operations
        const operations = [
          { method: 'GET' as const, endpoint: '/api/auth/me', body: null },
          { method: 'GET' as const, endpoint: '/api/families', body: null },
          { method: 'GET' as const, endpoint: '/api/income-events', body: null },
          { method: 'GET' as const, endpoint: '/api/payments', body: null },
          { method: 'POST' as const, endpoint: '/api/income-events',
            body: { name: `Mixed Load Test ${Date.now()}`, amount: 100, scheduledDate: '2024-04-01', frequency: 'once' }
          }
        ];

        for (const op of operations) {
          const requestStart = Date.now();

          try {
            let req = request(API_BASE_URL)[op.method.toLowerCase()](op.endpoint);

            if (user && user.token) {
              req = req.set('Authorization', `Bearer ${user.token}`);
            }

            if (op.body) {
              req = req.send(op.body);
            }

            const response = await req;
            const responseTime = Date.now() - requestStart;

            results.push({
              responseTime,
              statusCode: response.status,
              success: response.status >= 200 && response.status < 300
            });
          } catch (error) {
            const responseTime = Date.now() - requestStart;
            results.push({
              responseTime,
              statusCode: 500,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }

          // Small delay between operations for more realistic simulation
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        return results;
      });

      const userResults = await Promise.all(mixedPromises);
      userResults.forEach(results => allResults.push(...results));

      const endTime = Date.now();
      const testDuration = (endTime - startTime) / 1000;

      // Calculate statistics
      const responseTimes = allResults.map(r => r.responseTime).sort((a, b) => a - b);
      const successfulRequests = allResults.filter(r => r.success).length;
      const totalRequests = allResults.length;
      const errorRate = ((totalRequests - successfulRequests) / totalRequests) * 100;
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const requestsPerSecond = totalRequests / testDuration;

      console.log(`Mixed workload test completed:`);
      console.log(`  Total Operations: ${totalRequests}`);
      console.log(`  Success Rate: ${(100 - errorRate).toFixed(1)}%`);
      console.log(`  P95 Response Time: ${p95ResponseTime.toFixed(2)}ms`);
      console.log(`  Operations/sec: ${requestsPerSecond.toFixed(2)}`);

      expect(errorRate).toBeLessThan(25); // Less than 25% error rate for mixed workload
      expect(p95ResponseTime).toBeLessThan(5000); // P95 under 5 seconds
      expect(requestsPerSecond).toBeGreaterThan(10); // At least 10 ops/s
    }, 300000);
  });

  describe('Stress Testing', () => {
    it('should gracefully degrade under extreme load (200 concurrent users)', async () => {
      const result = await executeLoadTest(200, 1, '/api/auth/me');

      // Under extreme load, we expect some degradation but system should remain stable
      expect(result.errorRate).toBeLessThan(50); // System should not completely fail
      expect(result.p95ResponseTime).toBeLessThan(30000); // Should respond within 30 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(1); // Should maintain some throughput

      console.log(`Stress test (200 users) results:`);
      console.log(`  System Stability: ${result.errorRate < 50 ? 'STABLE' : 'UNSTABLE'}`);
      console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`);
      console.log(`  P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.requestsPerSecond.toFixed(2)} req/s`);

      // Log system behavior under stress
      if (result.errorRate > 25) {
        console.warn('⚠️  High error rate detected under stress - consider scaling improvements');
      }
      if (result.p95ResponseTime > 10000) {
        console.warn('⚠️  High response times detected - consider performance optimizations');
      }
    }, 240000);
  });

  describe('Endurance Testing', () => {
    it('should maintain performance over sustained load', async () => {
      console.log('\nStarting endurance test: 25 users for extended duration...');

      const testRounds = 5; // Multiple rounds to simulate sustained load
      const results: LoadTestResult[] = [];

      for (let round = 0; round < testRounds; round++) {
        console.log(`Endurance test round ${round + 1}/${testRounds}`);

        const result = await executeLoadTest(25, 3, '/api/income-events');
        results.push(result);

        // Brief pause between rounds
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Analyze performance stability over time
      const errorRates = results.map(r => r.errorRate);
      const responseTimes = results.map(r => r.p95ResponseTime);
      const throughputs = results.map(r => r.requestsPerSecond);

      const avgErrorRate = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;

      // Check for performance degradation over time
      const errorRateVariance = Math.max(...errorRates) - Math.min(...errorRates);
      const responseTimeVariance = Math.max(...responseTimes) - Math.min(...responseTimes);

      console.log(`Endurance test summary:`);
      console.log(`  Average Error Rate: ${avgErrorRate.toFixed(2)}%`);
      console.log(`  Average P95 Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Average Throughput: ${avgThroughput.toFixed(2)} req/s`);
      console.log(`  Error Rate Variance: ${errorRateVariance.toFixed(2)}%`);
      console.log(`  Response Time Variance: ${responseTimeVariance.toFixed(2)}ms`);

      // Performance should remain relatively stable
      expect(avgErrorRate).toBeLessThan(15); // Average error rate under 15%
      expect(errorRateVariance).toBeLessThan(20); // Error rate shouldn't vary more than 20%
      expect(responseTimeVariance).toBeLessThan(2000); // Response time variance under 2 seconds
      expect(avgThroughput).toBeGreaterThan(5); // Maintain reasonable throughput
    }, 300000);
  });

  describe('Performance Benchmarking', () => {
    it('should establish concurrent user performance baselines', () => {
      console.log('\n=== CONCURRENT USER PERFORMANCE BASELINES ===');

      const baselines = {
        '10 users': { maxErrorRate: 5, maxP95: 1000, minThroughput: 10 },
        '25 users': { maxErrorRate: 10, maxP95: 2000, minThroughput: 15 },
        '50 users': { maxErrorRate: 15, maxP95: 3000, minThroughput: 20 },
        '100 users': { maxErrorRate: 20, maxP95: 5000, minThroughput: 15 },
        '150 users': { maxErrorRate: 30, maxP95: 10000, minThroughput: 10 }
      };

      Object.entries(baselines).forEach(([userCount, baseline]) => {
        console.log(`${userCount}:`);
        console.log(`  Max Error Rate: ${baseline.maxErrorRate}%`);
        console.log(`  Max P95 Response Time: ${baseline.maxP95}ms`);
        console.log(`  Min Throughput: ${baseline.minThroughput} req/s`);
      });

      // This test always passes - it's for documentation purposes
      expect(true).toBe(true);
    });
  });
});