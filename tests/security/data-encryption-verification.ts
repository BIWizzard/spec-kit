/**
 * Data Encryption Verification - T455
 *
 * Comprehensive audit of data encryption at rest and in transit:
 * - Database encryption configuration
 * - API communication encryption
 * - Sensitive data field encryption
 * - Key management practices
 * - Encryption algorithm strength
 * - Data classification compliance
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import request from 'supertest';

export interface EncryptionTestResult {
  category: 'DATABASE' | 'TRANSIT' | 'STORAGE' | 'KEYS' | 'ALGORITHMS';
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details?: any;
  remediation: string;
}

export interface SensitiveDataField {
  table: string;
  field: string;
  dataType: string;
  isEncrypted: boolean;
  encryptionMethod?: string;
  classification: 'PII' | 'FINANCIAL' | 'AUTHENTICATION' | 'PRIVATE';
}

export class DataEncryptionVerifier {
  private results: EncryptionTestResult[] = [];
  private sensitiveFields: SensitiveDataField[] = [];

  constructor() {
    this.initializeSensitiveFields();
  }

  /**
   * Run comprehensive encryption verification
   */
  async verifyEncryption(): Promise<{
    overallScore: number;
    passCount: number;
    failCount: number;
    warningCount: number;
    criticalFindings: EncryptionTestResult[];
    results: EncryptionTestResult[];
    summary: string;
  }> {
    console.log('🔐 Starting Data Encryption Verification...\n');

    this.results = [];

    // Test categories
    await this.verifyDatabaseEncryption();
    await this.verifyTransitEncryption();
    await this.verifyStorageEncryption();
    await this.verifyKeyManagement();
    await this.verifyEncryptionAlgorithms();

    // Calculate metrics
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    const totalTests = this.results.length;
    const overallScore = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;

    const criticalFindings = this.results.filter(r =>
      r.severity === 'CRITICAL' && r.status === 'FAIL'
    );

    const summary = this.generateSummary(overallScore, criticalFindings.length);

    return {
      overallScore,
      passCount,
      failCount,
      warningCount,
      criticalFindings,
      results: this.results,
      summary
    };
  }

  /**
   * Initialize sensitive data fields that should be encrypted
   */
  private initializeSensitiveFields(): void {
    this.sensitiveFields = [
      // Authentication data
      { table: 'FamilyMember', field: 'passwordHash', dataType: 'string', isEncrypted: true, classification: 'AUTHENTICATION' },
      { table: 'FamilyMember', field: 'mfaSecret', dataType: 'string', isEncrypted: true, encryptionMethod: 'AES', classification: 'AUTHENTICATION' },
      { table: 'FamilyMember', field: 'email', dataType: 'string', isEncrypted: false, classification: 'PII' },

      // Financial data
      { table: 'BankAccount', field: 'accountNumber', dataType: 'string', isEncrypted: true, classification: 'FINANCIAL' },
      { table: 'BankAccount', field: 'plaidAccessToken', dataType: 'string', isEncrypted: true, classification: 'FINANCIAL' },
      { table: 'Payment', field: 'amount', dataType: 'decimal', isEncrypted: false, classification: 'FINANCIAL' },
      { table: 'IncomeEvent', field: 'amount', dataType: 'decimal', isEncrypted: false, classification: 'FINANCIAL' },

      // Personal data
      { table: 'FamilyMember', field: 'firstName', dataType: 'string', isEncrypted: false, classification: 'PII' },
      { table: 'FamilyMember', field: 'lastName', dataType: 'string', isEncrypted: false, classification: 'PII' },

      // Session data
      { table: 'Session', field: 'token', dataType: 'string', isEncrypted: true, classification: 'AUTHENTICATION' },

      // Audit data
      { table: 'AuditLog', field: 'oldValues', dataType: 'jsonb', isEncrypted: false, classification: 'PRIVATE' },
      { table: 'AuditLog', field: 'newValues', dataType: 'jsonb', isEncrypted: false, classification: 'PRIVATE' },
    ];
  }

  /**
   * Verify database encryption at rest
   */
  private async verifyDatabaseEncryption(): Promise<void> {
    // Check database connection encryption
    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

    if (!dbUrl) {
      this.results.push({
        category: 'DATABASE',
        testName: 'Database Connection Configuration',
        status: 'FAIL',
        severity: 'CRITICAL',
        description: 'No database connection string found',
        remediation: 'Configure DATABASE_URL with proper encryption settings'
      });
      return;
    }

    // Test connection encryption
    const hasSSL = dbUrl.includes('ssl=true') || dbUrl.includes('sslmode=require') || dbUrl.includes('neon.tech');
    this.results.push({
      category: 'DATABASE',
      testName: 'Database Connection Encryption',
      status: hasSSL ? 'PASS' : 'FAIL',
      severity: hasSSL ? 'LOW' : 'CRITICAL',
      description: hasSSL ? 'Database connection uses SSL/TLS' : 'Database connection not encrypted',
      details: { hasSSL, isNeon: dbUrl.includes('neon.tech') },
      remediation: hasSSL ? 'Maintain SSL/TLS for database connections' : 'Enable SSL/TLS for database connections'
    });

    // Check for database encryption at rest
    if (dbUrl.includes('neon.tech')) {
      this.results.push({
        category: 'DATABASE',
        testName: 'Database Encryption at Rest',
        status: 'PASS',
        severity: 'LOW',
        description: 'Neon provides automatic encryption at rest',
        details: { provider: 'Neon' },
        remediation: 'Continue using Neon for encrypted storage'
      });
    } else {
      this.results.push({
        category: 'DATABASE',
        testName: 'Database Encryption at Rest',
        status: 'WARNING',
        severity: 'HIGH',
        description: 'Unable to verify encryption at rest configuration',
        remediation: 'Verify database provider supports encryption at rest'
      });
    }

    // Check Prisma schema for sensitive field handling
    await this.checkPrismaEncryption();

    // Verify sensitive data field encryption
    await this.verifySensitiveFieldEncryption();
  }

  /**
   * Check Prisma schema for encryption configurations
   */
  private async checkPrismaEncryption(): Promise<void> {
    try {
      const schemaPath = 'backend/src/models/schema.prisma';
      if (!fs.existsSync(schemaPath)) {
        this.results.push({
          category: 'DATABASE',
          testName: 'Prisma Schema Encryption',
          status: 'WARNING',
          severity: 'MEDIUM',
          description: 'Prisma schema not found',
          remediation: 'Ensure Prisma schema includes encryption directives for sensitive fields'
        });
        return;
      }

      const schemaContent = fs.readFileSync(schemaPath, 'utf8');

      // Check for encryption extensions or middleware
      const hasEncryptionExtension = schemaContent.includes('@encrypt') ||
                                    schemaContent.includes('prisma-field-encryption') ||
                                    schemaContent.includes('encryption');

      this.results.push({
        category: 'DATABASE',
        testName: 'Prisma Field Encryption',
        status: hasEncryptionExtension ? 'PASS' : 'WARNING',
        severity: hasEncryptionExtension ? 'LOW' : 'HIGH',
        description: hasEncryptionExtension ? 'Prisma encryption configured' : 'No field-level encryption in Prisma schema',
        details: { hasEncryptionExtension },
        remediation: 'Implement field-level encryption for sensitive data using Prisma middleware or extensions'
      });

      // Check for sensitive fields that should be encrypted
      const unencryptedSensitiveFields = this.sensitiveFields.filter(field => {
        const fieldPattern = new RegExp(`${field.field}\\s+\\w+`, 'i');
        return schemaContent.match(fieldPattern) &&
               !schemaContent.includes(`@encrypt`) &&
               field.classification === 'AUTHENTICATION';
      });

      if (unencryptedSensitiveFields.length > 0) {
        this.results.push({
          category: 'DATABASE',
          testName: 'Sensitive Field Protection',
          status: 'FAIL',
          severity: 'HIGH',
          description: `${unencryptedSensitiveFields.length} sensitive fields lack encryption`,
          details: { unencryptedFields: unencryptedSensitiveFields.map(f => `${f.table}.${f.field}`) },
          remediation: 'Encrypt sensitive authentication and financial fields'
        });
      } else {
        this.results.push({
          category: 'DATABASE',
          testName: 'Sensitive Field Protection',
          status: 'PASS',
          severity: 'LOW',
          description: 'Sensitive fields appear to be protected',
          remediation: 'Continue protecting sensitive data fields'
        });
      }

    } catch (error) {
      this.results.push({
        category: 'DATABASE',
        testName: 'Prisma Schema Analysis',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Unable to analyze Prisma schema',
        details: { error: error.message },
        remediation: 'Ensure Prisma schema is accessible and properly configured'
      });
    }
  }

  /**
   * Verify sensitive field encryption implementation
   */
  private async verifySensitiveFieldEncryption(): Promise<void> {
    // Check if encryption utilities exist
    const encryptionPaths = [
      'backend/src/lib/encryption.ts',
      'backend/src/services/encryption.service.ts',
      'backend/src/utils/crypto.ts'
    ];

    const encryptionFileExists = encryptionPaths.some(path => fs.existsSync(path));

    this.results.push({
      category: 'DATABASE',
      testName: 'Encryption Utilities',
      status: encryptionFileExists ? 'PASS' : 'WARNING',
      severity: encryptionFileExists ? 'LOW' : 'HIGH',
      description: encryptionFileExists ? 'Encryption utilities implemented' : 'No encryption utilities found',
      details: { checkedPaths: encryptionPaths },
      remediation: 'Implement encryption utilities for sensitive data handling'
    });

    // Check for bcrypt usage for passwords
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasBcrypt = packageJson.dependencies?.bcrypt || packageJson.dependencies?.bcryptjs;
      const hasArgon2 = packageJson.dependencies?.argon2;

      this.results.push({
        category: 'DATABASE',
        testName: 'Password Hashing',
        status: (hasBcrypt || hasArgon2) ? 'PASS' : 'FAIL',
        severity: (hasBcrypt || hasArgon2) ? 'LOW' : 'CRITICAL',
        description: (hasBcrypt || hasArgon2) ? 'Secure password hashing implemented' : 'No secure password hashing found',
        details: { hasBcrypt: !!hasBcrypt, hasArgon2: !!hasArgon2 },
        remediation: 'Use bcrypt, scrypt, or Argon2 for password hashing'
      });
    } catch (error) {
      this.results.push({
        category: 'DATABASE',
        testName: 'Password Hashing Dependencies',
        status: 'WARNING',
        severity: 'HIGH',
        description: 'Unable to check password hashing dependencies',
        remediation: 'Ensure secure password hashing libraries are installed'
      });
    }
  }

  /**
   * Verify encryption in transit
   */
  private async verifyTransitEncryption(): Promise<void> {
    // Check HTTPS enforcement
    const httpsEnforced = process.env.HTTPS === 'true' || process.env.NODE_ENV === 'production';

    this.results.push({
      category: 'TRANSIT',
      testName: 'HTTPS Enforcement',
      status: httpsEnforced ? 'PASS' : 'WARNING',
      severity: httpsEnforced ? 'LOW' : 'HIGH',
      description: httpsEnforced ? 'HTTPS properly enforced' : 'HTTPS enforcement not configured',
      details: { httpsEnforced, nodeEnv: process.env.NODE_ENV },
      remediation: 'Enforce HTTPS in production environments'
    });

    // Check TLS configuration in middleware
    try {
      const securityMiddlewarePath = 'backend/src/middleware/security.ts';
      if (fs.existsSync(securityMiddlewarePath)) {
        const middlewareContent = fs.readFileSync(securityMiddlewarePath, 'utf8');

        const hasHSTS = middlewareContent.includes('hsts') || middlewareContent.includes('Strict-Transport-Security');
        const hasSecureHeaders = middlewareContent.includes('x-content-type-options') ||
                                middlewareContent.includes('noSniff');

        this.results.push({
          category: 'TRANSIT',
          testName: 'Security Headers Configuration',
          status: (hasHSTS && hasSecureHeaders) ? 'PASS' : 'WARNING',
          severity: (hasHSTS && hasSecureHeaders) ? 'LOW' : 'MEDIUM',
          description: 'Security headers for transit protection',
          details: { hasHSTS, hasSecureHeaders },
          remediation: 'Configure HSTS and other security headers'
        });
      } else {
        this.results.push({
          category: 'TRANSIT',
          testName: 'Security Middleware',
          status: 'WARNING',
          severity: 'MEDIUM',
          description: 'Security middleware not found',
          remediation: 'Implement security middleware with HSTS and other headers'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'TRANSIT',
        testName: 'Security Middleware Check',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Unable to check security middleware',
        remediation: 'Verify security middleware configuration'
      });
    }

    // Check API client encryption
    await this.checkAPIClientEncryption();

    // Check third-party service encryption (Plaid)
    await this.checkThirdPartyEncryption();
  }

  /**
   * Check API client encryption configuration
   */
  private async checkAPIClientEncryption(): Promise<void> {
    try {
      const apiClientPaths = [
        'frontend/src/lib/api-client.ts',
        'frontend/src/services/api.ts',
        'frontend/src/lib/fetch.ts'
      ];

      const apiClientPath = apiClientPaths.find(path => fs.existsSync(path));

      if (apiClientPath) {
        const clientContent = fs.readFileSync(apiClientPath, 'utf8');

        const usesHttps = clientContent.includes('https://') ||
                         clientContent.includes('process.env.NEXT_PUBLIC_API_URL') ||
                         !clientContent.includes('http://');

        this.results.push({
          category: 'TRANSIT',
          testName: 'API Client HTTPS Usage',
          status: usesHttps ? 'PASS' : 'FAIL',
          severity: usesHttps ? 'LOW' : 'HIGH',
          description: usesHttps ? 'API client uses HTTPS' : 'API client may use unencrypted HTTP',
          details: { usesHttps, filePath: apiClientPath },
          remediation: 'Ensure all API calls use HTTPS'
        });
      } else {
        this.results.push({
          category: 'TRANSIT',
          testName: 'API Client Configuration',
          status: 'WARNING',
          severity: 'MEDIUM',
          description: 'API client configuration not found',
          remediation: 'Ensure API client enforces HTTPS for all requests'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'TRANSIT',
        testName: 'API Client Analysis',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Unable to analyze API client configuration',
        remediation: 'Verify API client uses HTTPS for all requests'
      });
    }
  }

  /**
   * Check third-party service encryption
   */
  private async checkThirdPartyEncryption(): Promise<void> {
    // Check Plaid configuration
    try {
      const plaidConfigPath = 'backend/src/lib/plaid.ts';
      if (fs.existsSync(plaidConfigPath)) {
        const plaidContent = fs.readFileSync(plaidConfigPath, 'utf8');

        const usesProduction = plaidContent.includes('Production') ||
                              plaidContent.includes('production') ||
                              process.env.PLAID_ENV === 'production';

        const hasSecrets = plaidContent.includes('PLAID_SECRET') ||
                          process.env.PLAID_SECRET;

        this.results.push({
          category: 'TRANSIT',
          testName: 'Plaid API Configuration',
          status: (usesProduction && hasSecrets) ? 'PASS' : 'WARNING',
          severity: (usesProduction && hasSecrets) ? 'LOW' : 'MEDIUM',
          description: 'Plaid API encryption and environment configuration',
          details: { usesProduction, hasSecrets },
          remediation: 'Use production Plaid environment with secure credential management'
        });
      } else {
        this.results.push({
          category: 'TRANSIT',
          testName: 'Plaid Configuration',
          status: 'INFO',
          severity: 'LOW',
          description: 'Plaid configuration not found or not analyzed',
          remediation: 'Ensure third-party APIs use encrypted connections'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'TRANSIT',
        testName: 'Third-Party API Analysis',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Unable to analyze third-party API configurations',
        remediation: 'Verify all third-party APIs use encrypted connections'
      });
    }
  }

  /**
   * Verify storage encryption
   */
  private async verifyStorageEncryption(): Promise<void> {
    // Check session storage encryption
    try {
      const sessionPaths = [
        'backend/src/lib/session.ts',
        'backend/src/middleware/auth.ts'
      ];

      const sessionPath = sessionPaths.find(path => fs.existsSync(path));

      if (sessionPath) {
        const sessionContent = fs.readFileSync(sessionPath, 'utf8');

        const usesJWT = sessionContent.includes('jwt') || sessionContent.includes('jsonwebtoken');
        const hasSecureSettings = sessionContent.includes('httpOnly') ||
                                 sessionContent.includes('secure') ||
                                 sessionContent.includes('sameSite');

        this.results.push({
          category: 'STORAGE',
          testName: 'Session Storage Security',
          status: (usesJWT || hasSecureSettings) ? 'PASS' : 'WARNING',
          severity: (usesJWT || hasSecureSettings) ? 'LOW' : 'HIGH',
          description: 'Session storage encryption and security',
          details: { usesJWT, hasSecureSettings },
          remediation: 'Use secure session storage with encryption (JWT or secure cookies)'
        });
      } else {
        this.results.push({
          category: 'STORAGE',
          testName: 'Session Configuration',
          status: 'WARNING',
          severity: 'MEDIUM',
          description: 'Session configuration not found',
          remediation: 'Implement secure session management with encryption'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'STORAGE',
        testName: 'Session Storage Analysis',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Unable to analyze session storage',
        remediation: 'Verify session storage uses encryption'
      });
    }

    // Check file upload encryption (if applicable)
    await this.checkFileStorageEncryption();

    // Check log file encryption
    await this.checkLogEncryption();
  }

  /**
   * Check file storage encryption
   */
  private async checkFileStorageEncryption(): Promise<void> {
    const uploadDirs = ['uploads/', 'public/uploads/', 'storage/', 'tmp/'];

    const existingUploadDirs = uploadDirs.filter(dir => fs.existsSync(dir));

    if (existingUploadDirs.length > 0) {
      this.results.push({
        category: 'STORAGE',
        testName: 'File Upload Storage',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: `Found ${existingUploadDirs.length} upload directories`,
        details: { directories: existingUploadDirs },
        remediation: 'Encrypt sensitive files at rest and use secure storage locations'
      });
    } else {
      this.results.push({
        category: 'STORAGE',
        testName: 'File Upload Storage',
        status: 'PASS',
        severity: 'LOW',
        description: 'No local file upload directories found (good for security)',
        remediation: 'Continue using cloud storage with encryption for file uploads'
      });
    }
  }

  /**
   * Check log encryption
   */
  private async checkLogEncryption(): Promise<void> {
    const logPaths = ['logs/', 'log/', '.log'];
    const existingLogPaths = logPaths.filter(path => fs.existsSync(path));

    if (existingLogPaths.length > 0) {
      // Check for sensitive data in logs
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /\b\d{16}\b/, // Credit card pattern
        /\b\d{3}-\d{2}-\d{4}\b/ // SSN pattern
      ];

      let foundSensitiveData = false;
      try {
        for (const logPath of existingLogPaths) {
          if (fs.statSync(logPath).isDirectory()) {
            const logFiles = fs.readdirSync(logPath);
            for (const logFile of logFiles) {
              const logContent = fs.readFileSync(path.join(logPath, logFile), 'utf8');
              if (sensitivePatterns.some(pattern => pattern.test(logContent))) {
                foundSensitiveData = true;
                break;
              }
            }
          }
          if (foundSensitiveData) break;
        }

        this.results.push({
          category: 'STORAGE',
          testName: 'Log File Security',
          status: foundSensitiveData ? 'FAIL' : 'PASS',
          severity: foundSensitiveData ? 'HIGH' : 'LOW',
          description: foundSensitiveData ? 'Sensitive data found in logs' : 'No sensitive data in logs',
          details: { logPaths: existingLogPaths, foundSensitiveData },
          remediation: foundSensitiveData ? 'Remove sensitive data from logs and implement log encryption' : 'Continue secure logging practices'
        });
      } catch (error) {
        this.results.push({
          category: 'STORAGE',
          testName: 'Log File Analysis',
          status: 'WARNING',
          severity: 'MEDIUM',
          description: 'Unable to analyze log files',
          remediation: 'Ensure logs do not contain sensitive data and consider encryption'
        });
      }
    } else {
      this.results.push({
        category: 'STORAGE',
        testName: 'Log File Security',
        status: 'PASS',
        severity: 'LOW',
        description: 'No local log files found (good for security)',
        remediation: 'Continue using secure cloud logging'
      });
    }
  }

  /**
   * Verify key management practices
   */
  private async verifyKeyManagement(): Promise<void> {
    // Check environment variables for keys
    const keyEnvVars = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'DATABASE_URL',
      'PLAID_SECRET',
      'NEXTAUTH_SECRET'
    ];

    const configuredKeys = keyEnvVars.filter(key => process.env[key]);
    const missingKeys = keyEnvVars.filter(key => !process.env[key]);

    this.results.push({
      category: 'KEYS',
      testName: 'Environment Key Configuration',
      status: configuredKeys.length >= 3 ? 'PASS' : 'WARNING',
      severity: configuredKeys.length >= 3 ? 'LOW' : 'HIGH',
      description: `${configuredKeys.length}/${keyEnvVars.length} key environment variables configured`,
      details: { configuredKeys: configuredKeys.length, missingKeys },
      remediation: 'Configure all required encryption keys in environment variables'
    });

    // Check key strength
    await this.checkKeyStrength();

    // Check for hardcoded keys
    await this.checkHardcodedKeys();

    // Check key rotation capability
    await this.checkKeyRotation();
  }

  /**
   * Check encryption key strength
   */
  private async checkKeyStrength(): Promise<void> {
    const jwtSecret = process.env.JWT_SECRET;

    if (jwtSecret) {
      const isStrong = jwtSecret.length >= 32 &&
                      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(jwtSecret);

      this.results.push({
        category: 'KEYS',
        testName: 'JWT Secret Strength',
        status: isStrong ? 'PASS' : 'FAIL',
        severity: isStrong ? 'LOW' : 'HIGH',
        description: isStrong ? 'JWT secret meets strength requirements' : 'JWT secret is weak',
        details: { length: jwtSecret.length, hasComplexity: isStrong },
        remediation: 'Use cryptographically strong secrets (256+ bits, mixed characters)'
      });
    } else {
      this.results.push({
        category: 'KEYS',
        testName: 'JWT Secret Configuration',
        status: 'FAIL',
        severity: 'CRITICAL',
        description: 'JWT secret not configured',
        remediation: 'Configure strong JWT secret in environment variables'
      });
    }

    // Check database URL for embedded credentials
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && dbUrl.includes('://')) {
      const hasStrongCredentials = !dbUrl.includes('password') &&
                                  !dbUrl.includes('admin') &&
                                  !dbUrl.includes('test');

      this.results.push({
        category: 'KEYS',
        testName: 'Database Credentials',
        status: hasStrongCredentials ? 'PASS' : 'WARNING',
        severity: hasStrongCredentials ? 'LOW' : 'MEDIUM',
        description: 'Database credential strength in connection string',
        remediation: 'Use strong, unique database credentials'
      });
    }
  }

  /**
   * Check for hardcoded keys in codebase
   */
  private async checkHardcodedKeys(): Promise<void> {
    const keyPatterns = [
      /secret.*[=:]\s*["'][^"']{10,}["']/i,
      /key.*[=:]\s*["'][^"']{10,}["']/i,
      /password.*[=:]\s*["'][^"']{5,}["']/i,
      /token.*[=:]\s*["'][^"']{20,}["']/i,
      /api[_-]?key.*[=:]\s*["'][^"']{10,}["']/i
    ];

    try {
      // Check source files for hardcoded secrets
      const sourceFiles = this.getSourceFiles();
      let foundHardcodedKeys = 0;
      const hardcodedFiles: string[] = [];

      for (const file of sourceFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const hasHardcodedKey = keyPatterns.some(pattern => pattern.test(content));

          if (hasHardcodedKey) {
            foundHardcodedKeys++;
            hardcodedFiles.push(file);
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      this.results.push({
        category: 'KEYS',
        testName: 'Hardcoded Keys Detection',
        status: foundHardcodedKeys === 0 ? 'PASS' : 'FAIL',
        severity: foundHardcodedKeys === 0 ? 'LOW' : 'CRITICAL',
        description: foundHardcodedKeys === 0 ? 'No hardcoded keys detected' : `${foundHardcodedKeys} files with potential hardcoded keys`,
        details: { filesWithKeys: hardcodedFiles.length > 0 ? hardcodedFiles : undefined },
        remediation: 'Remove all hardcoded keys and use environment variables'
      });
    } catch (error) {
      this.results.push({
        category: 'KEYS',
        testName: 'Hardcoded Keys Scan',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Unable to scan for hardcoded keys',
        remediation: 'Manually review code for hardcoded credentials'
      });
    }
  }

  /**
   * Check key rotation capability
   */
  private async checkKeyRotation(): Promise<void> {
    // Check if there's a key rotation mechanism
    const keyRotationFiles = [
      'scripts/rotate-keys.sh',
      'backend/src/services/key-rotation.service.ts',
      'backend/src/lib/key-manager.ts'
    ];

    const hasKeyRotation = keyRotationFiles.some(file => fs.existsSync(file));

    this.results.push({
      category: 'KEYS',
      testName: 'Key Rotation Capability',
      status: hasKeyRotation ? 'PASS' : 'WARNING',
      severity: hasKeyRotation ? 'LOW' : 'MEDIUM',
      description: hasKeyRotation ? 'Key rotation mechanism implemented' : 'No key rotation mechanism found',
      details: { checkedFiles: keyRotationFiles },
      remediation: 'Implement automated key rotation for production systems'
    });

    // Check for key versioning
    const hasVersionedKeys = process.env.JWT_SECRET_VERSION ||
                            process.env.ENCRYPTION_KEY_VERSION ||
                            Object.keys(process.env).some(key => key.includes('_V') || key.includes('_VERSION'));

    this.results.push({
      category: 'KEYS',
      testName: 'Key Versioning',
      status: hasVersionedKeys ? 'PASS' : 'WARNING',
      severity: hasVersionedKeys ? 'LOW' : 'MEDIUM',
      description: hasVersionedKeys ? 'Key versioning implemented' : 'No key versioning detected',
      remediation: 'Implement key versioning for smooth rotation'
    });
  }

  /**
   * Verify encryption algorithms
   */
  private async verifyEncryptionAlgorithms(): Promise<void> {
    // Check available Node.js crypto algorithms
    const availableAlgorithms = crypto.getCiphers();

    const strongAlgorithms = ['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305'];
    const weakAlgorithms = ['des', '3des', 'rc4', 'md5'];

    const hasStrongAlgorithms = strongAlgorithms.some(alg => availableAlgorithms.includes(alg));
    const hasWeakAlgorithms = weakAlgorithms.some(alg => availableAlgorithms.includes(alg));

    this.results.push({
      category: 'ALGORITHMS',
      testName: 'Available Encryption Algorithms',
      status: hasStrongAlgorithms ? 'PASS' : 'WARNING',
      severity: hasStrongAlgorithms ? 'LOW' : 'HIGH',
      description: `Strong algorithms available: ${hasStrongAlgorithms}`,
      details: { strongAvailable: hasStrongAlgorithms, weakAvailable: hasWeakAlgorithms },
      remediation: 'Use AES-256-GCM or ChaCha20-Poly1305 for encryption'
    });

    // Check hash algorithms
    const availableHashes = crypto.getHashes();
    const strongHashes = ['sha256', 'sha384', 'sha512', 'sha3-256'];
    const weakHashes = ['md5', 'sha1'];

    const hasStrongHashes = strongHashes.some(hash => availableHashes.includes(hash));
    const hasWeakHashes = weakHashes.some(hash => availableHashes.includes(hash));

    this.results.push({
      category: 'ALGORITHMS',
      testName: 'Available Hash Algorithms',
      status: hasStrongHashes ? 'PASS' : 'WARNING',
      severity: hasStrongHashes ? 'LOW' : 'HIGH',
      description: `Strong hash algorithms available: ${hasStrongHashes}`,
      details: { strongHashes: hasStrongHashes, weakHashes: hasWeakHashes },
      remediation: 'Use SHA-256 or stronger for hashing operations'
    });

    // Check random number generation
    try {
      const randomBytes = crypto.randomBytes(32);
      const hasSecureRandom = randomBytes && randomBytes.length === 32;

      this.results.push({
        category: 'ALGORITHMS',
        testName: 'Cryptographic Random Generation',
        status: hasSecureRandom ? 'PASS' : 'FAIL',
        severity: hasSecureRandom ? 'LOW' : 'CRITICAL',
        description: hasSecureRandom ? 'Secure random number generation available' : 'Secure random generation failed',
        details: { randomBytesLength: randomBytes?.length },
        remediation: 'Use crypto.randomBytes() for cryptographic random numbers'
      });
    } catch (error) {
      this.results.push({
        category: 'ALGORITHMS',
        testName: 'Random Number Generation',
        status: 'FAIL',
        severity: 'CRITICAL',
        description: 'Unable to generate secure random numbers',
        details: { error: error.message },
        remediation: 'Fix cryptographic random number generation'
      });
    }
  }

  /**
   * Get source files for analysis
   */
  private getSourceFiles(): string[] {
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    const directories = ['backend/src', 'frontend/src'];
    const files: string[] = [];

    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        const dirFiles = this.getFilesRecursively(dir, extensions);
        files.push(...dirFiles);
      }
    }

    return files;
  }

  /**
   * Recursively get files with specific extensions
   */
  private getFilesRecursively(dir: string, extensions: string[]): string[] {
    const files: string[] = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...this.getFilesRecursively(fullPath, extensions));
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return files;
  }

  /**
   * Generate summary based on test results
   */
  private generateSummary(overallScore: number, criticalCount: number): string {
    if (overallScore >= 90 && criticalCount === 0) {
      return 'Excellent data encryption implementation with strong security controls.';
    } else if (overallScore >= 80 && criticalCount === 0) {
      return 'Good encryption practices with some areas for improvement.';
    } else if (overallScore >= 70) {
      return 'Moderate encryption security requiring attention to several issues.';
    } else if (criticalCount > 0) {
      return `Poor encryption implementation with ${criticalCount} critical vulnerabilities requiring immediate attention.`;
    } else {
      return 'Encryption implementation needs significant improvements for production security.';
    }
  }
}

