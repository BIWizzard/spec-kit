import { ValidationService } from '../../backend/src/services/validation.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('ValidationService', () => {
  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const result = ValidationService.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        ' ',
        'not-an-email',
        '@example.com',
        'test@',
        'test @example.com',
        'test@example',
      ];

      invalidEmails.forEach(email => {
        const result = ValidationService.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject emails longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      const result = ValidationService.validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must be less than 255 characters');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = ValidationService.validatePassword('SecurePass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require minimum length of 12 characters', () => {
      const result = ValidationService.validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should require at least one lowercase letter', () => {
      const result = ValidationService.validatePassword('UPPERCASE123!ABC');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require at least one uppercase letter', () => {
      const result = ValidationService.validatePassword('lowercase123!abc');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require at least one number', () => {
      const result = ValidationService.validatePassword('NoNumbersHere!ABC');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should warn about missing special characters', () => {
      const result = ValidationService.validatePassword('SecurePassword123');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Password should contain at least one special character for better security');
    });

    it('should reject passwords longer than 128 characters', () => {
      const longPassword = 'Aa1!' + 'x'.repeat(125);
      const result = ValidationService.validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct US phone number formats', () => {
      const validPhones = [
        '(555) 123-4567',
        '555-123-4567',
        '5551234567',
        '+1 (555) 123-4567',
        '+15551234567',
        '1-555-123-4567',
      ];

      validPhones.forEach(phone => {
        const result = ValidationService.validatePhoneNumber(phone);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid phone number formats', () => {
      const invalidPhones = [
        '123',
        'not-a-phone',
        '(555) 123-456',
        '555-1234-5678',
        '123-456-7890-1234',
      ];

      invalidPhones.forEach(phone => {
        const result = ValidationService.validatePhoneNumber(phone);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should allow empty phone numbers', () => {
      const result = ValidationService.validatePhoneNumber('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateCurrencyAmount', () => {
    it('should validate valid currency amounts', () => {
      const validAmounts = [0, 0.01, 1, 100, 1000.50, 999999999.99];

      validAmounts.forEach(amount => {
        const result = ValidationService.validateCurrencyAmount(amount);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should validate Decimal type amounts', () => {
      const decimalAmount = new Decimal(123.45);
      const result = ValidationService.validateCurrencyAmount(decimalAmount);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate string amounts', () => {
      const result = ValidationService.validateCurrencyAmount('123.45');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative amounts', () => {
      const result = ValidationService.validateCurrencyAmount(-10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount cannot be negative');
    });

    it('should reject amounts exceeding maximum', () => {
      const result = ValidationService.validateCurrencyAmount(1000000000);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount cannot exceed $999,999,999.99');
    });

    it('should reject amounts with more than 2 decimal places', () => {
      const result = ValidationService.validateCurrencyAmount(10.999);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount cannot have more than 2 decimal places');
    });

    it('should reject invalid number strings', () => {
      const result = ValidationService.validateCurrencyAmount('not-a-number');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be a valid number');
    });

    it('should use custom field name in error messages', () => {
      const result = ValidationService.validateCurrencyAmount(-10, 'Payment amount');
      expect(result.errors).toContain('Payment amount cannot be negative');
    });
  });

  describe('validatePercentage', () => {
    it('should validate valid percentages', () => {
      const validPercentages = [0, 0.5, 50, 99.99, 100];

      validPercentages.forEach(percentage => {
        const result = ValidationService.validatePercentage(percentage);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject negative percentages', () => {
      const result = ValidationService.validatePercentage(-10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Percentage cannot be negative');
    });

    it('should reject percentages over 100', () => {
      const result = ValidationService.validatePercentage(101);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Percentage cannot exceed 100%');
    });

    it('should validate Decimal type percentages', () => {
      const decimalPercentage = new Decimal(75.5);
      const result = ValidationService.validatePercentage(decimalPercentage);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should use custom field name in error messages', () => {
      const result = ValidationService.validatePercentage(150, 'Discount rate');
      expect(result.errors).toContain('Discount rate cannot exceed 100%');
    });
  });

  describe('validateDate', () => {
    it('should validate valid dates', () => {
      const validDates = [
        new Date(),
        new Date('2024-01-01'),
        '2024-12-31',
        new Date().toISOString(),
      ];

      validDates.forEach(date => {
        const result = ValidationService.validateDate(date);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid date strings', () => {
      const result = ValidationService.validateDate('not-a-date');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date must be a valid date');
    });

    it('should reject dates before 1900', () => {
      const result = ValidationService.validateDate('1899-12-31');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date cannot be before January 1, 1900');
    });

    it('should reject dates more than 50 years in future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 51);
      const result = ValidationService.validateDate(futureDate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date cannot be more than 50 years in the future');
    });

    it('should respect allowFuture parameter', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const resultAllowed = ValidationService.validateDate(futureDate, 'Date', true);
      expect(resultAllowed.isValid).toBe(true);

      const resultNotAllowed = ValidationService.validateDate(futureDate, 'Date', false);
      expect(resultNotAllowed.isValid).toBe(false);
      expect(resultNotAllowed.errors).toContain('Date cannot be in the future');
    });

    it('should use custom field name in error messages', () => {
      const result = ValidationService.validateDate('invalid', 'Birth date');
      expect(result.errors).toContain('Birth date must be a valid date');
    });
  });

  describe('validateStringLength', () => {
    it('should validate strings within length limits', () => {
      const result = ValidationService.validateStringLength('test', 'Field', 1, 10);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject strings shorter than minimum', () => {
      const result = ValidationService.validateStringLength('ab', 'Field', 3, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field must be at least 3 characters long');
    });

    it('should reject strings longer than maximum', () => {
      const result = ValidationService.validateStringLength('toolongstring', 'Field', 1, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field must be less than 10 characters');
    });

    it('should handle required vs optional fields', () => {
      const requiredResult = ValidationService.validateStringLength('', 'Field', 1, 10, true);
      expect(requiredResult.isValid).toBe(false);
      expect(requiredResult.errors).toContain('Field is required');

      const optionalResult = ValidationService.validateStringLength('', 'Field', 1, 10, false);
      expect(optionalResult.isValid).toBe(true);
      expect(optionalResult.errors).toHaveLength(0);
    });

    it('should trim whitespace when checking empty strings', () => {
      const result = ValidationService.validateStringLength('   ', 'Field', 1, 10, true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });
  });

  describe('validatePaymentAttributions', () => {
    it('should validate valid payment attributions', () => {
      const attributions = [
        {
          paymentId: 'payment1',
          incomeEventId: 'income1',
          amount: 50,
          paymentAmount: 100,
          currentTotalAttributed: 50,
        },
        {
          paymentId: 'payment1',
          incomeEventId: 'income2',
          amount: 50,
          paymentAmount: 100,
          currentTotalAttributed: 100,
        },
      ];

      const results = ValidationService.validatePaymentAttributions(attributions);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject attributions with zero or negative amounts', () => {
      const attributions = [
        {
          paymentId: 'payment1',
          incomeEventId: 'income1',
          amount: 0,
          paymentAmount: 100,
          currentTotalAttributed: 0,
        },
      ];

      const results = ValidationService.validatePaymentAttributions(attributions);
      expect(results[0].isValid).toBe(false);
      expect(results[0].errors).toContain('Attribution amount must be greater than 0');
    });

    it('should reject over-attribution', () => {
      const attributions = [
        {
          paymentId: 'payment1',
          incomeEventId: 'income1',
          amount: 60,
          paymentAmount: 100,
          currentTotalAttributed: 60,
        },
        {
          paymentId: 'payment1',
          incomeEventId: 'income2',
          amount: 50,
          paymentAmount: 100,
          currentTotalAttributed: 110,
        },
      ];

      const results = ValidationService.validatePaymentAttributions(attributions);
      results.forEach(result => {
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Total attributed amount (110) exceeds payment amount (100)');
      });
    });
  });

  describe('validateBudgetAllocations', () => {
    it('should validate valid budget allocations', () => {
      const result = ValidationService.validateBudgetAllocations(
        'income1',
        1000,
        [
          { budgetCategoryId: 'cat1', amount: 500, percentage: 50 },
          { budgetCategoryId: 'cat2', amount: 300, percentage: 30 },
          { budgetCategoryId: 'cat3', amount: 200, percentage: 20 },
        ]
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject allocations not summing to 100%', () => {
      const result = ValidationService.validateBudgetAllocations(
        'income1',
        1000,
        [
          { budgetCategoryId: 'cat1', amount: 500, percentage: 50 },
          { budgetCategoryId: 'cat2', amount: 300, percentage: 30 },
        ]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/Budget percentages must sum to 100%/);
    });

    it('should reject allocations with mismatched amounts', () => {
      const result = ValidationService.validateBudgetAllocations(
        'income1',
        1000,
        [
          { budgetCategoryId: 'cat1', amount: 600, percentage: 50 },
          { budgetCategoryId: 'cat2', amount: 300, percentage: 30 },
          { budgetCategoryId: 'cat3', amount: 200, percentage: 20 },
        ]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Budget allocation amounts (1100) must equal income amount (1000)');
    });

    it('should reject invalid individual percentages', () => {
      const result = ValidationService.validateBudgetAllocations(
        'income1',
        1000,
        [
          { budgetCategoryId: 'cat1', amount: 1200, percentage: 120 },
          { budgetCategoryId: 'cat2', amount: -200, percentage: -20 },
        ]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('percentage must be between 0 and 100'))).toBe(true);
    });

    it('should validate percentage matches amount calculation', () => {
      const result = ValidationService.validateBudgetAllocations(
        'income1',
        1000,
        [
          { budgetCategoryId: 'cat1', amount: 600, percentage: 50 },
          { budgetCategoryId: 'cat2', amount: 400, percentage: 50 },
        ]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("amount (600) doesn't match percentage"))).toBe(true);
    });
  });

  describe('validateFamilySettings', () => {
    it('should validate valid family settings', () => {
      const result = ValidationService.validateFamilySettings({
        timezone: 'America/New_York',
        currency: 'USD',
        fiscalYearStart: 1,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid timezone', () => {
      const result = ValidationService.validateFamilySettings({
        timezone: 'Invalid/Timezone',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid timezone');
    });

    it('should reject invalid currency codes', () => {
      const result = ValidationService.validateFamilySettings({
        currency: 'XXX',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/Currency must be one of:/);
    });

    it('should reject invalid fiscal year start', () => {
      const invalidStarts = [0, 13, -1];

      invalidStarts.forEach(start => {
        const result = ValidationService.validateFamilySettings({
          fiscalYearStart: start,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Fiscal year start must be a month number between 1 and 12');
      });
    });
  });

  describe('validateMultiple', () => {
    it('should combine multiple validation results', () => {
      const validation1 = {
        isValid: false,
        errors: ['Error 1'],
        warnings: ['Warning 1'],
      };

      const validation2 = {
        isValid: false,
        errors: ['Error 2'],
      };

      const validation3 = {
        isValid: true,
        errors: [],
        warnings: ['Warning 2'],
      };

      const result = ValidationService.validateMultiple(validation1, validation2, validation3);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Error 1', 'Error 2']);
      expect(result.warnings).toEqual(['Warning 1', 'Warning 2']);
    });

    it('should return valid when all validations pass', () => {
      const validation1 = { isValid: true, errors: [] };
      const validation2 = { isValid: true, errors: [] };

      const result = ValidationService.validateMultiple(validation1, validation2);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('validateIncomeEvent', () => {
    it('should validate valid income event', () => {
      const result = ValidationService.validateIncomeEvent({
        name: 'Monthly Salary',
        amount: 5000,
        scheduledDate: new Date(),
        frequency: 'monthly',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid frequency', () => {
      const result = ValidationService.validateIncomeEvent({
        name: 'Test Income',
        amount: 1000,
        scheduledDate: new Date(),
        frequency: 'invalid',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid frequency'))).toBe(true);
    });

    it('should validate all fields', () => {
      const result = ValidationService.validateIncomeEvent({
        name: '',
        amount: -100,
        scheduledDate: 'invalid-date',
        frequency: 'monthly',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('validatePayment', () => {
    it('should validate valid payment', () => {
      const result = ValidationService.validatePayment({
        payee: 'Electric Company',
        amount: 150,
        dueDate: new Date(),
        paymentType: 'recurring',
        frequency: 'monthly',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid payment type', () => {
      const result = ValidationService.validatePayment({
        payee: 'Test Payee',
        amount: 100,
        dueDate: new Date(),
        paymentType: 'invalid',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid payment type'))).toBe(true);
    });

    it('should validate all required fields', () => {
      const result = ValidationService.validatePayment({
        payee: '',
        amount: -50,
        dueDate: 'not-a-date',
        paymentType: 'once',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('Authentication validation methods', () => {
    describe('validateRegistration', () => {
      it('should validate valid registration data', () => {
        const errors = ValidationService.validateRegistration({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          familyName: 'Doe Family',
          timezone: 'America/New_York',
          currency: 'USD',
        });

        expect(errors).toHaveLength(0);
      });

      it('should validate all fields', () => {
        const errors = ValidationService.validateRegistration({
          email: 'invalid-email',
          password: 'short',
          firstName: '',
          lastName: '',
          familyName: '',
          currency: 'INVALID',
        });

        expect(errors.length).toBeGreaterThan(5);
      });
    });

    describe('validateLogin', () => {
      it('should validate valid login data', () => {
        const errors = ValidationService.validateLogin({
          email: 'test@example.com',
          password: 'password123',
        });

        expect(errors).toHaveLength(0);
      });

      it('should validate login with TOTP', () => {
        const errors = ValidationService.validateLogin({
          email: 'test@example.com',
          password: 'password123',
          totpCode: '123456',
        });

        expect(errors).toHaveLength(0);
      });

      it('should reject invalid TOTP code', () => {
        const errors = ValidationService.validateLogin({
          email: 'test@example.com',
          password: 'password123',
          totpCode: 'abcdef',
        });

        expect(errors.some(e => e.includes('TOTP code must be 6 digits'))).toBe(true);
      });
    });

    describe('validateChangePassword', () => {
      it('should validate valid password change', () => {
        const errors = ValidationService.validateChangePassword({
          currentPassword: 'OldPass123!',
          newPassword: 'NewSecurePass456!',
        });

        expect(errors).toHaveLength(0);
      });

      it('should reject same password', () => {
        const errors = ValidationService.validateChangePassword({
          currentPassword: 'SamePass123!',
          newPassword: 'SamePass123!',
        });

        expect(errors.some(e => e.includes('must be different'))).toBe(true);
      });
    });

    describe('validateInviteFamilyMember', () => {
      it('should validate valid invitation', () => {
        const errors = ValidationService.validateInviteFamilyMember({
          email: 'newmember@example.com',
          role: 'editor',
          permissions: {
            canManageBankAccounts: false,
            canEditPayments: true,
            canViewReports: true,
            canManageFamily: false,
          },
        });

        expect(errors).toHaveLength(0);
      });

      it('should reject invalid role', () => {
        const errors = ValidationService.validateInviteFamilyMember({
          email: 'test@example.com',
          role: 'superadmin' as any,
        });

        expect(errors.some(e => e.includes('Role must be one of'))).toBe(true);
      });
    });

    describe('validateCreateIncomeEvent', () => {
      it('should validate valid income event creation', () => {
        const errors = ValidationService.validateCreateIncomeEvent({
          sourceId: 'source123',
          amount: 1000,
          receivedDate: '2024-01-15',
          description: 'Bonus payment',
        });

        expect(errors).toHaveLength(0);
      });

      it('should reject invalid date format', () => {
        const errors = ValidationService.validateCreateIncomeEvent({
          sourceId: 'source123',
          amount: 1000,
          receivedDate: '01/15/2024',
        });

        expect(errors.some(e => e.includes('YYYY-MM-DD format'))).toBe(true);
      });

      it('should reject negative amounts', () => {
        const errors = ValidationService.validateCreateIncomeEvent({
          sourceId: 'source123',
          amount: -100,
          receivedDate: '2024-01-15',
        });

        expect(errors.some(e => e.includes('must be a positive number'))).toBe(true);
      });

      it('should validate description length', () => {
        const errors = ValidationService.validateCreateIncomeEvent({
          sourceId: 'source123',
          amount: 1000,
          receivedDate: '2024-01-15',
          description: 'a'.repeat(501),
        });

        expect(errors.some(e => e.includes('cannot exceed 500 characters'))).toBe(true);
      });
    });
  });
});