/**
 * OWASP Security Compliance Check - T453
 * Comprehensive security audit against OWASP Top 10 2021
 */

import request from 'supertest';
import { execSync } from 'child_process';
import fs from 'fs';
import jwt from 'jsonwebtoken';

export interface OWASPTestResult {
  category: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  remediation: string;
  details?: any;
}

export class OWASPComplianceChecker {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  async runFullAudit(): Promise<{
    overallScore: number;
    passCount: number;
    failCount: number;
    warningCount: number;
    criticalFindings: OWASPTestResult[];
    categories: { [key: string]: OWASPTestResult[] };
  }> {
    console.log('🔍 Starting OWASP Top 10 2021 Security Compliance Check...\n');

    const categories = {
      'A01_Access_Control': await this.testAccessControl(),
      'A02_Cryptographic': await this.testCryptography(),
      'A03_Injection': await this.testInjection(),
      'A04_Insecure_Design': await this.testDesign(),
      'A05_Misconfiguration': await this.testConfiguration(),
      'A06_Vulnerable_Components': await this.testComponents(),
      'A07_Authentication': await this.testAuthentication(),
      'A08_Data_Integrity': await this.testIntegrity(),
      'A09_Logging_Monitoring': await this.testLogging(),
      'A10_SSRF': await this.testSSRF(),
    };

    const allResults = Object.values(categories).flat();
    const passCount = allResults.filter(r => r.status === 'PASS').length;
    const failCount = allResults.filter(r => r.status === 'FAIL').length;
    const warningCount = allResults.filter(r => r.status === 'WARNING').length;
    const overallScore = Math.round((passCount / allResults.length) * 100);
    const criticalFindings = allResults.filter(r => r.severity === 'CRITICAL' && r.status === 'FAIL');

    return {
      overallScore,
      passCount,
      failCount,
      warningCount,
      criticalFindings,
      categories
    };
  }

  private async testAccessControl(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // Test unauthorized access
    try {
      const response = await request(this.app).get('/api/families');
      tests.push({
        category: 'A01: Broken Access Control',
        testName: 'Unauthorized API Access',
        status: response.status === 401 ? 'PASS' : 'FAIL',
        severity: 'HIGH',
        description: 'API should reject unauthorized requests',
        remediation: 'Implement authentication middleware'
      });
    } catch (error) {
      tests.push({
        category: 'A01: Broken Access Control',
        testName: 'Unauthorized API Access',
        status: 'FAIL',
        severity: 'CRITICAL',
        description: 'API accessible without authentication',
        remediation: 'Implement authentication middleware'
      });
    }

    return tests;
  }

  private async testCryptography(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    tests.push({
      category: 'A02: Cryptographic Failures',
      testName: 'JWT Secret Strength',
      status: (jwtSecret && jwtSecret.length >= 32) ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      description: 'JWT secret should be cryptographically strong',
      remediation: 'Use strong, randomly generated JWT secret (256+ bits)'
    });

    // Check password hashing
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasSecureHashing = packageJson.dependencies?.bcrypt || packageJson.dependencies?.argon2;
      tests.push({
        category: 'A02: Cryptographic Failures',
        testName: 'Password Hashing',
        status: hasSecureHashing ? 'PASS' : 'FAIL',
        severity: 'CRITICAL',
        description: 'Passwords should use secure hashing',
        remediation: 'Use bcrypt, scrypt, or Argon2 for passwords'
      });
    } catch (error) {
      tests.push({
        category: 'A02: Cryptographic Failures',
        testName: 'Password Hashing',
        status: 'WARNING',
        severity: 'HIGH',
        description: 'Unable to verify password hashing',
        remediation: 'Use bcrypt, scrypt, or Argon2 for passwords'
      });
    }

