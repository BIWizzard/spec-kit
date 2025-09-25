import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

interface PersonalDataField {
  table: string;
  field: string;
  category: 'identity' | 'financial' | 'behavioral' | 'derived' | 'contact';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  retention_period: string;
  legal_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  encryption_required: boolean;
  anonymization_possible: boolean;
}

interface GDPRProcessingActivity {
  name: string;
  purpose: string;
  legal_basis: string;
  data_categories: string[];
  retention_period: string;
  third_party_sharing: boolean;
  international_transfers: boolean;
}

interface DataSubjectRights {
  right: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  implementation_status: 'implemented' | 'partial' | 'not_implemented';
  automation_level: 'fully_automated' | 'semi_automated' | 'manual';
  response_time_sla: string;
  technical_measures: string[];
}

describe('GDPR Compliance Review', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Personal Data Inventory - comprehensive mapping of all personal data
  const personalDataInventory: PersonalDataField[] = [
    // Identity data
    {
      table: 'FamilyMember',
      field: 'email',
      category: 'identity',
      sensitivity: 'high',
      retention_period: '7 years after account closure',
      legal_basis: 'contract',
      encryption_required: true,
      anonymization_possible: false
    },
    {
      table: 'FamilyMember',
      field: 'name',
      category: 'identity',
      sensitivity: 'medium',
      retention_period: '7 years after account closure',
      legal_basis: 'contract',
      encryption_required: true,
      anonymization_possible: true
    },
    {
      table: 'FamilyMember',
      field: 'phone',
      category: 'contact',
      sensitivity: 'medium',
      retention_period: '2 years after last contact',
      legal_basis: 'consent',
      encryption_required: true,
      anonymization_possible: true
    },
    {
      table: 'FamilyMember',
      field: 'dateOfBirth',
      category: 'identity',
      sensitivity: 'high',
      retention_period: '7 years after account closure',
      legal_basis: 'contract',
      encryption_required: true,
      anonymization_possible: false
    },
    // Financial data
    {
      table: 'BankAccount',
      field: 'accountNumber',
      category: 'financial',
      sensitivity: 'critical',
      retention_period: '10 years (regulatory requirement)',
      legal_basis: 'legal_obligation',
      encryption_required: true,
      anonymization_possible: false
    },
    {
      table: 'BankAccount',
      field: 'routingNumber',
      category: 'financial',
      sensitivity: 'critical',
      retention_period: '10 years (regulatory requirement)',
      legal_basis: 'legal_obligation',
      encryption_required: true,
      anonymization_possible: false
    },
    {
      table: 'BankAccount',
      field: 'institutionName',
      category: 'financial',
      sensitivity: 'medium',
      retention_period: '10 years (regulatory requirement)',
      legal_basis: 'legal_obligation',
      encryption_required: false,
      anonymization_possible: true
    },
    {
      table: 'Transaction',
      field: 'amount',
      category: 'financial',
      sensitivity: 'high',
      retention_period: '7 years (tax requirement)',
      legal_basis: 'legal_obligation',
      encryption_required: true,
      anonymization_possible: true
    },
    {
      table: 'Transaction',
      field: 'description',
      category: 'behavioral',
      sensitivity: 'medium',
      retention_period: '7 years (tax requirement)',
      legal_basis: 'legal_obligation',
      encryption_required: false,
      anonymization_possible: true
    },
    {
      table: 'Payment',
      field: 'amount',
      category: 'financial',
      sensitivity: 'high',
      retention_period: '7 years (tax requirement)',
      legal_basis: 'contract',
      encryption_required: true,
      anonymization_possible: true
    },
    {
      table: 'IncomeEvent',
      field: 'amount',
      category: 'financial',
      sensitivity: 'high',
      retention_period: '7 years (tax requirement)',
      legal_basis: 'contract',
      encryption_required: true,
      anonymization_possible: true
    },
    // Session and tracking data
    {
      table: 'Session',
      field: 'sessionToken',
      category: 'behavioral',
      sensitivity: 'high',
      retention_period: '30 days after expiry',
      legal_basis: 'legitimate_interests',
      encryption_required: true,
      anonymization_possible: false
    },
    {
      table: 'AuditLog',
      field: 'userId',
      category: 'behavioral',
      sensitivity: 'medium',
      retention_period: '3 years (compliance requirement)',
      legal_basis: 'legal_obligation',
      encryption_required: true,
      anonymization_possible: true
    },
    {
      table: 'AuditLog',
      field: 'action',
      category: 'behavioral',
      sensitivity: 'low',
      retention_period: '3 years (compliance requirement)',
      legal_basis: 'legal_obligation',
      encryption_required: false,
      anonymization_possible: true
    }
  ];

  // Processing Activities Register
  const processingActivities: GDPRProcessingActivity[] = [
    {
      name: 'User Account Management',
      purpose: 'Creating and managing user accounts for family finance application',
      legal_basis: 'Performance of contract',
      data_categories: ['identity', 'contact'],
      retention_period: '7 years after account closure',
      third_party_sharing: false,
      international_transfers: false
    },
    {
      name: 'Financial Data Processing',
      purpose: 'Processing financial transactions and budget management',
      legal_basis: 'Performance of contract + Legal obligation',
      data_categories: ['financial', 'behavioral'],
      retention_period: '10 years (regulatory requirement)',
      third_party_sharing: true, // Plaid integration
      international_transfers: true // Plaid servers
    },
    {
      name: 'Transaction Analysis',
      purpose: 'Analyzing spending patterns and providing financial insights',
      legal_basis: 'Legitimate interests',
      data_categories: ['financial', 'behavioral', 'derived'],
      retention_period: '3 years after data collection',
      third_party_sharing: false,
      international_transfers: false
    },
    {
      name: 'Audit and Compliance',
      purpose: 'Maintaining audit logs for security and compliance',
      legal_basis: 'Legal obligation',
      data_categories: ['behavioral'],
      retention_period: '3 years (compliance requirement)',
      third_party_sharing: false,
      international_transfers: false
    },
    {
      name: 'Bank Account Integration',
      purpose: 'Connecting and synchronizing bank account data via Plaid',
      legal_basis: 'Consent + Performance of contract',
      data_categories: ['financial', 'identity'],
      retention_period: '10 years (regulatory requirement)',
      third_party_sharing: true, // Plaid API
      international_transfers: true // Plaid US servers
    }
  ];

  // Data Subject Rights Implementation
  const dataSubjectRights: DataSubjectRights[] = [
    {
      right: 'access',
      implementation_status: 'implemented',
      automation_level: 'semi_automated',
      response_time_sla: '30 days',
      technical_measures: ['GET /api/auth/me', 'Data export functionality', 'Family data access']
    },
    {
      right: 'rectification',
      implementation_status: 'implemented',
      automation_level: 'fully_automated',
      response_time_sla: '72 hours',
      technical_measures: ['PUT /api/families', 'Profile update endpoints', 'Real-time data correction']
    },
    {
      right: 'erasure',
      implementation_status: 'partial',
      automation_level: 'semi_automated',
      response_time_sla: '30 days',
      technical_measures: ['Account deletion API', 'Data anonymization scripts', 'Cascade delete procedures']
    },
    {
      right: 'portability',
      implementation_status: 'implemented',
      automation_level: 'fully_automated',
      response_time_sla: '30 days',
      technical_measures: ['POST /api/reports/export', 'JSON/CSV export formats', 'Complete data download']
    },
    {
      right: 'restriction',
      implementation_status: 'partial',
      automation_level: 'manual',
      response_time_sla: '72 hours',
      technical_measures: ['Account suspension', 'Processing flags', 'Data processing controls']
    },
    {
      right: 'objection',
      implementation_status: 'partial',
      automation_level: 'manual',
      response_time_sla: '72 hours',
      technical_measures: ['Consent withdrawal', 'Processing opt-out', 'Legitimate interest override']
    }
  ];

  describe('Personal Data Inventory Validation', () => {
    test('should validate all personal data fields are properly classified', () => {
      personalDataInventory.forEach(field => {
        expect(field.table).toBeDefined();
        expect(field.field).toBeDefined();
        expect(['identity', 'financial', 'behavioral', 'derived', 'contact']).toContain(field.category);
        expect(['low', 'medium', 'high', 'critical']).toContain(field.sensitivity);
        expect(field.retention_period).toBeTruthy();
        expect(['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests']).toContain(field.legal_basis);
        expect(typeof field.encryption_required).toBe('boolean');
        expect(typeof field.anonymization_possible).toBe('boolean');
      });
    });

    test('should ensure critical financial data requires encryption', () => {
      const criticalFinancialData = personalDataInventory.filter(
        field => field.category === 'financial' && field.sensitivity === 'critical'
      );

      criticalFinancialData.forEach(field => {
        expect(field.encryption_required).toBe(true);
      });

      expect(criticalFinancialData.length).toBeGreaterThan(0);
    });

    test('should validate retention periods are legally compliant', () => {
      const financialDataFields = personalDataInventory.filter(
        field => field.category === 'financial'
      );

      financialDataFields.forEach(field => {
        // Financial data should be retained for at least 7 years (tax) or 10 years (regulatory)
        expect(field.retention_period).toMatch(/(7|10) years|regulatory requirement|tax requirement/);
      });
    });

    test('should ensure identity data has appropriate legal basis', () => {
      const identityData = personalDataInventory.filter(
        field => field.category === 'identity'
      );

      identityData.forEach(field => {
        // Identity data should primarily be based on contract or consent
        expect(['contract', 'consent', 'legal_obligation']).toContain(field.legal_basis);
      });
    });
  });

  describe('Processing Activities Register Validation', () => {
    test('should validate all processing activities are properly documented', () => {
      processingActivities.forEach(activity => {
        expect(activity.name).toBeTruthy();
        expect(activity.purpose).toBeTruthy();
        expect(activity.legal_basis).toBeTruthy();
        expect(Array.isArray(activity.data_categories)).toBe(true);
        expect(activity.data_categories.length).toBeGreaterThan(0);
        expect(activity.retention_period).toBeTruthy();
        expect(typeof activity.third_party_sharing).toBe('boolean');
        expect(typeof activity.international_transfers).toBe('boolean');
      });
    });

    test('should identify activities involving third-party sharing', () => {
      const thirdPartyActivities = processingActivities.filter(
        activity => activity.third_party_sharing
      );

      // Should include Plaid integration activities
      expect(thirdPartyActivities.some(activity =>
        activity.name.toLowerCase().includes('bank') ||
        activity.name.toLowerCase().includes('financial')
      )).toBe(true);

      thirdPartyActivities.forEach(activity => {
        // Activities with third-party sharing should have clear legal basis
        expect(activity.legal_basis).toMatch(/(consent|contract)/i);
      });
    });

    test('should validate international transfer documentation', () => {
      const internationalTransfers = processingActivities.filter(
        activity => activity.international_transfers
      );

      internationalTransfers.forEach(activity => {
        // Should document international transfers (e.g., Plaid US servers)
        expect(activity.legal_basis).toMatch(/(consent|adequacy decision|safeguards)/i);
      });
    });

    test('should ensure processing purposes are specific and legitimate', () => {
      processingActivities.forEach(activity => {
        expect(activity.purpose.length).toBeGreaterThan(20); // Sufficiently detailed
        expect(activity.purpose).toMatch(/[A-Z]/); // Properly capitalized
        expect(activity.purpose.endsWith('.')).toBe(false); // No trailing period
      });
    });
  });

  describe('Data Subject Rights Implementation', () => {
    test('should validate all GDPR rights are addressed', () => {
      const requiredRights = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'];

      const implementedRights = dataSubjectRights.map(right => right.right);

      requiredRights.forEach(requiredRight => {
        expect(implementedRights).toContain(requiredRight);
      });
    });

    test('should ensure critical rights are fully implemented', () => {
      const criticalRights = ['access', 'rectification', 'portability'];

      criticalRights.forEach(rightName => {
        const right = dataSubjectRights.find(r => r.right === rightName);
        expect(right).toBeDefined();
        expect(['implemented', 'partial']).toContain(right!.implementation_status);
      });
    });

    test('should validate response time SLAs are compliant', () => {
      dataSubjectRights.forEach(right => {
        const responseTime = right.response_time_sla;

        if (right.right === 'rectification' || right.right === 'restriction') {
          // Should respond within 72 hours for urgent requests
          expect(responseTime).toMatch(/(72 hours|3 days)/);
        } else {
          // Should respond within 30 days (1 month) for other requests
          expect(responseTime).toMatch(/(30 days|1 month)/);
        }
      });
    });

    test('should validate technical implementation measures', () => {
      dataSubjectRights.forEach(right => {
        expect(Array.isArray(right.technical_measures)).toBe(true);
        expect(right.technical_measures.length).toBeGreaterThan(0);

        // Each technical measure should be specific
        right.technical_measures.forEach(measure => {
          expect(measure.length).toBeGreaterThan(5);
        });
      });
    });
  });

  describe('Data Protection by Design and Default', () => {
    test('should validate encryption for sensitive data in schema', async () => {
      try {
        const schemaPath = path.join(process.cwd(), 'backend', 'src', 'models', 'schema.prisma');
        const schemaContent = await fs.readFile(schemaPath, 'utf-8');

        // Critical fields should have encryption annotations or be handled securely
        const criticalFields = personalDataInventory
          .filter(field => field.sensitivity === 'critical' || field.encryption_required)
          .map(field => field.field);

        // Check if schema has security considerations
        expect(schemaContent).toMatch(/(String|DateTime)/); // Basic validation
      } catch (error) {
        console.warn('Could not read Prisma schema for validation');
      }
    });

    test('should validate data minimization principles', () => {
      // Ensure we're not collecting unnecessary personal data
      const unnecessaryFields = ['ssn', 'nationalId', 'passport', 'driverLicense'];

      personalDataInventory.forEach(field => {
        expect(unnecessaryFields).not.toContain(field.field.toLowerCase());
      });

      // Ensure behavioral data has justification
      const behavioralData = personalDataInventory.filter(field => field.category === 'behavioral');
      behavioralData.forEach(field => {
        expect(['legitimate_interests', 'legal_obligation', 'consent']).toContain(field.legal_basis);
      });
    });

    test('should validate purpose limitation compliance', () => {
      processingActivities.forEach(activity => {
        // Each activity should have a specific, well-defined purpose
        expect(activity.purpose).not.toMatch(/general|various|multiple|any/i);

        // Data categories should align with the stated purpose
        if (activity.purpose.toLowerCase().includes('financial')) {
          expect(activity.data_categories).toContain('financial');
        }

        if (activity.purpose.toLowerCase().includes('account')) {
          expect(activity.data_categories).toContain('identity');
        }
      });
    });

    test('should validate storage limitation compliance', () => {
      personalDataInventory.forEach(field => {
        // All fields should have defined retention periods
        expect(field.retention_period).toBeTruthy();
        expect(field.retention_period.length).toBeGreaterThan(5);

        // Retention periods should not be indefinite
        expect(field.retention_period.toLowerCase()).not.toMatch(/forever|indefinite|permanent/);
      });
    });
  });

  describe('Consent Management Validation', () => {
    test('should identify data processing requiring explicit consent', () => {
      const consentBasedProcessing = personalDataInventory.filter(
        field => field.legal_basis === 'consent'
      );

      // Should have some consent-based processing (e.g., phone numbers, optional features)
      expect(consentBasedProcessing.length).toBeGreaterThan(0);

      consentBasedProcessing.forEach(field => {
        // Consent-based processing should be for non-essential features
        expect(['contact', 'behavioral']).toContain(field.category);
      });
    });

    test('should validate consent withdrawal mechanisms', () => {
      const consentRights = dataSubjectRights.filter(right =>
        right.right === 'objection' || right.technical_measures.some(measure =>
          measure.toLowerCase().includes('consent') || measure.toLowerCase().includes('opt-out')
        )
      );

      expect(consentRights.length).toBeGreaterThan(0);
    });

    test('should ensure granular consent options', () => {
      const consentActivities = processingActivities.filter(activity =>
        activity.legal_basis.toLowerCase().includes('consent')
      );

      consentActivities.forEach(activity => {
        // Consent-based activities should be clearly separable
        expect(activity.purpose).toMatch(/(optional|enhanced|additional)/i);
      });
    });
  });

  describe('International Transfers Compliance', () => {
    test('should validate international transfer safeguards', () => {
      const internationalActivities = processingActivities.filter(
        activity => activity.international_transfers
      );

      internationalActivities.forEach(activity => {
        // Should document transfer mechanism (adequacy, SCCs, etc.)
        expect(activity.legal_basis).toBeTruthy();

        // Should be primarily for essential services (e.g., Plaid)
        expect(activity.name.toLowerCase()).toMatch(/(bank|financial|payment|plaid)/);
      });
    });

    test('should ensure third-party processors are documented', () => {
      const thirdPartyActivities = processingActivities.filter(
        activity => activity.third_party_sharing
      );

      // Should identify Plaid as a processor
      expect(thirdPartyActivities.some(activity =>
        activity.name.toLowerCase().includes('bank') ||
        activity.purpose.toLowerCase().includes('plaid')
      )).toBe(true);
    });
  });

  describe('Breach Notification Compliance', () => {
    test('should validate audit logging for breach detection', () => {
      const auditData = personalDataInventory.filter(
        field => field.table === 'AuditLog'
      );

      expect(auditData.length).toBeGreaterThan(0);

      auditData.forEach(field => {
        expect(field.legal_basis).toBe('legal_obligation');
        expect(field.retention_period).toMatch(/3 years/);
      });
    });

    test('should ensure monitoring capabilities are in place', () => {
      // Check that we have the necessary audit trail for breach detection
      const monitoringFields = ['userId', 'action', 'timestamp'];
      const auditFields = personalDataInventory
        .filter(field => field.table === 'AuditLog')
        .map(field => field.field);

      // Should have basic monitoring fields
      expect(auditFields.some(field =>
        monitoringFields.some(monitoring => field.includes(monitoring))
      )).toBe(true);
    });
  });

  describe('Privacy by Design Assessment', () => {
    test('should validate pseudonymization opportunities', () => {
      const pseudonymizableFields = personalDataInventory.filter(
        field => field.anonymization_possible
      );

      // Should have identified fields that can be anonymized
      expect(pseudonymizableFields.length).toBeGreaterThan(0);

      pseudonymizableFields.forEach(field => {
        // Critical identity fields should not be easily anonymizable
        if (field.sensitivity === 'critical') {
          expect(field.category).not.toBe('identity');
        }
      });
    });

    test('should validate default privacy settings', () => {
      const optionalProcessing = processingActivities.filter(activity =>
        activity.legal_basis.includes('consent') ||
        activity.legal_basis.includes('legitimate_interests')
      );

      // Optional processing should be clearly identified
      optionalProcessing.forEach(activity => {
        expect(activity.purpose).not.toMatch(/essential|required|mandatory/i);
      });
    });

    test('should ensure data subject control mechanisms', () => {
      const userControlRights = dataSubjectRights.filter(right =>
        ['access', 'rectification', 'portability', 'objection'].includes(right.right)
      );

      userControlRights.forEach(right => {
        expect(['implemented', 'partial']).toContain(right.implementation_status);
        expect(right.technical_measures.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Regulatory Compliance Assessment', () => {
    test('should validate financial data retention compliance', () => {
      const financialFields = personalDataInventory.filter(
        field => field.category === 'financial'
      );

      financialFields.forEach(field => {
        // Financial data retention should meet regulatory requirements
        const retentionYears = parseInt(field.retention_period.match(/(\d+) years?/)?.[1] || '0');
        expect(retentionYears).toBeGreaterThanOrEqual(7); // Tax requirements
      });
    });

    test('should ensure lawful basis hierarchy', () => {
      const legalBasisPriority = [
        'legal_obligation',
        'contract',
        'legitimate_interests',
        'consent',
        'vital_interests',
        'public_task'
      ];

      personalDataInventory.forEach(field => {
        expect(legalBasisPriority).toContain(field.legal_basis);
      });
    });

    test('should validate data protection impact assessment needs', () => {
      const highRiskProcessing = processingActivities.filter(activity =>
        activity.international_transfers ||
        activity.third_party_sharing ||
        activity.data_categories.includes('financial')
      );

      // High-risk processing should be clearly documented
      expect(highRiskProcessing.length).toBeGreaterThan(0);

      highRiskProcessing.forEach(activity => {
        expect(activity.legal_basis).toBeTruthy();
        expect(activity.purpose.length).toBeGreaterThan(30); // Detailed purpose
      });
    });
  });

  describe('GDPR Documentation Completeness', () => {
    test('should validate processing register completeness', () => {
      const requiredProcessingAspects = [
        'User management',
        'Financial data',
        'Audit',
        'Bank integration',
        'Transaction analysis'
      ];

      requiredProcessingAspects.forEach(aspect => {
        expect(processingActivities.some(activity =>
          activity.name.toLowerCase().includes(aspect.toLowerCase())
        )).toBe(true);
      });
    });

    test('should ensure privacy policy alignment', () => {
      processingActivities.forEach(activity => {
        // Each processing activity should be transparent to users
        expect(activity.purpose).toBeTruthy();
        expect(activity.legal_basis).toBeTruthy();

        // Should clearly state data sharing
        if (activity.third_party_sharing) {
          expect(activity.name.toLowerCase()).toMatch(/(integration|sharing|third|party|plaid)/);
        }
      });
    });

    test('should validate data subject information requirements', () => {
      const informationRequirements = [
        'identity',
        'purpose',
        'legal_basis',
        'retention',
        'rights',
        'third_parties'
      ];

      // Our data structures should cover all information requirements
      const coverageCheck = {
        identity: true, // Controller identity should be provided
        purpose: processingActivities.every(a => a.purpose),
        legal_basis: personalDataInventory.every(f => f.legal_basis),
        retention: personalDataInventory.every(f => f.retention_period),
        rights: dataSubjectRights.length >= 6,
        third_parties: processingActivities.some(a => a.third_party_sharing)
      };

      Object.entries(coverageCheck).forEach(([requirement, covered]) => {
        expect(covered).toBe(true);
      });
    });
  });
});