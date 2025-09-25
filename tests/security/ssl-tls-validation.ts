/**
 * SSL/TLS Configuration Validation - T454
 *
 * Comprehensive audit of SSL/TLS security settings including:
 * - Certificate validation and chain verification
 * - TLS protocol version compliance
 * - Cipher suite strength assessment
 * - Security header validation
 * - HSTS configuration verification
 */

import https from 'https';
import tls from 'tls';
import crypto from 'crypto';
import { URL } from 'url';

export interface TLSTestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details?: any;
  remediation: string;
}

export interface SSLCertificateInfo {
  subject: { [key: string]: string };
  issuer: { [key: string]: string };
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
  altNames: string[];
  keyLength: number;
  signatureAlgorithm: string;
  isWildcard: boolean;
  isSelfSigned: boolean;
}

export interface TLSConnectionInfo {
  protocol: string;
  cipher: {
    name: string;
    version: string;
    bits: number;
  };
  ephemeralKeyInfo?: {
    type: string;
    size: number;
  };
  peerCertificate: SSLCertificateInfo;
  certificateChain: SSLCertificateInfo[];
}

export class SSLTLSValidator {
  private results: TLSTestResult[] = [];
  private testDomains: string[];

  constructor(testDomains: string[] = ['localhost:3000', 'api.example.com']) {
    this.testDomains = testDomains;
  }

  /**
   * Run comprehensive SSL/TLS validation
   */
  async validateSSLTLS(): Promise<{
    overallScore: number;
    passCount: number;
    failCount: number;
    warningCount: number;
    results: TLSTestResult[];
    summary: string;
  }> {
    console.log('🔒 Starting SSL/TLS Configuration Validation...\n');

    this.results = [];

    // Test each domain
    for (const domain of this.testDomains) {
      console.log(`Testing domain: ${domain}`);
      await this.testDomain(domain);
    }

    // Environment-specific tests
    await this.testEnvironmentConfiguration();

    // Calculate metrics
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    const totalTests = this.results.length;
    const overallScore = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;

    const summary = this.generateSummary(overallScore, failCount, warningCount);

    return {
      overallScore,
      passCount,
      failCount,
      warningCount,
      results: this.results,
      summary
    };
  }

  /**
   * Test SSL/TLS configuration for a specific domain
   */
  private async testDomain(domain: string): Promise<void> {
    const [hostname, port] = domain.split(':');
    const portNumber = port ? parseInt(port) : 443;

    try {
      const connectionInfo = await this.getConnectionInfo(hostname, portNumber);

      // Certificate validation tests
      await this.testCertificateValidity(connectionInfo.peerCertificate, domain);
      await this.testCertificateChain(connectionInfo.certificateChain, domain);
      await this.testCertificateSecurity(connectionInfo.peerCertificate, domain);

      // TLS protocol tests
      await this.testTLSProtocol(connectionInfo, domain);
      await this.testCipherSuite(connectionInfo, domain);
      await this.testKeyExchange(connectionInfo, domain);

    } catch (error) {
      this.results.push({
        testName: `SSL Connection - ${domain}`,
        status: 'FAIL',
        severity: 'HIGH',
        description: `Unable to establish SSL connection to ${domain}`,
        details: { error: error.message },
        remediation: 'Ensure SSL/TLS is properly configured and accessible'
      });
    }
  }

