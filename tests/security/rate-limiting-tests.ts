/**
 * T451: Rate Limiting Configuration and Testing
 *
 * Comprehensive rate limiting configuration and testing framework that validates
 * rate limiting implementation, configuration, and effectiveness against abuse.
 */

import axios, { AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

interface RateLimitConfig {
  endpoint: string;
  method: string;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: string;
  handler?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  store?: string;
}

interface RateLimitTestResult {
  endpoint: string;
  method: string;
  testType: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'ERROR';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  evidence?: any;
  recommendation: string;
  metrics?: {
    requestsSent: number;
    requestsSuccessful: number;
    requestsBlocked: number;
    averageResponseTime: number;
    testDurationMs: number;
  };
}

interface RateLimitTestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  errors: number;
  overallStatus: 'SECURE' | 'VULNERABLE' | 'MISCONFIGURED';
  results: RateLimitTestResult[];
}

class RateLimitTester {
  private apiClient: AxiosInstance;
  private baseUrl: string;
  private testResults: RateLimitTestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.apiClient = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      validateStatus: () => true
    });
  }

  /**
   * Run comprehensive rate limiting tests
   */
  async runRateLimitTests(): Promise<RateLimitTestSummary> {
    console.log('🚦 Starting rate limiting configuration and testing...');
    console.log(`🎯 Target: ${this.baseUrl}`);

    this.testResults = [];

    try {
      // Test authentication endpoints
      await this.testAuthenticationRateLimits();

      // Test API endpoints
      await this.testAPIRateLimits();

      // Test abuse scenarios
      await this.testAbuseScenarios();

      // Test rate limit bypasses
      await this.testRateLimitBypasses();

      // Test distributed rate limiting
      await this.testDistributedRateLimiting();

      // Test rate limit headers
      await this.testRateLimitHeaders();

      // Test different client scenarios
      await this.testClientScenarios();

      return this.generateTestSummary();

    } catch (error) {
      this.addResult({
        endpoint: 'GENERAL',
        method: 'TEST',
        testType: 'RATE_LIMIT_TEST_EXECUTION',
        status: 'ERROR',
        severity: 'CRITICAL',
        description: `Rate limiting test execution failed: ${error.message}`,
        recommendation: 'Fix testing infrastructure and re-run rate limiting tests'
      });

      return this.generateTestSummary();
    }
  }

  /**
   * Test authentication endpoint rate limits
   */
  private async testAuthenticationRateLimits(): Promise<void> {
    console.log('🔐 Testing authentication rate limits...');

    const authEndpoints: RateLimitConfig[] = [
      {
        endpoint: '/api/auth/login',
        method: 'POST',
        windowMs: 60000, // 1 minute
        maxRequests: 5    // Conservative for login
      },
      {
        endpoint: '/api/auth/register',
        method: 'POST',
        windowMs: 60000,
        maxRequests: 3    // Very conservative for registration
      },
      {
        endpoint: '/api/auth/forgot-password',
        method: 'POST',
        windowMs: 300000, // 5 minutes
        maxRequests: 3    // Very conservative for password reset
      },
      {
        endpoint: '/api/auth/reset-password',
        method: 'POST',
        windowMs: 300000,
        maxRequests: 5
      },
      {
        endpoint: '/api/auth/refresh',
        method: 'POST',
        windowMs: 60000,
        maxRequests: 20   // More permissive for refresh
      }
    ];

    for (const config of authEndpoints) {
      await this.testEndpointRateLimit(config);
      await this.testBruteForceProtection(config);

      // Wait between tests to avoid interference
      await this.sleep(2000);
    }
  }

  /**
   * Test API endpoint rate limits
   */
  private async testAPIRateLimits(): Promise<void> {
    console.log('📡 Testing API endpoint rate limits...');

    const apiEndpoints: RateLimitConfig[] = [
      {
        endpoint: '/api/families',
        method: 'GET',
        windowMs: 60000,
        maxRequests: 100
      },
      {
        endpoint: '/api/income-events',
        method: 'GET',
        windowMs: 60000,
        maxRequests: 200
      },
      {
        endpoint: '/api/payments',
        method: 'GET',
        windowMs: 60000,
        maxRequests: 200
      },
      {
        endpoint: '/api/reports/cash-flow',
        method: 'GET',
        windowMs: 60000,
        maxRequests: 50   // Reports are expensive
      },
      {
        endpoint: '/api/plaid/webhook',
        method: 'POST',
        windowMs: 60000,
        maxRequests: 1000 // Webhook needs higher limit
      }
    ];

    for (const config of apiEndpoints) {
      await this.testEndpointRateLimit(config);

      // Wait between tests
      await this.sleep(1000);
    }
  }

  /**
   * Test specific endpoint rate limiting
   */
  private async testEndpointRateLimit(config: RateLimitConfig): Promise<void> {
    console.log(`Testing rate limit for ${config.method} ${config.endpoint}...`);

    const startTime = performance.now();
    let successfulRequests = 0;
    let blockedRequests = 0;
    let totalResponseTime = 0;

    // Send requests up to expected limit plus buffer
    const testRequests = Math.min(config.maxRequests + 20, 100);

    try {
      for (let i = 0; i < testRequests; i++) {
        const requestStart = performance.now();

        const response = await this.makeTestRequest(config.endpoint, config.method);

        const requestTime = performance.now() - requestStart;
        totalResponseTime += requestTime;

        if (response.status === 429) {
          blockedRequests++;

          // Check rate limit headers
          this.validateRateLimitHeaders(response, config);

        } else if (response.status < 400) {
          successfulRequests++;
        }

        // Small delay between requests
        await this.sleep(50);
      }

      const testDuration = performance.now() - startTime;
      const averageResponseTime = totalResponseTime / testRequests;

      // Analyze results
      this.analyzeRateLimitResults({
        config,
        requestsSent: testRequests,
        requestsSuccessful: successfulRequests,
        requestsBlocked: blockedRequests,
        averageResponseTime,
        testDurationMs: testDuration
      });

    } catch (error) {
      this.addResult({
        endpoint: config.endpoint,
        method: config.method,
        testType: 'RATE_LIMIT_TEST_ERROR',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Failed to test rate limit: ${error.message}`,
        recommendation: 'Investigate endpoint availability and rate limit configuration'
      });
    }
  }

  /**
   * Test brute force protection
   */
  private async testBruteForceProtection(config: RateLimitConfig): Promise<void> {
    console.log(`Testing brute force protection for ${config.method} ${config.endpoint}...`);

    if (!config.endpoint.includes('auth')) return;

    const credentials = [
      { email: 'admin@example.com', password: 'wrong1' },
      { email: 'admin@example.com', password: 'wrong2' },
      { email: 'admin@example.com', password: 'wrong3' },
      { email: 'admin@example.com', password: 'wrong4' },
      { email: 'admin@example.com', password: 'wrong5' },
      { email: 'admin@example.com', password: 'wrong6' }
    ];

    let blockedAfterAttempts = 0;
    let progressiveDelays = [];

    try {
      for (let i = 0; i < credentials.length; i++) {
        const startTime = performance.now();

        const response = await this.makeTestRequest(config.endpoint, config.method, credentials[i]);

        const responseTime = performance.now() - startTime;
        progressiveDelays.push(responseTime);

        if (response.status === 429) {
          blockedAfterAttempts = i + 1;
          break;
        }

        await this.sleep(100);
      }

      // Check for progressive delays (defense against brute force)
      const hasProgressiveDelays = progressiveDelays.length > 2 &&
        progressiveDelays[progressiveDelays.length - 1] > progressiveDelays[0] * 2;

      if (blockedAfterAttempts === 0) {
        this.addResult({
          endpoint: config.endpoint,
          method: config.method,
          testType: 'BRUTE_FORCE_PROTECTION',
          status: 'FAIL',
          severity: 'HIGH',
          description: 'No brute force protection detected - all failed login attempts succeeded',
          evidence: { attemptsTested: credentials.length, blocked: false },
          recommendation: 'Implement account lockout after multiple failed authentication attempts'
        });
      } else if (blockedAfterAttempts > 10) {
        this.addResult({
          endpoint: config.endpoint,
          method: config.method,
          testType: 'BRUTE_FORCE_PROTECTION',
          status: 'WARNING',
          severity: 'MEDIUM',
          description: `Brute force protection threshold may be too high: ${blockedAfterAttempts} attempts`,
          evidence: { blockedAfterAttempts },
          recommendation: 'Consider lowering the threshold for failed authentication attempts'
        });
      } else {
        this.addResult({
          endpoint: config.endpoint,
          method: config.method,
          testType: 'BRUTE_FORCE_PROTECTION',
          status: 'PASS',
          severity: 'INFO',
          description: `Brute force protection active - blocked after ${blockedAfterAttempts} attempts`,
          evidence: {
            blockedAfterAttempts,
            hasProgressiveDelays,
            responseTimesMs: progressiveDelays
          },
          recommendation: 'Brute force protection is working correctly'
        });
      }

    } catch (error) {
      this.addResult({
        endpoint: config.endpoint,
        method: config.method,
        testType: 'BRUTE_FORCE_TEST_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test brute force protection: ${error.message}`,
        recommendation: 'Investigate brute force protection implementation'
      });
    }
  }

  /**
   * Test abuse scenarios
   */
  private async testAbuseScenarios(): Promise<void> {
    console.log('⚠️ Testing abuse scenarios...');

    // Test rapid burst requests
    await this.testBurstRequests();

    // Test sustained load
    await this.testSustainedLoad();

    // Test expensive operations
    await this.testExpensiveOperations();
  }

  /**
   * Test burst requests
   */
  private async testBurstRequests(): Promise<void> {
    const endpoint = '/api/families';
    const burstSize = 50;
    const startTime = performance.now();

    console.log(`Testing burst requests: ${burstSize} requests simultaneously...`);

    try {
      // Send all requests simultaneously
      const requests = Array.from({ length: burstSize }, () =>
        this.makeTestRequest(endpoint, 'GET')
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const successfulRequests = responses.filter(r => r.status < 400).length;
      const blockedRequests = responses.filter(r => r.status === 429).length;
      const totalTime = endTime - startTime;

      if (blockedRequests === 0) {
        this.addResult({
          endpoint,
          method: 'GET',
          testType: 'BURST_REQUEST_PROTECTION',
          status: 'FAIL',
          severity: 'HIGH',
          description: 'No protection against burst requests detected',
          evidence: {
            burstSize,
            successfulRequests,
            blockedRequests,
            totalTimeMs: totalTime
          },
          recommendation: 'Implement burst protection to handle sudden spikes in traffic'
        });
      } else if (blockedRequests > burstSize * 0.7) {
        this.addResult({
          endpoint,
          method: 'GET',
          testType: 'BURST_REQUEST_PROTECTION',
          status: 'PASS',
          severity: 'INFO',
          description: 'Good burst protection - most requests blocked',
          evidence: {
            burstSize,
            successfulRequests,
            blockedRequests,
            totalTimeMs: totalTime
          },
          recommendation: 'Burst protection is working effectively'
        });
      } else {
        this.addResult({
          endpoint,
          method: 'GET',
          testType: 'BURST_REQUEST_PROTECTION',
          status: 'WARNING',
          severity: 'MEDIUM',
          description: 'Partial burst protection - some requests passed through',
          evidence: {
            burstSize,
            successfulRequests,
            blockedRequests,
            totalTimeMs: totalTime
          },
          recommendation: 'Consider tightening burst protection thresholds'
        });
      }

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'BURST_REQUEST_TEST_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test burst requests: ${error.message}`,
        recommendation: 'Investigate burst protection implementation'
      });
    }
  }

  /**
   * Test sustained load
   */
  private async testSustainedLoad(): Promise<void> {
    const endpoint = '/api/income-events';
    const requestsPerSecond = 10;
    const durationSeconds = 30;
    const totalRequests = requestsPerSecond * durationSeconds;

    console.log(`Testing sustained load: ${requestsPerSecond} req/s for ${durationSeconds}s...`);

    const startTime = performance.now();
    let successfulRequests = 0;
    let blockedRequests = 0;

    try {
      for (let i = 0; i < totalRequests; i++) {
        const response = await this.makeTestRequest(endpoint, 'GET');

        if (response.status < 400) {
          successfulRequests++;
        } else if (response.status === 429) {
          blockedRequests++;
        }

        // Maintain sustained rate
        await this.sleep(1000 / requestsPerSecond);
      }

      const endTime = performance.now();
      const actualDuration = (endTime - startTime) / 1000;
      const actualRate = successfulRequests / actualDuration;

      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'SUSTAINED_LOAD_TEST',
        status: blockedRequests > totalRequests * 0.1 ? 'PASS' : 'WARNING',
        severity: blockedRequests > totalRequests * 0.1 ? 'INFO' : 'MEDIUM',
        description: `Sustained load test: ${actualRate.toFixed(2)} req/s achieved`,
        evidence: {
          requestedRate: requestsPerSecond,
          actualRate: actualRate,
          successfulRequests,
          blockedRequests,
          durationSeconds: actualDuration
        },
        recommendation: blockedRequests > totalRequests * 0.1
          ? 'Sustained load handling is appropriate'
          : 'Consider implementing better sustained load protection'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'SUSTAINED_LOAD_TEST_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test sustained load: ${error.message}`,
        recommendation: 'Investigate sustained load handling'
      });
    }
  }

  /**
   * Test expensive operations
   */
  private async testExpensiveOperations(): Promise<void> {
    console.log('💰 Testing expensive operation limits...');

    const expensiveEndpoints = [
      { endpoint: '/api/reports/cash-flow', method: 'GET', expectedLimit: 10 },
      { endpoint: '/api/reports/spending-analysis', method: 'GET', expectedLimit: 10 },
      { endpoint: '/api/analytics/dashboard', method: 'GET', expectedLimit: 20 },
      { endpoint: '/api/reports/export', method: 'POST', expectedLimit: 5 }
    ];

    for (const config of expensiveEndpoints) {
      let blockedRequests = 0;
      let successfulRequests = 0;

      try {
        // Test up to twice the expected limit
        for (let i = 0; i < config.expectedLimit * 2; i++) {
          const response = await this.makeTestRequest(config.endpoint, config.method, {
            format: 'json',
            dateRange: 'last30days'
          });

          if (response.status === 429) {
            blockedRequests++;
          } else if (response.status < 400) {
            successfulRequests++;
          }

          await this.sleep(200);
        }

        if (blockedRequests === 0) {
          this.addResult({
            endpoint: config.endpoint,
            method: config.method,
            testType: 'EXPENSIVE_OPERATION_LIMIT',
            status: 'FAIL',
            severity: 'MEDIUM',
            description: 'No rate limiting on expensive operations detected',
            evidence: {
              expectedLimit: config.expectedLimit,
              successfulRequests,
              blockedRequests
            },
            recommendation: 'Implement stricter rate limiting on resource-intensive operations'
          });
        } else {
          this.addResult({
            endpoint: config.endpoint,
            method: config.method,
            testType: 'EXPENSIVE_OPERATION_LIMIT',
            status: 'PASS',
            severity: 'INFO',
            description: 'Rate limiting active on expensive operations',
            evidence: {
              expectedLimit: config.expectedLimit,
              successfulRequests,
              blockedRequests
            },
            recommendation: 'Expensive operation rate limiting is working correctly'
          });
        }

      } catch (error) {
        this.addResult({
          endpoint: config.endpoint,
          method: config.method,
          testType: 'EXPENSIVE_OPERATION_TEST_ERROR',
          status: 'ERROR',
          severity: 'LOW',
          description: `Failed to test expensive operation limits: ${error.message}`,
          recommendation: 'Investigate expensive operation rate limiting'
        });
      }
    }
  }

  /**
   * Test rate limit bypass attempts
   */
  private async testRateLimitBypasses(): Promise<void> {
    console.log('🚪 Testing rate limit bypass attempts...');

    const testEndpoint = '/api/families';

    // Test 1: Different User-Agent headers
    await this.testUserAgentBypass(testEndpoint);

    // Test 2: X-Forwarded-For manipulation
    await this.testIPSpoofing(testEndpoint);

    // Test 3: Different request methods
    await this.testMethodBypass(testEndpoint);

    // Test 4: Header manipulation
    await this.testHeaderBypass(testEndpoint);

    // Test 5: Case manipulation
    await this.testCaseBypass(testEndpoint);
  }

  /**
   * Test User-Agent bypass
   */
  private async testUserAgentBypass(endpoint: string): Promise<void> {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Googlebot/2.1 (+http://www.google.com/bot.html)',
      'Bingbot/2.0 (+http://www.bing.com/bingbot.htm)'
    ];

    let bypassSuccessful = false;

    try {
      // First, trigger rate limit with default headers
      for (let i = 0; i < 20; i++) {
        await this.makeTestRequest(endpoint, 'GET');
        await this.sleep(50);
      }

      // Then try with different User-Agent headers
      for (const userAgent of userAgents) {
        const response = await this.apiClient.get(endpoint, {
          headers: { 'User-Agent': userAgent }
        });

        if (response.status < 400) {
          bypassSuccessful = true;
          break;
        }
      }

      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'USER_AGENT_BYPASS',
        status: bypassSuccessful ? 'FAIL' : 'PASS',
        severity: bypassSuccessful ? 'MEDIUM' : 'INFO',
        description: bypassSuccessful
          ? 'Rate limit can be bypassed using different User-Agent headers'
          : 'User-Agent bypass protection is working',
        evidence: { userAgentsTested: userAgents.length, bypassSuccessful },
        recommendation: bypassSuccessful
          ? 'Ensure rate limiting is not bypassed by User-Agent manipulation'
          : 'User-Agent bypass protection is effective'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'USER_AGENT_BYPASS_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test User-Agent bypass: ${error.message}`,
        recommendation: 'Investigate User-Agent bypass protection'
      });
    }
  }

  /**
   * Test IP spoofing bypass
   */
  private async testIPSpoofing(endpoint: string): Promise<void> {
    const spoofedIPs = [
      '192.168.1.1',
      '10.0.0.1',
      '127.0.0.1',
      '8.8.8.8',
      '1.1.1.1'
    ];

    const spoofHeaders = [
      'X-Forwarded-For',
      'X-Real-IP',
      'X-Client-IP',
      'Client-IP',
      'True-Client-IP'
    ];

    let bypassSuccessful = false;

    try {
      // First, trigger rate limit
      for (let i = 0; i < 20; i++) {
        await this.makeTestRequest(endpoint, 'GET');
        await this.sleep(50);
      }

      // Test IP spoofing with various headers
      for (const header of spoofHeaders) {
        for (const ip of spoofedIPs) {
          const response = await this.apiClient.get(endpoint, {
            headers: { [header]: ip }
          });

          if (response.status < 400) {
            bypassSuccessful = true;
            break;
          }
        }
        if (bypassSuccessful) break;
      }

      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'IP_SPOOFING_BYPASS',
        status: bypassSuccessful ? 'FAIL' : 'PASS',
        severity: bypassSuccessful ? 'HIGH' : 'INFO',
        description: bypassSuccessful
          ? 'Rate limit can be bypassed using IP spoofing headers'
          : 'IP spoofing bypass protection is working',
        evidence: {
          headersTested: spoofHeaders.length,
          ipsTested: spoofedIPs.length,
          bypassSuccessful
        },
        recommendation: bypassSuccessful
          ? 'Implement proper client IP detection and validate spoofing headers'
          : 'IP spoofing protection is effective'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'IP_SPOOFING_BYPASS_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test IP spoofing bypass: ${error.message}`,
        recommendation: 'Investigate IP spoofing bypass protection'
      });
    }
  }

  /**
   * Test method bypass
   */
  private async testMethodBypass(endpoint: string): Promise<void> {
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    let bypassSuccessful = false;

    try {
      // First, trigger rate limit with GET
      for (let i = 0; i < 20; i++) {
        await this.makeTestRequest(endpoint, 'GET');
        await this.sleep(50);
      }

      // Try with different methods
      for (const method of methods) {
        try {
          const response = await this.apiClient.request({
            method: method.toLowerCase(),
            url: endpoint
          });

          if (response.status < 400) {
            bypassSuccessful = true;
            break;
          }
        } catch (error) {
          // Some methods may not be supported
        }
      }

      this.addResult({
        endpoint,
        method: 'VARIOUS',
        testType: 'METHOD_BYPASS',
        status: bypassSuccessful ? 'WARNING' : 'PASS',
        severity: bypassSuccessful ? 'MEDIUM' : 'INFO',
        description: bypassSuccessful
          ? 'Rate limit may be bypassed using different HTTP methods'
          : 'HTTP method bypass protection is working',
        evidence: { methodsTested: methods.length, bypassSuccessful },
        recommendation: bypassSuccessful
          ? 'Ensure rate limiting applies to all HTTP methods for an endpoint'
          : 'HTTP method bypass protection is effective'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'VARIOUS',
        testType: 'METHOD_BYPASS_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test method bypass: ${error.message}`,
        recommendation: 'Investigate HTTP method bypass protection'
      });
    }
  }

  /**
   * Test header bypass
   */
  private async testHeaderBypass(endpoint: string): Promise<void> {
    const bypassHeaders = [
      { 'X-Bypass-Rate-Limiting': 'true' },
      { 'X-Admin': 'true' },
      { 'X-Internal': '1' },
      { 'Authorization': 'Bearer admin-bypass-token' },
      { 'X-Rate-Limit-Bypass': 'please' },
      { 'Cache-Control': 'no-cache' }
    ];

    let bypassSuccessful = false;

    try {
      // First, trigger rate limit
      for (let i = 0; i < 20; i++) {
        await this.makeTestRequest(endpoint, 'GET');
        await this.sleep(50);
      }

      // Try with bypass headers
      for (const headers of bypassHeaders) {
        const response = await this.apiClient.get(endpoint, { headers });

        if (response.status < 400) {
          bypassSuccessful = true;
          break;
        }
      }

      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'HEADER_BYPASS',
        status: bypassSuccessful ? 'FAIL' : 'PASS',
        severity: bypassSuccessful ? 'HIGH' : 'INFO',
        description: bypassSuccessful
          ? 'Rate limit can be bypassed using special headers'
          : 'Header bypass protection is working',
        evidence: { headersTested: bypassHeaders.length, bypassSuccessful },
        recommendation: bypassSuccessful
          ? 'Remove or secure any header-based rate limit bypass mechanisms'
          : 'Header bypass protection is effective'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'HEADER_BYPASS_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test header bypass: ${error.message}`,
        recommendation: 'Investigate header bypass protection'
      });
    }
  }

  /**
   * Test case bypass
   */
  private async testCaseBypass(endpoint: string): Promise<void> {
    const caseVariations = [
      endpoint.toUpperCase(),
      endpoint.toLowerCase(),
      endpoint.replace(/\/api\//, '/API/'),
      endpoint.replace(/\/api\//, '/Api/'),
      endpoint + '/',
      endpoint.slice(0, -1)
    ];

    let bypassSuccessful = false;

    try {
      // First, trigger rate limit
      for (let i = 0; i < 20; i++) {
        await this.makeTestRequest(endpoint, 'GET');
        await this.sleep(50);
      }

      // Try with case variations
      for (const variation of caseVariations) {
        try {
          const response = await this.apiClient.get(variation);

          if (response.status < 400) {
            bypassSuccessful = true;
            break;
          }
        } catch (error) {
          // Some variations may not exist
        }
      }

      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'CASE_BYPASS',
        status: bypassSuccessful ? 'WARNING' : 'PASS',
        severity: bypassSuccessful ? 'LOW' : 'INFO',
        description: bypassSuccessful
          ? 'Rate limit may be bypassed using URL case variations'
          : 'URL case bypass protection is working',
        evidence: { variationsTested: caseVariations.length, bypassSuccessful },
        recommendation: bypassSuccessful
          ? 'Normalize URLs for rate limiting to prevent case-based bypasses'
          : 'URL case bypass protection is effective'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'CASE_BYPASS_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test case bypass: ${error.message}`,
        recommendation: 'Investigate URL case bypass protection'
      });
    }
  }

  /**
   * Test distributed rate limiting
   */
  private async testDistributedRateLimiting(): Promise<void> {
    console.log('🌐 Testing distributed rate limiting...');

    // This test simulates multiple clients/IPs
    const endpoint = '/api/families';

    // Simulate different client IPs using headers (if supported)
    const simulatedClients = [
      '192.168.1.100',
      '192.168.1.101',
      '192.168.1.102',
      '10.0.0.100',
      '10.0.0.101'
    ];

    let clientsBlocked = 0;
    const clientResults = [];

    try {
      for (const clientIP of simulatedClients) {
        let requestsSuccessful = 0;
        let requestsBlocked = 0;

        // Send requests for each simulated client
        for (let i = 0; i < 30; i++) {
          const response = await this.apiClient.get(endpoint, {
            headers: { 'X-Forwarded-For': clientIP }
          });

          if (response.status < 400) {
            requestsSuccessful++;
          } else if (response.status === 429) {
            requestsBlocked++;
          }

          await this.sleep(100);
        }

        clientResults.push({
          clientIP,
          requestsSuccessful,
          requestsBlocked
        });

        if (requestsBlocked > 0) {
          clientsBlocked++;
        }
      }

      // Check if rate limiting works per client
      const totalSuccessful = clientResults.reduce((sum, client) => sum + client.requestsSuccessful, 0);
      const totalBlocked = clientResults.reduce((sum, client) => sum + client.requestsBlocked, 0);

      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'DISTRIBUTED_RATE_LIMITING',
        status: clientsBlocked > simulatedClients.length * 0.5 ? 'PASS' : 'WARNING',
        severity: clientsBlocked > simulatedClients.length * 0.5 ? 'INFO' : 'MEDIUM',
        description: `Distributed rate limiting test: ${clientsBlocked}/${simulatedClients.length} clients blocked`,
        evidence: {
          simulatedClients: simulatedClients.length,
          clientsBlocked,
          totalSuccessful,
          totalBlocked,
          clientResults
        },
        recommendation: clientsBlocked > simulatedClients.length * 0.5
          ? 'Distributed rate limiting appears to be working'
          : 'Consider implementing per-client rate limiting'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'DISTRIBUTED_RATE_LIMITING_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test distributed rate limiting: ${error.message}`,
        recommendation: 'Investigate distributed rate limiting implementation'
      });
    }
  }

  /**
   * Test rate limit headers
   */
  private async testRateLimitHeaders(): Promise<void> {
    console.log('📋 Testing rate limit headers...');

    const endpoint = '/api/families';

    try {
      const response = await this.makeTestRequest(endpoint, 'GET');

      // Check for standard rate limit headers
      const standardHeaders = [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After'
      ];

      const rateLimitHeaders = {};
      let hasStandardHeaders = 0;

      for (const header of standardHeaders) {
        const headerValue = response.headers[header.toLowerCase()] || response.headers[header];
        if (headerValue) {
          rateLimitHeaders[header] = headerValue;
          hasStandardHeaders++;
        }
      }

      if (hasStandardHeaders === 0) {
        this.addResult({
          endpoint,
          method: 'GET',
          testType: 'RATE_LIMIT_HEADERS',
          status: 'FAIL',
          severity: 'MEDIUM',
          description: 'No rate limit headers found in response',
          evidence: { responseHeaders: Object.keys(response.headers) },
          recommendation: 'Include standard rate limit headers (X-RateLimit-*) to help clients understand limits'
        });
      } else if (hasStandardHeaders < 3) {
        this.addResult({
          endpoint,
          method: 'GET',
          testType: 'RATE_LIMIT_HEADERS',
          status: 'WARNING',
          severity: 'LOW',
          description: 'Partial rate limit headers present',
          evidence: { rateLimitHeaders, headersFound: hasStandardHeaders },
          recommendation: 'Include all standard rate limit headers for better client experience'
        });
      } else {
        this.addResult({
          endpoint,
          method: 'GET',
          testType: 'RATE_LIMIT_HEADERS',
          status: 'PASS',
          severity: 'INFO',
          description: 'Good rate limit headers present',
          evidence: { rateLimitHeaders },
          recommendation: 'Rate limit headers are properly configured'
        });
      }

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'RATE_LIMIT_HEADERS_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test rate limit headers: ${error.message}`,
        recommendation: 'Investigate rate limit header implementation'
      });
    }
  }

  /**
   * Test different client scenarios
   */
  private async testClientScenarios(): Promise<void> {
    console.log('👥 Testing different client scenarios...');

    // Test legitimate vs abusive clients
    await this.testLegitimateClientBehavior();
    await this.testAbusiveClientBehavior();
  }

  /**
   * Test legitimate client behavior
   */
  private async testLegitimateClientBehavior(): Promise<void> {
    const endpoint = '/api/families';
    const legitimatePattern = [
      { delay: 1000, requests: 1 },  // 1 request per second
      { delay: 2000, requests: 1 },  // Pause
      { delay: 1000, requests: 2 },  // Small burst
      { delay: 5000, requests: 1 },  // Long pause
      { delay: 1000, requests: 1 }   // Continue normal
    ];

    let requestsSuccessful = 0;
    let requestsBlocked = 0;

    try {
      for (const pattern of legitimatePattern) {
        for (let i = 0; i < pattern.requests; i++) {
          const response = await this.makeTestRequest(endpoint, 'GET');

          if (response.status < 400) {
            requestsSuccessful++;
          } else if (response.status === 429) {
            requestsBlocked++;
          }
        }

        await this.sleep(pattern.delay);
      }

      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'LEGITIMATE_CLIENT_BEHAVIOR',
        status: requestsBlocked === 0 ? 'PASS' : 'WARNING',
        severity: requestsBlocked === 0 ? 'INFO' : 'MEDIUM',
        description: `Legitimate client behavior test: ${requestsBlocked} requests blocked`,
        evidence: { requestsSuccessful, requestsBlocked },
        recommendation: requestsBlocked === 0
          ? 'Rate limiting allows legitimate client behavior'
          : 'Rate limiting may be too restrictive for legitimate clients'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'LEGITIMATE_CLIENT_TEST_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test legitimate client behavior: ${error.message}`,
        recommendation: 'Investigate legitimate client handling'
      });
    }
  }

  /**
   * Test abusive client behavior
   */
  private async testAbusiveClientBehavior(): Promise<void> {
    const endpoint = '/api/families';
    const abusiveRequestCount = 100;
    const abusiveDelay = 50; // Very fast requests

    let requestsSuccessful = 0;
    let requestsBlocked = 0;

    try {
      for (let i = 0; i < abusiveRequestCount; i++) {
        const response = await this.makeTestRequest(endpoint, 'GET');

        if (response.status < 400) {
          requestsSuccessful++;
        } else if (response.status === 429) {
          requestsBlocked++;
        }

        await this.sleep(abusiveDelay);
      }

      const blockingRatio = requestsBlocked / abusiveRequestCount;

      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'ABUSIVE_CLIENT_BEHAVIOR',
        status: blockingRatio > 0.7 ? 'PASS' : 'FAIL',
        severity: blockingRatio > 0.7 ? 'INFO' : 'HIGH',
        description: `Abusive client behavior test: ${(blockingRatio * 100).toFixed(1)}% requests blocked`,
        evidence: {
          requestsSuccessful,
          requestsBlocked,
          blockingRatio: blockingRatio.toFixed(2)
        },
        recommendation: blockingRatio > 0.7
          ? 'Rate limiting effectively blocks abusive behavior'
          : 'Rate limiting needs to be more aggressive against abusive clients'
      });

    } catch (error) {
      this.addResult({
        endpoint,
        method: 'GET',
        testType: 'ABUSIVE_CLIENT_TEST_ERROR',
        status: 'ERROR',
        severity: 'LOW',
        description: `Failed to test abusive client behavior: ${error.message}`,
        recommendation: 'Investigate abusive client handling'
      });
    }
  }

  /**
   * Validate rate limit headers in response
   */
  private validateRateLimitHeaders(response: any, config: RateLimitConfig): void {
    const headers = response.headers;

    // Check for Retry-After header on 429 responses
    if (!headers['retry-after']) {
      this.addResult({
        endpoint: config.endpoint,
        method: config.method,
        testType: 'MISSING_RETRY_AFTER_HEADER',
        status: 'WARNING',
        severity: 'LOW',
        description: '429 response missing Retry-After header',
        evidence: { responseHeaders: Object.keys(headers) },
        recommendation: 'Include Retry-After header in 429 responses'
      });
    }
  }

  /**
   * Analyze rate limiting test results
   */
  private analyzeRateLimitResults(metrics: any): void {
    const { config, requestsSent, requestsSuccessful, requestsBlocked, averageResponseTime, testDurationMs } = metrics;

    const blockingRatio = requestsBlocked / requestsSent;
    const successRatio = requestsSuccessful / requestsSent;

    // Determine test result
    let status: 'PASS' | 'FAIL' | 'WARNING';
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    let description: string;
    let recommendation: string;

    if (requestsBlocked === 0) {
      status = 'FAIL';
      severity = 'HIGH';
      description = 'No rate limiting detected - all requests succeeded';
      recommendation = 'Implement rate limiting on this endpoint';
    } else if (blockingRatio < 0.3) {
      status = 'WARNING';
      severity = 'MEDIUM';
      description = `Weak rate limiting - only ${(blockingRatio * 100).toFixed(1)}% of requests blocked`;
      recommendation = 'Consider stricter rate limiting thresholds';
    } else if (blockingRatio > 0.9) {
      status = 'WARNING';
      severity = 'LOW';
      description = `Very strict rate limiting - ${(blockingRatio * 100).toFixed(1)}% of requests blocked`;
      recommendation = 'Verify rate limiting is not too restrictive for legitimate users';
    } else {
      status = 'PASS';
      severity = 'INFO';
      description = `Appropriate rate limiting - ${(blockingRatio * 100).toFixed(1)}% of requests blocked`;
      recommendation = 'Rate limiting configuration appears appropriate';
    }

    this.addResult({
      endpoint: config.endpoint,
      method: config.method,
      testType: 'RATE_LIMIT_EFFECTIVENESS',
      status,
      severity,
      description,
      evidence: {
        expectedLimit: config.maxRequests,
        actualBlocked: requestsBlocked,
        blockingRatio: blockingRatio.toFixed(2),
        averageResponseTime: averageResponseTime.toFixed(2)
      },
      recommendation,
      metrics: {
        requestsSent,
        requestsSuccessful,
        requestsBlocked,
        averageResponseTime,
        testDurationMs
      }
    });
  }

  /**
   * Make a test request
   */
  private async makeTestRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const config = {
      method: method.toLowerCase(),
      url: endpoint,
      ...(data && ['post', 'put', 'patch'].includes(method.toLowerCase()) && { data })
    };

    return await this.apiClient.request(config);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add test result
   */
  private addResult(result: RateLimitTestResult): void {
    this.testResults.push(result);
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(): RateLimitTestSummary {
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    let overallStatus: 'SECURE' | 'VULNERABLE' | 'MISCONFIGURED';

    const criticalIssues = this.testResults.filter(r => r.severity === 'CRITICAL').length;
    const highIssues = this.testResults.filter(r => r.severity === 'HIGH').length;

    if (criticalIssues > 0 || highIssues > 3) {
      overallStatus = 'VULNERABLE';
    } else if (failed > warnings || highIssues > 0) {
      overallStatus = 'MISCONFIGURED';
    } else {
      overallStatus = 'SECURE';
    }

    return {
      totalTests: this.testResults.length,
      passed,
      failed,
      warnings,
      errors,
      overallStatus,
      results: this.testResults
    };
  }
}

