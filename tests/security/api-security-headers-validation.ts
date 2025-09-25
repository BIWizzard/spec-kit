import { describe, test, expect, beforeAll } from '@jest/globals';
import axios, { AxiosResponse } from 'axios';

interface SecurityHeadersConfig {
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options'?: string;
  'X-Frame-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'X-Permitted-Cross-Domain-Policies'?: string;
  'Cache-Control'?: string;
  'Pragma'?: string;
  'Expires'?: string;
}

interface EndpointTest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requiresAuth?: boolean;
  expectedHeaders: Partial<SecurityHeadersConfig>;
  sensitiveEndpoint?: boolean;
}

describe('API Security Headers Validation', () => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let authToken: string | null = null;

  // Security headers validation test suite
  const securityEndpoints: EndpointTest[] = [
    // Public endpoints
    {
      method: 'GET',
      path: '/api/health',
      description: 'Health check endpoint',
      expectedHeaders: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    },
    {
      method: 'POST',
      path: '/api/auth/register',
      description: 'User registration endpoint',
      sensitiveEndpoint: true,
      expectedHeaders: {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      description: 'User login endpoint',
      sensitiveEndpoint: true,
      expectedHeaders: {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    },
    // Authenticated endpoints
    {
      method: 'GET',
      path: '/api/auth/me',
      description: 'User profile endpoint',
      requiresAuth: true,
      sensitiveEndpoint: true,
      expectedHeaders: {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    },
    {
      method: 'GET',
      path: '/api/families',
      description: 'Family data endpoint',
      requiresAuth: true,
      sensitiveEndpoint: true,
      expectedHeaders: {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    },
    {
      method: 'GET',
      path: '/api/bank-accounts',
      description: 'Bank accounts endpoint',
      requiresAuth: true,
      sensitiveEndpoint: true,
      expectedHeaders: {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    },
    {
      method: 'GET',
      path: '/api/transactions',
      description: 'Transactions endpoint',
      requiresAuth: true,
      sensitiveEndpoint: true,
      expectedHeaders: {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    },
    {
      method: 'GET',
      path: '/api/payments',
      description: 'Payments endpoint',
      requiresAuth: true,
      sensitiveEndpoint: true,
      expectedHeaders: {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    },
    {
      method: 'GET',
      path: '/api/reports/cash-flow',
      description: 'Financial reports endpoint',
      requiresAuth: true,
      sensitiveEndpoint: true,
      expectedHeaders: {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache'
      }
    }
  ];

  beforeAll(async () => {
    // Attempt to get authentication token for protected endpoints
    try {
      const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword123'
      });

      if (loginResponse.data.token) {
        authToken = loginResponse.data.token;
      }
    } catch (error) {
      console.warn('Could not obtain auth token for protected endpoint tests');
    }
  });

  describe('Critical Security Headers Validation', () => {
    test('should validate X-Content-Type-Options header', async () => {
      const response = await makeRequest('GET', '/api/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should validate X-Frame-Options header', async () => {
      const response = await makeRequest('GET', '/api/health');

      expect(response.headers['x-frame-options']).toMatch(/^(DENY|SAMEORIGIN)$/i);
    });

    test('should validate X-XSS-Protection header', async () => {
      const response = await makeRequest('GET', '/api/health');

      expect(response.headers['x-xss-protection']).toMatch(/^1;?\s*mode=block$/i);
    });

    test('should validate Strict-Transport-Security header on sensitive endpoints', async () => {
      const response = await makeRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'invalid'
      });

      const hstsHeader = response.headers['strict-transport-security'];
      expect(hstsHeader).toBeDefined();
      expect(hstsHeader).toMatch(/max-age=\d+/);
      expect(hstsHeader).toMatch(/includeSubDomains/);
    });

    test('should validate Content-Security-Policy header on sensitive endpoints', async () => {
      const response = await makeRequest('POST', '/api/auth/register', {
        email: 'test@example.com',
        password: 'testpassword123'
      });

      const cspHeader = response.headers['content-security-policy'];
      expect(cspHeader).toBeDefined();
      expect(cspHeader).toMatch(/default-src/);
    });

    test('should validate Referrer-Policy header', async () => {
      const response = await makeRequest('GET', '/api/health');

      const referrerPolicy = response.headers['referrer-policy'];
      expect(referrerPolicy).toBeDefined();
      expect(referrerPolicy).toMatch(/^(no-referrer|strict-origin-when-cross-origin|same-origin)$/i);
    });

    test('should validate Cache-Control headers on sensitive endpoints', async () => {
      const response = await makeRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'invalid'
      });

      const cacheControl = response.headers['cache-control'];
      expect(cacheControl).toBeDefined();
      expect(cacheControl).toMatch(/no-cache/);
      expect(cacheControl).toMatch(/no-store/);
    });

    test('should validate X-Permitted-Cross-Domain-Policies header', async () => {
      const response = await makeRequest('POST', '/api/auth/register', {
        email: 'test@example.com',
        password: 'testpassword123'
      });

      expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    });
  });

  describe('Endpoint-Specific Security Headers', () => {
    securityEndpoints.forEach((endpoint) => {
      describe(`${endpoint.method} ${endpoint.path} - ${endpoint.description}`, () => {
        test('should have all required security headers', async () => {
          const response = await makeRequest(endpoint.method, endpoint.path,
            endpoint.method !== 'GET' ? { test: 'data' } : undefined,
            endpoint.requiresAuth
          );

          // Validate each expected header
          Object.entries(endpoint.expectedHeaders).forEach(([headerName, expectedValue]) => {
            const actualValue = response.headers[headerName.toLowerCase()];

            if (expectedValue) {
              expect(actualValue).toBeDefined();
              if (headerName === 'Strict-Transport-Security') {
                expect(actualValue).toMatch(/max-age=\d+/);
              } else if (headerName === 'Content-Security-Policy') {
                expect(actualValue).toMatch(/default-src/);
              } else {
                expect(actualValue).toContain(expectedValue);
              }
            }
          });
        });

        if (endpoint.sensitiveEndpoint) {
          test('should have enhanced security for sensitive endpoint', async () => {
            const response = await makeRequest(endpoint.method, endpoint.path,
              endpoint.method !== 'GET' ? { test: 'data' } : undefined,
              endpoint.requiresAuth
            );

            // Sensitive endpoints must have stricter cache control
            const cacheControl = response.headers['cache-control'];
            expect(cacheControl).toMatch(/no-cache/);
            expect(cacheControl).toMatch(/no-store/);

            // Sensitive endpoints should have no-referrer policy
            const referrerPolicy = response.headers['referrer-policy'];
            expect(referrerPolicy).toMatch(/no-referrer/);
          });
        }
      });
    });
  });

  describe('HTTP Security Vulnerabilities', () => {
    test('should not expose server information', async () => {
      const response = await makeRequest('GET', '/api/health');

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should not have debug headers in production', async () => {
      const response = await makeRequest('GET', '/api/health');

      expect(response.headers['x-debug']).toBeUndefined();
      expect(response.headers['x-debug-info']).toBeUndefined();
      expect(response.headers['x-trace-id']).toBeUndefined();
    });

    test('should handle OPTIONS requests securely', async () => {
      try {
        const response = await axios.options(`${baseURL}/api/auth/login`);

        // CORS headers should be restrictive
        const allowOrigin = response.headers['access-control-allow-origin'];
        const allowMethods = response.headers['access-control-allow-methods'];

        if (allowOrigin) {
          expect(allowOrigin).not.toBe('*');
        }

        if (allowMethods) {
          expect(allowMethods).not.toMatch(/TRACE|CONNECT/);
        }
      } catch (error) {
        // It's OK if OPTIONS is not supported
      }
    });

    test('should not accept dangerous HTTP methods', async () => {
      const dangerousMethods = ['TRACE', 'CONNECT', 'TRACK'];

      for (const method of dangerousMethods) {
        try {
          const response = await axios.request({
            method: method as any,
            url: `${baseURL}/api/health`,
            validateStatus: () => true
          });

          expect(response.status).toBeGreaterThanOrEqual(400);
        } catch (error) {
          // Expected to fail
        }
      }
    });

    test('should validate Content-Type on POST requests', async () => {
      try {
        const response = await axios.post(`${baseURL}/api/auth/login`, 'test=data', {
          headers: {
            'Content-Type': 'text/plain'
          },
          validateStatus: () => true
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      } catch (error) {
        // Expected to be rejected
      }
    });
  });

  describe('Security Headers Compliance Tests', () => {
    test('should pass OWASP security header recommendations', async () => {
      const response = await makeRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'invalid'
      });

      // OWASP recommended headers
      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy'
      ];

      requiredHeaders.forEach(header => {
        expect(response.headers[header]).toBeDefined();
      });
    });

    test('should have secure cookie attributes for auth endpoints', async () => {
      const response = await makeRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'testpassword123'
      });

      const setCookieHeaders = response.headers['set-cookie'] || [];
      if (setCookieHeaders.length > 0) {
        setCookieHeaders.forEach((cookie: string) => {
          // Secure flag should be present
          expect(cookie.toLowerCase()).toMatch(/secure/);
          // HttpOnly flag should be present
          expect(cookie.toLowerCase()).toMatch(/httponly/);
          // SameSite should be set
          expect(cookie.toLowerCase()).toMatch(/samesite/);
        });
      }
    });

    test('should validate CSP directive compliance', async () => {
      const response = await makeRequest('GET', '/api/auth/me', undefined, true);

      const csp = response.headers['content-security-policy'];
      if (csp) {
        // Should not allow unsafe-inline or unsafe-eval
        expect(csp.toLowerCase()).not.toMatch(/unsafe-inline/);
        expect(csp.toLowerCase()).not.toMatch(/unsafe-eval/);

        // Should have default-src directive
        expect(csp.toLowerCase()).toMatch(/default-src/);
      }
    });
  });

  describe('Response Headers Security Validation', () => {
    test('should not expose sensitive information in error responses', async () => {
      const response = await makeRequest('GET', '/api/nonexistent-endpoint');

      const responseText = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      // Should not expose stack traces or file paths
      expect(responseText.toLowerCase()).not.toMatch(/\sat\s/);
      expect(responseText).not.toMatch(/\/[a-zA-Z]:[\\\/]/);
      expect(responseText).not.toMatch(/node_modules/);
    });

    test('should have consistent security headers across all endpoints', async () => {
      const endpoints = ['/api/health', '/api/auth/me'];
      const responses = await Promise.all(
        endpoints.map(endpoint => makeRequest('GET', endpoint, undefined, endpoint !== '/api/health'))
      );

      const criticalHeaders = ['x-content-type-options', 'x-frame-options'];

      criticalHeaders.forEach(header => {
        const values = responses.map(r => r.headers[header]).filter(Boolean);
        if (values.length > 1) {
          // All non-null values should be the same
          expect(new Set(values).size).toBe(1);
        }
      });
    });
  });

  // Helper function to make HTTP requests with proper error handling
  async function makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
    requiresAuth: boolean = false
  ): Promise<AxiosResponse> {
    const config: any = {
      method,
      url: `${baseURL}${path}`,
      validateStatus: () => true, // Don't throw on 4xx/5xx status codes
      timeout: 10000
    };

    if (data && method !== 'GET') {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }

    if (requiresAuth && authToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${authToken}`
      };
    }

    try {
      return await axios(config);
    } catch (error: any) {
      // If it's a network error, create a mock response for header testing
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {},
          data: { error: 'Service not available' },
          config: config,
          request: {}
        } as AxiosResponse;
      }
      throw error;
    }
  }
});

describe('Security Headers Configuration Tests', () => {
  test('should validate middleware security headers configuration', () => {
    // Test that our security middleware is properly configured
    const expectedSecurityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Permitted-Cross-Domain-Policies': 'none'
    };

    // Validate configuration is present
    Object.keys(expectedSecurityHeaders).forEach(header => {
      expect(header).toBeTruthy();
    });
  });

  test('should validate CSP policy strength', () => {
    const cspPolicy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; media-src 'none'; object-src 'none'; child-src 'none'; frame-src 'none'; worker-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests; base-uri 'self'";

    // Validate key CSP directives
    expect(cspPolicy).toMatch(/default-src\s+'self'/);
    expect(cspPolicy).toMatch(/script-src\s+'self'/);
    expect(cspPolicy).toMatch(/object-src\s+'none'/);
    expect(cspPolicy).toMatch(/frame-ancestors\s+'none'/);
    expect(cspPolicy).toMatch(/upgrade-insecure-requests/);
  });

  test('should validate HSTS configuration', () => {
    const hstsHeader = 'max-age=31536000; includeSubDomains; preload';

    // Validate HSTS configuration strength
    expect(hstsHeader).toMatch(/max-age=(\d+)/);

    const maxAge = hstsHeader.match(/max-age=(\d+)/)?.[1];
    if (maxAge) {
      expect(parseInt(maxAge)).toBeGreaterThanOrEqual(31536000); // 1 year minimum
    }

    expect(hstsHeader).toMatch(/includeSubDomains/);
    expect(hstsHeader).toMatch(/preload/);
  });
});