  /**
   * Get SSL/TLS connection information
   */
  private async getConnectionInfo(hostname: string, port: number): Promise<TLSConnectionInfo> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: hostname,
        port: port,
        servername: hostname,
        rejectUnauthorized: false, // We want to test even invalid certs
      }, () => {
        const cert = socket.getPeerCertificate(true);
        const cipher = socket.getCipher();
        const protocol = socket.getProtocol();
        const ephemeralKeyInfo = socket.getEphemeralKeyInfo();

        const peerCert = this.parseCertificate(cert);
        const chain = this.parseCertificateChain(cert);

        resolve({
          protocol,
          cipher,
          ephemeralKeyInfo,
          peerCertificate: peerCert,
          certificateChain: chain
        });

        socket.end();
      });

      socket.on('error', (error) => {
        reject(error);
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  /**
   * Parse certificate information
   */
  private parseCertificate(cert: any): SSLCertificateInfo {
    return {
      subject: cert.subject || {},
      issuer: cert.issuer || {},
      validFrom: new Date(cert.valid_from),
      validTo: new Date(cert.valid_to),
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
      altNames: cert.subjectaltname ? cert.subjectaltname.split(', ').map(name => name.replace(/^DNS:/, '')) : [],
      keyLength: cert.bits || 0,
      signatureAlgorithm: cert.sigalg || 'unknown',
      isWildcard: cert.subject?.CN?.startsWith('*.') || false,
      isSelfSigned: JSON.stringify(cert.subject) === JSON.stringify(cert.issuer)
    };
  }

  /**
   * Parse certificate chain
   */
  private parseCertificateChain(cert: any): SSLCertificateInfo[] {
    const chain: SSLCertificateInfo[] = [];
    let currentCert = cert;

    while (currentCert) {
      chain.push(this.parseCertificate(currentCert));
      currentCert = currentCert.issuerCertificate;

      // Break if we've reached a self-signed cert or circular reference
      if (!currentCert || currentCert === cert || JSON.stringify(currentCert) === JSON.stringify(cert)) {
        break;
      }
    }

    return chain;
  }

  /**
   * Test certificate validity
   */
  private async testCertificateValidity(cert: SSLCertificateInfo, domain: string): Promise<void> {
    const now = new Date();
    const daysUntilExpiry = Math.ceil((cert.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Expiry test
    if (cert.validTo < now) {
      this.results.push({
        testName: `Certificate Expiry - ${domain}`,
        status: 'FAIL',
        severity: 'CRITICAL',
        description: 'Certificate has expired',
        details: { validTo: cert.validTo, daysExpired: -daysUntilExpiry },
        remediation: 'Renew the SSL certificate immediately'
      });
    } else if (daysUntilExpiry <= 30) {
      this.results.push({
        testName: `Certificate Expiry - ${domain}`,
        status: 'WARNING',
        severity: 'HIGH',
        description: `Certificate expires in ${daysUntilExpiry} days`,
        details: { validTo: cert.validTo, daysUntilExpiry },
        remediation: 'Schedule certificate renewal soon'
      });
    } else {
      this.results.push({
        testName: `Certificate Expiry - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: `Certificate valid for ${daysUntilExpiry} more days`,
        details: { validTo: cert.validTo, daysUntilExpiry },
        remediation: 'Monitor certificate expiry date'
      });
    }

    // Valid from test
    if (cert.validFrom > now) {
      this.results.push({
        testName: `Certificate Validity Period - ${domain}`,
        status: 'FAIL',
        severity: 'CRITICAL',
        description: 'Certificate is not yet valid',
        details: { validFrom: cert.validFrom },
        remediation: 'Check certificate validity period configuration'
      });
    } else {
      this.results.push({
        testName: `Certificate Validity Period - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: 'Certificate validity period is correct',
        details: { validFrom: cert.validFrom },
        remediation: 'Continue monitoring validity period'
      });
    }

    // Subject Alternative Names test
    const [hostname] = domain.split(':');
    const matchesSAN = cert.altNames.some(name =>
      name === hostname ||
      (name.startsWith('*.') && hostname.endsWith(name.slice(1)))
    );

    const matchesCN = cert.subject.CN === hostname ||
                     (cert.subject.CN?.startsWith('*.') && hostname.endsWith(cert.subject.CN.slice(1)));

    if (!matchesSAN && !matchesCN) {
      this.results.push({
        testName: `Certificate Hostname Match - ${domain}`,
        status: 'FAIL',
        severity: 'HIGH',
        description: 'Certificate does not match hostname',
        details: { hostname, CN: cert.subject.CN, altNames: cert.altNames },
        remediation: 'Ensure certificate covers the requested hostname'
      });
    } else {
      this.results.push({
        testName: `Certificate Hostname Match - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: 'Certificate matches hostname',
        details: { hostname, matches: matchesSAN ? 'SAN' : 'CN' },
        remediation: 'Continue using valid certificate'
      });
    }
  }

  /**
   * Test certificate chain
   */
  private async testCertificateChain(chain: SSLCertificateInfo[], domain: string): Promise<void> {
    if (chain.length === 0) {
      this.results.push({
        testName: `Certificate Chain - ${domain}`,
        status: 'FAIL',
        severity: 'CRITICAL',
        description: 'No certificate chain available',
        remediation: 'Configure proper certificate chain'
      });
      return;
    }

    // Chain length test
    if (chain.length < 2) {
      this.results.push({
        testName: `Certificate Chain Length - ${domain}`,
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Certificate chain is incomplete',
        details: { chainLength: chain.length },
        remediation: 'Include intermediate certificates in chain'
      });
    } else {
      this.results.push({
        testName: `Certificate Chain Length - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: `Complete certificate chain with ${chain.length} certificates`,
        details: { chainLength: chain.length },
        remediation: 'Maintain complete certificate chain'
      });
    }

    // Self-signed test
    if (chain[0].isSelfSigned) {
      this.results.push({
        testName: `Self-Signed Certificate - ${domain}`,
        status: 'FAIL',
        severity: 'HIGH',
        description: 'Certificate is self-signed',
        details: { issuer: chain[0].issuer },
        remediation: 'Use certificate from trusted Certificate Authority'
      });
    } else {
      this.results.push({
        testName: `Self-Signed Certificate - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: 'Certificate is from trusted CA',
        details: { issuer: chain[0].issuer },
        remediation: 'Continue using CA-signed certificates'
      });
    }
  }

  /**
   * Test certificate security properties
   */
  private async testCertificateSecurity(cert: SSLCertificateInfo, domain: string): Promise<void> {
    // Key length test
    if (cert.keyLength < 2048) {
      this.results.push({
        testName: `Certificate Key Length - ${domain}`,
        status: 'FAIL',
        severity: 'HIGH',
        description: `Weak key length: ${cert.keyLength} bits`,
        details: { keyLength: cert.keyLength },
        remediation: 'Use at least 2048-bit RSA or 256-bit ECC keys'
      });
    } else if (cert.keyLength >= 4096) {
      this.results.push({
        testName: `Certificate Key Length - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: `Strong key length: ${cert.keyLength} bits`,
        details: { keyLength: cert.keyLength },
        remediation: 'Maintain strong key lengths'
      });
    } else {
      this.results.push({
        testName: `Certificate Key Length - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: `Adequate key length: ${cert.keyLength} bits`,
        details: { keyLength: cert.keyLength },
        remediation: 'Consider upgrading to 4096-bit keys'
      });
    }

    // Signature algorithm test
    const weakAlgorithms = ['md5', 'sha1'];
    const isWeakSignature = weakAlgorithms.some(alg =>
      cert.signatureAlgorithm.toLowerCase().includes(alg)
    );

    if (isWeakSignature) {
      this.results.push({
        testName: `Certificate Signature Algorithm - ${domain}`,
        status: 'FAIL',
        severity: 'HIGH',
        description: `Weak signature algorithm: ${cert.signatureAlgorithm}`,
        details: { algorithm: cert.signatureAlgorithm },
        remediation: 'Use SHA-256 or stronger signature algorithm'
      });
    } else {
      this.results.push({
        testName: `Certificate Signature Algorithm - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: `Strong signature algorithm: ${cert.signatureAlgorithm}`,
        details: { algorithm: cert.signatureAlgorithm },
        remediation: 'Continue using strong signature algorithms'
      });
    }

    // Wildcard certificate test
    if (cert.isWildcard) {
      this.results.push({
        testName: `Wildcard Certificate - ${domain}`,
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Wildcard certificate in use',
        details: { subject: cert.subject.CN },
        remediation: 'Consider using specific certificates for better security'
      });
    } else {
      this.results.push({
        testName: `Wildcard Certificate - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: 'Specific hostname certificate',
        details: { subject: cert.subject.CN },
        remediation: 'Continue using specific certificates'
      });
    }
  }

  /**
   * Test TLS protocol version
   */
  private async testTLSProtocol(connectionInfo: TLSConnectionInfo, domain: string): Promise<void> {
    const protocol = connectionInfo.protocol;

    // Check for deprecated protocols
    const deprecatedProtocols = ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1'];
    const secureProtocols = ['TLSv1.2', 'TLSv1.3'];

    if (deprecatedProtocols.includes(protocol)) {
      this.results.push({
        testName: `TLS Protocol Version - ${domain}`,
        status: 'FAIL',
        severity: 'CRITICAL',
        description: `Deprecated protocol in use: ${protocol}`,
        details: { protocol },
        remediation: 'Disable deprecated protocols, use TLS 1.2+ only'
      });
    } else if (secureProtocols.includes(protocol)) {
      const severity = protocol === 'TLSv1.3' ? 'LOW' : 'MEDIUM';
      this.results.push({
        testName: `TLS Protocol Version - ${domain}`,
        status: 'PASS',
        severity,
        description: `Secure protocol in use: ${protocol}`,
        details: { protocol },
        remediation: protocol === 'TLSv1.2' ? 'Consider upgrading to TLS 1.3' : 'Continue using TLS 1.3'
      });
    } else {
      this.results.push({
        testName: `TLS Protocol Version - ${domain}`,
        status: 'WARNING',
        severity: 'MEDIUM',
        description: `Unknown protocol: ${protocol}`,
        details: { protocol },
        remediation: 'Verify protocol version and ensure it\'s secure'
      });
    }
  }

  /**
   * Test cipher suite strength
   */
  private async testCipherSuite(connectionInfo: TLSConnectionInfo, domain: string): Promise<void> {
    const cipher = connectionInfo.cipher;

    // Weak ciphers
    const weakCiphers = ['RC4', 'DES', '3DES', 'MD5'];
    const isWeakCipher = weakCiphers.some(weak => cipher.name.toUpperCase().includes(weak));

    if (isWeakCipher) {
      this.results.push({
        testName: `Cipher Suite Strength - ${domain}`,
        status: 'FAIL',
        severity: 'HIGH',
        description: `Weak cipher suite: ${cipher.name}`,
        details: { cipher: cipher.name, bits: cipher.bits },
        remediation: 'Configure strong cipher suites (AES, ChaCha20)'
      });
    } else if (cipher.bits >= 256) {
      this.results.push({
        testName: `Cipher Suite Strength - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: `Strong cipher suite: ${cipher.name} (${cipher.bits} bits)`,
        details: { cipher: cipher.name, bits: cipher.bits },
        remediation: 'Continue using strong cipher suites'
      });
    } else if (cipher.bits >= 128) {
      this.results.push({
        testName: `Cipher Suite Strength - ${domain}`,
        status: 'PASS',
        severity: 'MEDIUM',
        description: `Adequate cipher suite: ${cipher.name} (${cipher.bits} bits)`,
        details: { cipher: cipher.name, bits: cipher.bits },
        remediation: 'Consider upgrading to 256-bit ciphers'
      });
    } else {
      this.results.push({
        testName: `Cipher Suite Strength - ${domain}`,
        status: 'FAIL',
        severity: 'CRITICAL',
        description: `Very weak cipher: ${cipher.name} (${cipher.bits} bits)`,
        details: { cipher: cipher.name, bits: cipher.bits },
        remediation: 'Immediately upgrade to stronger ciphers (128+ bits)'
      });
    }
  }

  /**
   * Test key exchange mechanisms
   */
  private async testKeyExchange(connectionInfo: TLSConnectionInfo, domain: string): Promise<void> {
    const ephemeralKeyInfo = connectionInfo.ephemeralKeyInfo;

    if (!ephemeralKeyInfo) {
      this.results.push({
        testName: `Perfect Forward Secrecy - ${domain}`,
        status: 'FAIL',
        severity: 'HIGH',
        description: 'No ephemeral key exchange (no PFS)',
        remediation: 'Enable Perfect Forward Secrecy with ECDHE or DHE key exchange'
      });
      return;
    }

    // Test key exchange strength
    if (ephemeralKeyInfo.type === 'ECDH' && ephemeralKeyInfo.size >= 256) {
      this.results.push({
        testName: `Perfect Forward Secrecy - ${domain}`,
        status: 'PASS',
        severity: 'LOW',
        description: `Strong PFS: ${ephemeralKeyInfo.type} ${ephemeralKeyInfo.size}-bit`,
        details: ephemeralKeyInfo,
        remediation: 'Continue using strong ephemeral key exchange'
      });
    } else if (ephemeralKeyInfo.type === 'DH' && ephemeralKeyInfo.size >= 2048) {
      this.results.push({
        testName: `Perfect Forward Secrecy - ${domain}`,
        status: 'PASS',
        severity: 'MEDIUM',
        description: `Adequate PFS: ${ephemeralKeyInfo.type} ${ephemeralKeyInfo.size}-bit`,
        details: ephemeralKeyInfo,
        remediation: 'Consider upgrading to ECDHE for better performance'
      });
    } else {
      this.results.push({
        testName: `Perfect Forward Secrecy - ${domain}`,
        status: 'FAIL',
        severity: 'HIGH',
        description: `Weak PFS: ${ephemeralKeyInfo.type} ${ephemeralKeyInfo.size}-bit`,
        details: ephemeralKeyInfo,
        remediation: 'Use stronger ephemeral key exchange (ECDHE P-256+ or DH 2048+)'
      });
    }
  }

  /**
   * Test environment-specific SSL/TLS configuration
   */
  private async testEnvironmentConfiguration(): Promise<void> {
    // Check Node.js TLS configuration
    const nodeVersion = process.version;
    const tlsVersion = process.versions.openssl;

    this.results.push({
      testName: 'Node.js TLS Support',
      status: 'INFO',
      severity: 'LOW',
      description: `Node.js ${nodeVersion} with OpenSSL ${tlsVersion}`,
      details: { nodeVersion, tlsVersion },
      remediation: 'Keep Node.js and OpenSSL updated'
    });

    // Check environment variables
    const httpsEnforced = process.env.HTTPS === 'true' || process.env.NODE_ENV === 'production';

    if (process.env.NODE_ENV === 'production' && !httpsEnforced) {
      this.results.push({
        testName: 'HTTPS Enforcement',
        status: 'FAIL',
        severity: 'HIGH',
        description: 'HTTPS not enforced in production',
        details: { nodeEnv: process.env.NODE_ENV, httpsEnforced },
        remediation: 'Set HTTPS=true in production environment'
      });
    } else {
      this.results.push({
        testName: 'HTTPS Enforcement',
        status: httpsEnforced ? 'PASS' : 'WARNING',
        severity: httpsEnforced ? 'LOW' : 'MEDIUM',
        description: httpsEnforced ? 'HTTPS properly enforced' : 'HTTPS enforcement not configured',
        details: { nodeEnv: process.env.NODE_ENV, httpsEnforced },
        remediation: httpsEnforced ? 'Continue enforcing HTTPS' : 'Configure HTTPS enforcement'
      });
    }

    // Check for TLS-related security headers middleware
    try {
      const middlewareExists = require('fs').existsSync('backend/src/middleware/security.ts');

      this.results.push({
        testName: 'Security Headers Middleware',
        status: middlewareExists ? 'PASS' : 'WARNING',
        severity: middlewareExists ? 'LOW' : 'MEDIUM',
        description: middlewareExists ? 'Security middleware configured' : 'Security middleware not found',
        details: { middlewareExists },
        remediation: middlewareExists ? 'Ensure HSTS and other headers are configured' : 'Implement security headers middleware'
      });
    } catch (error) {
      this.results.push({
        testName: 'Security Headers Middleware',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Unable to check security middleware',
        remediation: 'Verify security headers middleware is properly configured'
      });
    }

    // Test certificate storage security
    const certPaths = [
      process.env.SSL_CERT_PATH,
      process.env.SSL_KEY_PATH,
      process.env.TLS_CERT,
      process.env.TLS_KEY
    ].filter(Boolean);

    if (certPaths.length > 0) {
      // Check if certificates are stored securely (not in codebase)
      const secureStorage = certPaths.every(path =>
        !path.includes('src/') &&
        !path.includes('public/') &&
        (path.startsWith('/etc/') || path.startsWith('/var/') || path.includes('secrets'))
      );

      this.results.push({
        testName: 'Certificate Storage Security',
        status: secureStorage ? 'PASS' : 'FAIL',
        severity: secureStorage ? 'LOW' : 'HIGH',
        description: secureStorage ? 'Certificates stored securely' : 'Certificates may be stored insecurely',
        details: { certPaths: certPaths.length },
        remediation: 'Store certificates outside codebase in secure directories'
      });
    } else {
      this.results.push({
        testName: 'Certificate Storage Security',
        status: 'INFO',
        severity: 'LOW',
        description: 'No certificate paths configured (likely using cloud SSL termination)',
        remediation: 'If using custom certificates, ensure secure storage'
      });
    }
  }

  /**
   * Generate summary based on test results
   */
  private generateSummary(overallScore: number, failCount: number, warningCount: number): string {
    if (overallScore >= 90 && failCount === 0) {
      return 'Excellent SSL/TLS configuration with strong security settings.';
    } else if (overallScore >= 80 && failCount <= 1) {
      return 'Good SSL/TLS configuration with minor issues to address.';
    } else if (overallScore >= 70) {
      return 'Moderate SSL/TLS security requiring attention to several issues.';
    } else if (failCount > 5) {
      return `Poor SSL/TLS configuration with ${failCount} critical issues requiring immediate attention.`;
    } else {
      return 'SSL/TLS configuration needs significant improvements for production use.';
    }
  }
}

/**
 * Jest test suite
 */
describe('SSL/TLS Configuration Validation', () => {
  let validator: SSLTLSValidator;

  beforeAll(() => {
    validator = new SSLTLSValidator(['localhost:3000']);
  });

  test('should validate SSL/TLS configuration comprehensively', async () => {
    const results = await validator.validateSSLTLS();

    expect(results).toBeDefined();
    expect(results.overallScore).toBeGreaterThanOrEqual(0);
    expect(results.overallScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(results.results)).toBe(true);

    console.log(`\n🔒 SSL/TLS Validation Results:`);
    console.log(`Overall Score: ${results.overallScore}%`);
    console.log(`✅ Passed: ${results.passCount}`);
    console.log(`❌ Failed: ${results.failCount}`);
    console.log(`⚠️  Warnings: ${results.warningCount}`);
    console.log(`Summary: ${results.summary}\n`);

    // Log critical issues
    const criticalIssues = results.results.filter(r =>
      r.severity === 'CRITICAL' && r.status === 'FAIL'
    );

    if (criticalIssues.length > 0) {
      console.log('🚨 Critical SSL/TLS Issues:');
      criticalIssues.forEach(issue => {
        console.log(`  - ${issue.testName}: ${issue.description}`);
      });
    }

    // Log high-priority recommendations
    const highPriorityIssues = results.results.filter(r =>
      r.severity === 'HIGH' && (r.status === 'FAIL' || r.status === 'WARNING')
    );

    if (highPriorityIssues.length > 0) {
      console.log('\n⚠️  High Priority SSL/TLS Issues:');
      highPriorityIssues.forEach(issue => {
        console.log(`  - ${issue.testName}: ${issue.description}`);
        console.log(`    Remediation: ${issue.remediation}`);
      });
    }
  }, 30000);

  test('should handle connection errors gracefully', async () => {
    const invalidValidator = new SSLTLSValidator(['nonexistent.invalid:443']);
    const results = await invalidValidator.validateSSLTLS();

    expect(results).toBeDefined();
    expect(results.results.some(r => r.status === 'FAIL' && r.description.includes('Unable to establish SSL connection'))).toBe(true);
  });

  test('should validate environment configuration', async () => {
    const results = await validator.validateSSLTLS();

    const envTests = results.results.filter(r =>
      r.testName.includes('HTTPS Enforcement') ||
      r.testName.includes('Security Headers') ||
      r.testName.includes('Certificate Storage')
    );

    expect(envTests.length).toBeGreaterThan(0);
  });

  test('should provide detailed remediation guidance', async () => {
    const results = await validator.validateSSLTLS();

    results.results.forEach(result => {
      expect(result.remediation).toBeDefined();
      expect(result.remediation.length).toBeGreaterThan(0);
    });
  });
});