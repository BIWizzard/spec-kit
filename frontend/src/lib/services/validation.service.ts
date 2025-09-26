import { Decimal } from '@prisma/client/runtime/library';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface PaymentAttributionValidation {
  paymentId: string;
  incomeEventId: string;
  amount: number;
  totalAttributed: number;
  paymentAmount: number;
  isValid: boolean;
  errors: string[];
}

export interface BudgetAllocationValidation {
  incomeEventId: string;
  allocations: Array<{
    budgetCategoryId: string;
    amount: number;
    percentage: number;
  }>;
  totalPercentage: number;
  totalAmount: number;
  incomeAmount: number;
  isValid: boolean;
  errors: string[];
}

export class ValidationService {
  // Email validation
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      }
      if (email.length > 255) {
        errors.push('Email must be less than 255 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Password validation
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!password || password.length === 0) {
      errors.push('Password is required');
    } else {
      if (password.length < 12) {
        errors.push('Password must be at least 12 characters long');
      }
      if (password.length > 128) {
        errors.push('Password must be less than 128 characters');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        warnings.push('Password should contain at least one special character for better security');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Phone number validation (US format)
  static validatePhoneNumber(phone: string): ValidationResult {
    const errors: string[] = [];

    if (phone && phone.trim().length > 0) {
      const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
      if (!phoneRegex.test(phone)) {
        errors.push('Invalid phone number format. Use format: (555) 123-4567');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Currency amount validation
  static validateCurrencyAmount(amount: number | string | Decimal, fieldName: string = 'Amount'): ValidationResult {
    const errors: string[] = [];

    if (amount === null || amount === undefined) {
      errors.push(`${fieldName} is required`);
    } else {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) :
                        amount instanceof Decimal ? amount.toNumber() : amount;

      if (isNaN(numAmount)) {
        errors.push(`${fieldName} must be a valid number`);
      } else {
        if (numAmount < 0) {
          errors.push(`${fieldName} cannot be negative`);
        }
        if (numAmount > 999999999.99) {
          errors.push(`${fieldName} cannot exceed $999,999,999.99`);
        }
        // Check for more than 2 decimal places
        const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          errors.push(`${fieldName} cannot have more than 2 decimal places`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Percentage validation
  static validatePercentage(percentage: number | string | Decimal, fieldName: string = 'Percentage'): ValidationResult {
    const errors: string[] = [];

    if (percentage === null || percentage === undefined) {
      errors.push(`${fieldName} is required`);
    } else {
      const numPercentage = typeof percentage === 'string' ? parseFloat(percentage) :
                            percentage instanceof Decimal ? percentage.toNumber() : percentage;

      if (isNaN(numPercentage)) {
        errors.push(`${fieldName} must be a valid number`);
      } else {
        if (numPercentage < 0) {
          errors.push(`${fieldName} cannot be negative`);
        }
        if (numPercentage > 100) {
          errors.push(`${fieldName} cannot exceed 100%`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Date validation
  static validateDate(date: Date | string, fieldName: string = 'Date', allowFuture: boolean = true): ValidationResult {
    const errors: string[] = [];

    if (!date) {
      errors.push(`${fieldName} is required`);
    } else {
      const dateObj = date instanceof Date ? date : new Date(date);

      if (isNaN(dateObj.getTime())) {
        errors.push(`${fieldName} must be a valid date`);
      } else {
        if (!allowFuture && dateObj > new Date()) {
          errors.push(`${fieldName} cannot be in the future`);
        }
        // Check for reasonable date range (not before 1900 or too far in future)
        const minDate = new Date('1900-01-01');
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 50);

        if (dateObj < minDate) {
          errors.push(`${fieldName} cannot be before January 1, 1900`);
        }
        if (dateObj > maxDate) {
          errors.push(`${fieldName} cannot be more than 50 years in the future`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // String length validation
  static validateStringLength(
    value: string,
    fieldName: string,
    minLength: number = 0,
    maxLength: number = 255,
    required: boolean = true
  ): ValidationResult {
    const errors: string[] = [];

    if (!value || value.trim().length === 0) {
      if (required) {
        errors.push(`${fieldName} is required`);
      }
    } else {
      if (value.length < minLength) {
        errors.push(`${fieldName} must be at least ${minLength} characters long`);
      }
      if (value.length > maxLength) {
        errors.push(`${fieldName} must be less than ${maxLength} characters`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Payment attribution validation
  static validatePaymentAttributions(attributions: Array<{
    paymentId: string;
    incomeEventId: string;
    amount: number;
    paymentAmount: number;
    currentTotalAttributed: number;
  }>): PaymentAttributionValidation[] {
    const results: PaymentAttributionValidation[] = [];

    // Group by payment ID to validate total attribution
    const attributionsByPayment = attributions.reduce((acc, attr) => {
      if (!acc[attr.paymentId]) {
        acc[attr.paymentId] = [];
      }
      acc[attr.paymentId].push(attr);
      return acc;
    }, {} as Record<string, typeof attributions>);

    Object.entries(attributionsByPayment).forEach(([paymentId, paymentAttrs]) => {
      const paymentAmount = paymentAttrs[0].paymentAmount;
      const totalAttributed = paymentAttrs.reduce((sum, attr) => sum + attr.amount, 0);

      paymentAttrs.forEach(attr => {
        const errors: string[] = [];

        // Validate individual attribution amount
        if (attr.amount <= 0) {
          errors.push('Attribution amount must be greater than 0');
        }

        // Validate total attribution doesn't exceed payment amount
        if (totalAttributed > paymentAmount) {
          errors.push(`Total attributed amount (${totalAttributed}) exceeds payment amount (${paymentAmount})`);
        }

        results.push({
          paymentId: attr.paymentId,
          incomeEventId: attr.incomeEventId,
          amount: attr.amount,
          totalAttributed,
          paymentAmount,
          isValid: errors.length === 0,
          errors,
        });
      });
    });

    return results;
  }

  // Budget allocation validation
  static validateBudgetAllocations(
    incomeEventId: string,
    incomeAmount: number,
    allocations: Array<{
      budgetCategoryId: string;
      amount: number;
      percentage: number;
    }>
  ): BudgetAllocationValidation {
    const errors: string[] = [];

    const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
    const totalAmount = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);

    // Validate percentages sum to 100
    if (Math.abs(totalPercentage - 100) > 0.01) { // Allow small floating point differences
      errors.push(`Budget percentages must sum to 100%. Current total: ${totalPercentage}%`);
    }

    // Validate amounts match income amount
    if (Math.abs(totalAmount - incomeAmount) > 0.01) {
      errors.push(`Budget allocation amounts (${totalAmount}) must equal income amount (${incomeAmount})`);
    }

    // Validate individual allocations
    allocations.forEach((alloc, index) => {
      if (alloc.percentage < 0 || alloc.percentage > 100) {
        errors.push(`Budget category ${index + 1}: percentage must be between 0 and 100`);
      }
      if (alloc.amount < 0) {
        errors.push(`Budget category ${index + 1}: amount cannot be negative`);
      }
      // Validate percentage matches amount
      const expectedAmount = (alloc.percentage / 100) * incomeAmount;
      if (Math.abs(alloc.amount - expectedAmount) > 0.01) {
        errors.push(`Budget category ${index + 1}: amount (${alloc.amount}) doesn't match percentage (${alloc.percentage}% of ${incomeAmount})`);
      }
    });

    return {
      incomeEventId,
      allocations,
      totalPercentage,
      totalAmount,
      incomeAmount,
      isValid: errors.length === 0,
      errors,
    };
  }

  // Family settings validation
  static validateFamilySettings(settings: {
    timezone?: string;
    currency?: string;
    fiscalYearStart?: number;
  }): ValidationResult {
    const errors: string[] = [];

    if (settings.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: settings.timezone });
      } catch {
        errors.push('Invalid timezone');
      }
    }

    if (settings.currency) {
      const validCurrencies = ['USD', 'CAD', 'EUR', 'GBP']; // Add more as needed
      if (!validCurrencies.includes(settings.currency)) {
        errors.push(`Currency must be one of: ${validCurrencies.join(', ')}`);
      }
    }

    if (settings.fiscalYearStart !== undefined) {
      if (settings.fiscalYearStart < 1 || settings.fiscalYearStart > 12) {
        errors.push('Fiscal year start must be a month number between 1 and 12');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Bulk validation helper
  static validateMultiple(...validations: ValidationResult[]): ValidationResult {
    const allErrors = validations.flatMap(v => v.errors);
    const allWarnings = validations.flatMap(v => v.warnings || []);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    };
  }

  // Income event validation
  static validateIncomeEvent(data: {
    name: string;
    amount: number;
    scheduledDate: Date | string;
    frequency: string;
  }): ValidationResult {
    const validations = [
      this.validateStringLength(data.name, 'Income event name', 1, 255),
      this.validateCurrencyAmount(data.amount, 'Income amount'),
      this.validateDate(data.scheduledDate, 'Scheduled date', true),
    ];

    const errors: string[] = [];
    if (data.frequency && !['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(data.frequency)) {
      errors.push('Invalid frequency. Must be one of: once, weekly, biweekly, monthly, quarterly, annual');
    }

    validations.push({ isValid: errors.length === 0, errors });

    return this.validateMultiple(...validations);
  }

  // Payment validation
  static validatePayment(data: {
    payee: string;
    amount: number;
    dueDate: Date | string;
    paymentType: string;
    frequency?: string;
  }): ValidationResult {
    const validations = [
      this.validateStringLength(data.payee, 'Payee name', 1, 255),
      this.validateCurrencyAmount(data.amount, 'Payment amount'),
      this.validateDate(data.dueDate, 'Due date', true),
    ];

    const errors: string[] = [];
    if (!['once', 'recurring', 'variable'].includes(data.paymentType)) {
      errors.push('Invalid payment type. Must be one of: once, recurring, variable');
    }

    if (data.frequency && !['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(data.frequency)) {
      errors.push('Invalid frequency. Must be one of: once, weekly, biweekly, monthly, quarterly, annual');
    }

    validations.push({ isValid: errors.length === 0, errors });

    return this.validateMultiple(...validations);
  }

  // Authentication validation methods
  static validateRegistration(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    familyName: string;
    timezone?: string;
    currency?: string;
  }): string[] {
    const errors: string[] = [];

    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    const firstNameValidation = this.validateStringLength(data.firstName, 'First name', 1, 50);
    if (!firstNameValidation.isValid) {
      errors.push(...firstNameValidation.errors);
    }

    const lastNameValidation = this.validateStringLength(data.lastName, 'Last name', 1, 50);
    if (!lastNameValidation.isValid) {
      errors.push(...lastNameValidation.errors);
    }

    const familyNameValidation = this.validateStringLength(data.familyName, 'Family name', 1, 100);
    if (!familyNameValidation.isValid) {
      errors.push(...familyNameValidation.errors);
    }

    if (data.currency) {
      const currencyRegex = /^[A-Z]{3}$/;
      if (!currencyRegex.test(data.currency)) {
        errors.push('Currency must be a 3-letter ISO code (e.g., USD, EUR)');
      }
    }

    return errors;
  }

  static validateLogin(data: {
    email: string;
    password: string;
    totpCode?: string;
  }): string[] {
    const errors: string[] = [];

    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    if (!data.password || data.password.trim().length === 0) {
      errors.push('Password is required');
    }

    if (data.totpCode) {
      const totpRegex = /^[0-9]{6}$/;
      if (!totpRegex.test(data.totpCode)) {
        errors.push('TOTP code must be 6 digits');
      }
    }

    return errors;
  }

  static validateRefreshToken(token: string): string[] {
    const errors: string[] = [];

    if (!token || token.trim().length === 0) {
      errors.push('Refresh token is required');
    } else if (typeof token !== 'string') {
      errors.push('Refresh token must be a string');
    }

    return errors;
  }

  static validateTotpCode(code: string): string[] {
    const errors: string[] = [];

    if (!code || code.trim().length === 0) {
      errors.push('TOTP code is required');
    } else {
      const totpRegex = /^[0-9]{6}$/;
      if (!totpRegex.test(code)) {
        errors.push('TOTP code must be exactly 6 digits');
      }
    }

    return errors;
  }

  static validateMfaDisable(data: {
    password: string;
    totpCode?: string;
  }): string[] {
    const errors: string[] = [];

    if (!data.password || data.password.trim().length === 0) {
      errors.push('Password is required to disable MFA');
    }

    if (data.totpCode) {
      const totpValidation = this.validateTotpCode(data.totpCode);
      if (totpValidation.length > 0) {
        errors.push(...totpValidation);
      }
    }

    return errors;
  }

  static validateForgotPassword(data: {
    email: string;
  }): string[] {
    const errors: string[] = [];

    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    return errors;
  }

  static validateResetPassword(data: {
    token: string;
    newPassword: string;
  }): string[] {
    const errors: string[] = [];

    if (!data.token || data.token.trim().length === 0) {
      errors.push('Reset token is required');
    }

    const passwordValidation = this.validatePassword(data.newPassword);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    return errors;
  }

  static validateChangePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): string[] {
    const errors: string[] = [];

    if (!data.currentPassword || data.currentPassword.trim().length === 0) {
      errors.push('Current password is required');
    }

    const passwordValidation = this.validatePassword(data.newPassword);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    // Check if new password is different from current
    if (data.currentPassword && data.newPassword && data.currentPassword === data.newPassword) {
      errors.push('New password must be different from current password');
    }

    return errors;
  }

  static validateEmailVerification(data: {
    token: string;
    userId?: string;
  }): string[] {
    const errors: string[] = [];

    if (!data.token || data.token.trim().length === 0) {
      errors.push('Verification token is required');
    }

    return errors;
  }

  static validateResendVerification(data: {
    email: string;
  }): string[] {
    const errors: string[] = [];

    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    return errors;
  }

  static validateFamilyUpdate(data: {
    name?: string;
    settings?: {
      timezone?: string;
      currency?: string;
      fiscalYearStart?: number;
    };
  }): string[] {
    const errors: string[] = [];

    if (data.name !== undefined) {
      const nameValidation = this.validateStringLength(data.name, 'Family name', 1, 100);
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      }
    }

    if (data.settings) {
      if (data.settings.timezone !== undefined) {
        // Basic timezone validation
        if (!data.settings.timezone || data.settings.timezone.trim().length === 0) {
          errors.push('Timezone is required');
        }
      }

      if (data.settings.currency !== undefined) {
        const currencyRegex = /^[A-Z]{3}$/;
        if (!data.settings.currency || !currencyRegex.test(data.settings.currency)) {
          errors.push('Currency must be a 3-letter ISO code (e.g., USD, EUR)');
        }
      }

      if (data.settings.fiscalYearStart !== undefined) {
        if (data.settings.fiscalYearStart < 1 || data.settings.fiscalYearStart > 12) {
          errors.push('Fiscal year start must be between 1 and 12');
        }
      }
    }

    return errors;
  }

  static validateInviteFamilyMember(data: {
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    permissions?: {
      canManageBankAccounts?: boolean;
      canEditPayments?: boolean;
      canViewReports?: boolean;
      canManageFamily?: boolean;
    };
  }): string[] {
    const errors: string[] = [];

    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    if (!data.role || !validRoles.includes(data.role)) {
      errors.push('Role must be one of: admin, editor, viewer');
    }

    return errors;
  }

  static validateUpdateFamilyMember(data: {
    role?: 'admin' | 'editor' | 'viewer';
    permissions?: {
      canManageBankAccounts?: boolean;
      canEditPayments?: boolean;
      canViewReports?: boolean;
      canManageFamily?: boolean;
    };
  }): string[] {
    const errors: string[] = [];

    if (data.role !== undefined) {
      const validRoles = ['admin', 'editor', 'viewer'];
      if (!validRoles.includes(data.role)) {
        errors.push('Role must be one of: admin, editor, viewer');
      }
    }

    return errors;
  }

  static validateAcceptInvitation(data: {
    firstName: string;
    lastName: string;
    password: string;
    invitationToken: string;
  }): string[] {
    const errors: string[] = [];

    const firstNameValidation = this.validateStringLength(data.firstName, 'First name', 1, 50);
    if (!firstNameValidation.isValid) {
      errors.push(...firstNameValidation.errors);
    }

    const lastNameValidation = this.validateStringLength(data.lastName, 'Last name', 1, 50);
    if (!lastNameValidation.isValid) {
      errors.push(...lastNameValidation.errors);
    }

    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    if (!data.invitationToken || data.invitationToken.trim().length === 0) {
      errors.push('Invitation token is required');
    }

    return errors;
  }

  static validateCreateIncomeEvent(data: {
    sourceId: string;
    amount: number;
    receivedDate: string;
    description?: string;
    metadata?: Record<string, any>;
  }): string[] {
    const errors: string[] = [];

    if (!data.sourceId || data.sourceId.trim().length === 0) {
      errors.push('Income source ID is required');
    }

    if (typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('Amount must be a positive number');
    }

    if (!data.receivedDate || data.receivedDate.trim().length === 0) {
      errors.push('Received date is required');
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.receivedDate)) {
        errors.push('Received date must be in YYYY-MM-DD format');
      } else {
        const parsedDate = new Date(data.receivedDate + 'T00:00:00.000Z');
        if (isNaN(parsedDate.getTime())) {
          errors.push('Received date must be a valid date');
        }
      }
    }

    if (data.description !== undefined && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }

    return errors;
  }

  static validateUpdateIncomeEvent(data: {
    amount?: number;
    receivedDate?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): string[] {
    const errors: string[] = [];

    if (data.amount !== undefined) {
      if (typeof data.amount !== 'number' || data.amount <= 0) {
        errors.push('Amount must be a positive number');
      }
    }

    if (data.receivedDate !== undefined) {
      if (!data.receivedDate || data.receivedDate.trim().length === 0) {
        errors.push('Received date cannot be empty');
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data.receivedDate)) {
          errors.push('Received date must be in YYYY-MM-DD format');
        } else {
          const parsedDate = new Date(data.receivedDate + 'T00:00:00.000Z');
          if (isNaN(parsedDate.getTime())) {
            errors.push('Received date must be a valid date');
          }
        }
      }
    }

    if (data.description !== undefined && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }

    return errors;
  }
}