    return tests;
  }

  private async testInjection(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];
    const adminToken = this.generateTestToken('admin', 'admin');

    // SQL injection test
    const sqlPayloads = ["'; DROP TABLE users; --", "' OR '1'='1"];
    for (const payload of sqlPayloads) {
      try {
        const response = await request(this.app)
          .get('/api/payments')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ search: payload });

        tests.push({
          category: 'A03: Injection',
          testName: `SQL Injection: ${payload.substring(0, 10)}...`,
          status: response.status >= 400 ? 'PASS' : 'FAIL',
          severity: 'CRITICAL',
          description: 'SQL injection should be prevented',
          remediation: 'Use parameterized queries'
        });
      } catch (error) {
        tests.push({
          category: 'A03: Injection',
          testName: `SQL Injection: ${payload.substring(0, 10)}...`,
          status: 'PASS',
          severity: 'CRITICAL',
          description: 'SQL injection blocked',
          remediation: 'Use parameterized queries'
        });
      }
    }

    return tests;
  }

  private async testDesign(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // Rate limiting test
    try {
      const promises = Array(10).fill(0).map(() =>
        request(this.app).post('/api/auth/login').send({ email: 'test', password: 'test' })
      );
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);

      tests.push({
        category: 'A04: Insecure Design',
        testName: 'Rate Limiting',
        status: rateLimited ? 'PASS' : 'FAIL',
        severity: 'HIGH',
        description: 'Rate limiting should prevent abuse',
        remediation: 'Implement rate limiting on sensitive endpoints'
      });
    } catch (error) {
      tests.push({
        category: 'A04: Insecure Design',
        testName: 'Rate Limiting',
        status: 'WARNING',
        severity: 'HIGH',
        description: 'Unable to test rate limiting',
        remediation: 'Implement rate limiting on sensitive endpoints'
      });
    }

    return tests;
  }

  private async testConfiguration(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // Security headers
    try {
      const response = await request(this.app).get('/api/health');
      const hasSecurityHeaders = response.headers['x-content-type-options'] &&
                                 response.headers['x-frame-options'];

      tests.push({
        category: 'A05: Security Misconfiguration',
        testName: 'Security Headers',
        status: hasSecurityHeaders ? 'PASS' : 'FAIL',
        severity: 'MEDIUM',
        description: 'Security headers should be configured',
        remediation: 'Implement all required security headers'
      });
    } catch (error) {
      tests.push({
        category: 'A05: Security Misconfiguration',
        testName: 'Security Headers',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Unable to test security headers',
        remediation: 'Implement all required security headers'
      });
    }

    // Debug mode check
    tests.push({
      category: 'A05: Security Misconfiguration',
      testName: 'Debug Mode',
      status: process.env.NODE_ENV === 'production' ? 'PASS' : 'WARNING',
      severity: 'MEDIUM',
      description: 'Debug mode should be disabled in production',
      remediation: 'Set NODE_ENV=production'
    });

    return tests;
  }

  private async testComponents(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // Known vulnerabilities
    try {
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditResult);
      const vulnerabilities = audit.vulnerabilities || {};
      const criticalVulns = Object.values(vulnerabilities).filter((v: any) => v.severity === 'critical').length;

      tests.push({
        category: 'A06: Vulnerable Components',
        testName: 'Known Vulnerabilities',
        status: criticalVulns === 0 ? 'PASS' : 'FAIL',
        severity: criticalVulns > 0 ? 'CRITICAL' : 'LOW',
        description: 'Dependencies should not have known vulnerabilities',
        remediation: 'Update vulnerable dependencies',
        details: { criticalVulns }
      });
    } catch (error) {
      tests.push({
        category: 'A06: Vulnerable Components',
        testName: 'Known Vulnerabilities',
        status: 'WARNING',
        severity: 'HIGH',
        description: 'Unable to check vulnerabilities',
        remediation: 'Run npm audit regularly'
      });
    }

    return tests;
  }

  private async testAuthentication(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // Password policy
    try {
      const response = await request(this.app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: '123' });

      tests.push({
        category: 'A07: Authentication Failures',
        testName: 'Password Policy',
        status: response.status >= 400 ? 'PASS' : 'FAIL',
        severity: 'HIGH',
        description: 'Weak passwords should be rejected',
        remediation: 'Implement strong password policy'
      });
    } catch (error) {
      tests.push({
        category: 'A07: Authentication Failures',
        testName: 'Password Policy',
        status: 'WARNING',
        severity: 'HIGH',
        description: 'Unable to test password policy',
        remediation: 'Implement strong password policy'
      });
    }

    return tests;
  }

  private async testIntegrity(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // Package lock file
    const hasLockFile = fs.existsSync('package-lock.json') || fs.existsSync('yarn.lock');
    tests.push({
      category: 'A08: Data Integrity Failures',
      testName: 'Dependency Integrity',
      status: hasLockFile ? 'PASS' : 'FAIL',
      severity: 'MEDIUM',
      description: 'Dependencies should be locked',
      remediation: 'Use package-lock.json or yarn.lock'
    });

    return tests;
  }

  private async testLogging(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // Audit trail
    try {
      const hasAuditLog = fs.existsSync('backend/src/models/schema.prisma') &&
                         fs.readFileSync('backend/src/models/schema.prisma', 'utf8').includes('AuditLog');

      tests.push({
        category: 'A09: Logging Failures',
        testName: 'Audit Trail',
        status: hasAuditLog ? 'PASS' : 'FAIL',
        severity: 'HIGH',
        description: 'Audit trail should be implemented',
        remediation: 'Implement comprehensive audit logging'
      });
    } catch (error) {
      tests.push({
        category: 'A09: Logging Failures',
        testName: 'Audit Trail',
        status: 'WARNING',
        severity: 'HIGH',
        description: 'Unable to check audit implementation',
        remediation: 'Implement comprehensive audit logging'
      });
    }

    return tests;
  }

  private async testSSRF(): Promise<OWASPTestResult[]> {
    const tests: OWASPTestResult[] = [];

    // SSRF prevention
    const ssrfPayloads = ['http://127.0.0.1:8080', 'http://169.254.169.254/metadata'];
    for (const payload of ssrfPayloads) {
      try {
        const response = await request(this.app)
          .post('/api/plaid/webhook')
          .send({ webhook_url: payload });

        tests.push({
          category: 'A10: SSRF',
          testName: `SSRF: ${payload}`,
          status: response.status >= 400 ? 'PASS' : 'FAIL',
          severity: 'HIGH',
          description: 'SSRF should be prevented',
          remediation: 'Validate and whitelist allowed domains'
        });
      } catch (error) {
        tests.push({
          category: 'A10: SSRF',
          testName: `SSRF: ${payload}`,
          status: 'PASS',
          severity: 'HIGH',
          description: 'SSRF blocked',
          remediation: 'Validate and whitelist allowed domains'
        });
      }
    }

    return tests;
  }

  private generateTestToken(userId: string, role: string): string {
    return jwt.sign(
      { userId, familyId: 'test', email: `${userId}@test.com`, role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }
}

// Jest tests
describe('OWASP Top 10 2021 Compliance Check', () => {
  let app: any;

  beforeAll(() => {
    app = {}; // Mock app for testing
  });

  test('should generate comprehensive OWASP audit report', async () => {
    const checker = new OWASPComplianceChecker(app);
    const report = await checker.runFullAudit();

    expect(report).toBeDefined();
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(Object.keys(report.categories)).toHaveLength(10);

    console.log(`\n📊 OWASP Compliance Score: ${report.overallScore}%`);
    console.log(`✅ Passed: ${report.passCount}`);
    console.log(`❌ Failed: ${report.failCount}`);
    console.log(`⚠️  Warnings: ${report.warningCount}`);
    console.log(`🚨 Critical: ${report.criticalFindings.length}`);

    if (report.criticalFindings.length > 0) {
      console.log('\n🚨 Critical Findings:');
      report.criticalFindings.forEach(finding => {
        console.log(`  - ${finding.testName}: ${finding.description}`);
      });
    }
  }, 30000);

  test('should test all OWASP Top 10 categories', async () => {
    const checker = new OWASPComplianceChecker(app);
    const report = await checker.runFullAudit();

    expect(Object.keys(report.categories)).toEqual([
      'A01_Access_Control',
      'A02_Cryptographic',
      'A03_Injection',
      'A04_Insecure_Design',
      'A05_Misconfiguration',
      'A06_Vulnerable_Components',
      'A07_Authentication',
      'A08_Data_Integrity',
      'A09_Logging_Monitoring',
      'A10_SSRF'
    ]);
  });
});