/**
 * Run rate limiting tests
 */
export async function runRateLimitTests(baseUrl?: string): Promise<RateLimitTestSummary> {
  const tester = new RateLimitTester(baseUrl);
  return await tester.runRateLimitTests();
}

/**
 * Generate rate limiting test report
 */
export async function generateRateLimitReport(baseUrl?: string): Promise<void> {
  try {
    console.log('🚦 Starting rate limiting configuration and testing...');
    const results = await runRateLimitTests(baseUrl);

    console.log('\n' + '='.repeat(80));
    console.log('🚦 RATE LIMITING CONFIGURATION AND TESTING REPORT');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${results.totalTests}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`🔧 Errors: ${results.errors}`);
    console.log(`🛡️  Overall Status: ${results.overallStatus}`);

    if (results.failed > 0 || results.warnings > 0) {
      console.log('\n🚨 Issues Found:');
      console.log('-'.repeat(80));

      const groupedResults = {
        CRITICAL: results.results.filter(r => r.severity === 'CRITICAL'),
        HIGH: results.results.filter(r => r.severity === 'HIGH'),
        MEDIUM: results.results.filter(r => r.severity === 'MEDIUM'),
        LOW: results.results.filter(r => r.severity === 'LOW')
      };

      for (const [severity, issues] of Object.entries(groupedResults)) {
        if (issues.length > 0) {
          console.log(`\n🔴 ${severity} SEVERITY (${issues.length} issues):`);
          issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue.testType}: ${issue.description}`);
            console.log(`      Endpoint: ${issue.method} ${issue.endpoint}`);
            console.log(`      Status: ${issue.status}`);
            console.log(`      Recommendation: ${issue.recommendation}`);
            if (issue.evidence) {
              console.log(`      Evidence: ${JSON.stringify(issue.evidence).substring(0, 150)}...`);
            }
            console.log('');
          });
        }
      }
    }

    console.log('\n💡 Key Rate Limiting Recommendations:');
    console.log('   1. Implement rate limiting on all public endpoints');
    console.log('   2. Use stricter limits for authentication endpoints');
    console.log('   3. Include standard rate limit headers in responses');
    console.log('   4. Implement progressive delays for brute force protection');
    console.log('   5. Monitor and adjust limits based on legitimate usage patterns');
    console.log('   6. Implement per-client rate limiting to prevent abuse');
    console.log('   7. Use different limits for expensive vs lightweight operations');
    console.log('   8. Implement rate limit bypass protection');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Rate limiting testing completed');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Rate limiting testing failed:', error);
    throw error;
  }
}

// Execute tests if run directly
if (require.main === module) {
  generateRateLimitReport()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Rate limiting testing failed:', error);
      process.exit(1);
    });
}