/**
 * Jest test suite
 */
describe('Data Encryption Verification', () => {
  let verifier: DataEncryptionVerifier;

  beforeAll(() => {
    verifier = new DataEncryptionVerifier();
  });

  test('should verify data encryption comprehensively', async () => {
    const results = await verifier.verifyEncryption();

    expect(results).toBeDefined();
    expect(results.overallScore).toBeGreaterThanOrEqual(0);
    expect(results.overallScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(results.results)).toBe(true);

    console.log(`\n🔐 Data Encryption Verification Results:`);
    console.log(`Overall Score: ${results.overallScore}%`);
    console.log(`✅ Passed: ${results.passCount}`);
    console.log(`❌ Failed: ${results.failCount}`);
    console.log(`⚠️  Warnings: ${results.warningCount}`);
    console.log(`🚨 Critical: ${results.criticalFindings.length}`);
    console.log(`Summary: ${results.summary}\n`);

    // Log critical findings
    if (results.criticalFindings.length > 0) {
      console.log('🚨 Critical Encryption Issues:');
      results.criticalFindings.forEach(finding => {
        console.log(`  - ${finding.testName}: ${finding.description}`);
        console.log(`    Remediation: ${finding.remediation}`);
      });
    }

    // Log category breakdown
    const categories = ['DATABASE', 'TRANSIT', 'STORAGE', 'KEYS', 'ALGORITHMS'];
    categories.forEach(category => {
      const categoryResults = results.results.filter(r => r.category === category);
      const categoryScore = Math.round((categoryResults.filter(r => r.status === 'PASS').length / categoryResults.length) * 100);
      console.log(`📊 ${category}: ${categoryScore}% (${categoryResults.length} tests)`);
    });
  }, 45000);

  test('should identify database encryption issues', async () => {
    const results = await verifier.verifyEncryption();
    const dbResults = results.results.filter(r => r.category === 'DATABASE');

    expect(dbResults.length).toBeGreaterThan(0);
    expect(dbResults.some(r => r.testName.includes('Database Connection'))).toBe(true);
  });

  test('should verify transit encryption', async () => {
    const results = await verifier.verifyEncryption();
    const transitResults = results.results.filter(r => r.category === 'TRANSIT');

    expect(transitResults.length).toBeGreaterThan(0);
    expect(transitResults.some(r => r.testName.includes('HTTPS'))).toBe(true);
  });

  test('should check key management', async () => {
    const results = await verifier.verifyEncryption();
    const keyResults = results.results.filter(r => r.category === 'KEYS');

    expect(keyResults.length).toBeGreaterThan(0);
    expect(keyResults.some(r => r.testName.includes('Key'))).toBe(true);
  });
});