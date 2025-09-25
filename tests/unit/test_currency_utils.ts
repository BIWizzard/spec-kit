import { ValidationService } from '../../backend/src/services/validation.service';
import { Decimal } from '@prisma/client/runtime/library';

// Currency utility functions for the Family Finance app
export class CurrencyUtils {
  // Format number as currency (USD)
  static formatCurrency(amount: number | string | Decimal, currency: string = 'USD'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) :
                      amount instanceof Decimal ? amount.toNumber() : amount;

    if (isNaN(numAmount)) {
      return '$0.00';
    }

    // Handle different currency symbols
    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
    };

    const symbol = currencySymbols[currency] || '$';

    // Format with thousands separators and 2 decimal places
    const formatted = Math.abs(numAmount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Handle negative values
    if (numAmount < 0) {
      return `-${symbol}${formatted}`;
    }

    return `${symbol}${formatted}`;
  }

  // Format as compact currency (e.g., $1.2K, $3.5M)
  static formatCompactCurrency(amount: number | string | Decimal, currency: string = 'USD'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) :
                      amount instanceof Decimal ? amount.toNumber() : amount;

    if (isNaN(numAmount)) {
      return '$0';
    }

    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
    };

    const symbol = currencySymbols[currency] || '$';
    const absAmount = Math.abs(numAmount);

    let formatted: string;
    if (absAmount >= 1000000000) {
      formatted = (absAmount / 1000000000).toFixed(1) + 'B';
    } else if (absAmount >= 1000000) {
      formatted = (absAmount / 1000000).toFixed(1) + 'M';
    } else if (absAmount >= 1000) {
      formatted = (absAmount / 1000).toFixed(1) + 'K';
    } else {
      formatted = absAmount.toFixed(0);
    }

    // Remove unnecessary decimals
    formatted = formatted.replace(/\.0([KMB])/, '$1');

    return numAmount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }

  // Parse currency string to number
  static parseCurrency(currencyString: string): number | null {
    if (!currencyString || typeof currencyString !== 'string') {
      return null;
    }

    // Remove currency symbols and whitespace
    let cleaned = currencyString.replace(/[$€£¥₹C A]/g, '').trim();

    // Handle parentheses for negative values (accounting format)
    const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
    if (isNegative) {
      cleaned = cleaned.slice(1, -1);
    }

    // Remove thousands separators
    cleaned = cleaned.replace(/,/g, '');

    // Handle negative sign
    if (cleaned.startsWith('-')) {
      cleaned = cleaned.slice(1);
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : -parsed;
    }

    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) {
      return null;
    }

    return isNegative ? -parsed : parsed;
  }

  // Round to nearest cent
  static roundToCents(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  // Calculate percentage of total
  static calculatePercentage(amount: number, total: number): number {
    if (total === 0) {
      return 0;
    }
    return (amount / total) * 100;
  }

  // Format as percentage with currency
  static formatPercentageWithAmount(amount: number, total: number, currency: string = 'USD'): string {
    const percentage = this.calculatePercentage(amount, total);
    const formattedAmount = this.formatCurrency(amount, currency);
    return `${formattedAmount} (${percentage.toFixed(1)}%)`;
  }

  // Calculate tax amount
  static calculateTax(amount: number, taxRate: number): number {
    return this.roundToCents(amount * (taxRate / 100));
  }

  // Calculate amount after tax
  static addTax(amount: number, taxRate: number): number {
    const tax = this.calculateTax(amount, taxRate);
    return this.roundToCents(amount + tax);
  }

  // Calculate amount before tax
  static removeTax(amountWithTax: number, taxRate: number): number {
    return this.roundToCents(amountWithTax / (1 + taxRate / 100));
  }

  // Split amount proportionally
  static splitAmount(total: number, ratios: number[]): number[] {
    const sum = ratios.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      return ratios.map(() => 0);
    }

    const amounts = ratios.map(ratio => this.roundToCents((ratio / sum) * total));

    // Adjust for rounding errors
    const actualSum = amounts.reduce((a, b) => a + b, 0);
    const difference = this.roundToCents(total - actualSum);

    if (difference !== 0 && amounts.length > 0) {
      amounts[0] = this.roundToCents(amounts[0] + difference);
    }

    return amounts;
  }

  // Convert between currencies (simplified - would need real exchange rates)
  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    // Simplified exchange rates for testing (in production, use real API)
    const exchangeRates: Record<string, Record<string, number>> = {
      USD: { EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35, JPY: 110, CNY: 6.5, INR: 75 },
      EUR: { USD: 1.18, GBP: 0.86, CAD: 1.47, AUD: 1.59, JPY: 129, CNY: 7.65, INR: 88 },
      GBP: { USD: 1.37, EUR: 1.16, CAD: 1.71, AUD: 1.85, JPY: 150, CNY: 8.9, INR: 102 },
    };

    if (fromCurrency === toCurrency) {
      return amount;
    }

    const fromRates = exchangeRates[fromCurrency];
    if (!fromRates || !fromRates[toCurrency]) {
      // Try reverse conversion
      const toRates = exchangeRates[toCurrency];
      if (toRates && toRates[fromCurrency]) {
        return this.roundToCents(amount / toRates[fromCurrency]);
      }
      throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
    }

    return this.roundToCents(amount * fromRates[toCurrency]);
  }

  // Format currency range
  static formatCurrencyRange(min: number, max: number, currency: string = 'USD'): string {
    if (min === max) {
      return this.formatCurrency(min, currency);
    }
    return `${this.formatCurrency(min, currency)} - ${this.formatCurrency(max, currency)}`;
  }

  // Calculate compound interest
  static calculateCompoundInterest(
    principal: number,
    annualRate: number,
    years: number,
    compoundingFrequency: number = 12
  ): number {
    const rate = annualRate / 100 / compoundingFrequency;
    const periods = years * compoundingFrequency;
    const amount = principal * Math.pow(1 + rate, periods);
    return this.roundToCents(amount);
  }

  // Calculate monthly payment for a loan
  static calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    years: number
  ): number {
    if (annualRate === 0) {
      return this.roundToCents(principal / (years * 12));
    }

    const monthlyRate = annualRate / 100 / 12;
    const months = years * 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                   (Math.pow(1 + monthlyRate, months) - 1);
    return this.roundToCents(payment);
  }

  // Format as accounting format (negatives in parentheses)
  static formatAccounting(amount: number, currency: string = 'USD'): string {
    const formatted = this.formatCurrency(Math.abs(amount), currency);

    if (amount < 0) {
      return `(${formatted})`;
    }

    return formatted;
  }

  // Validate monetary input
  static isValidMonetaryInput(input: string): boolean {
    // Allow currency symbols, digits, commas, periods, and negative signs
    const regex = /^-?[$€£¥₹C A]?\s*[\d,]+(\.\d{0,2})?$/;
    return regex.test(input.trim());
  }

  // Round up to nearest dollar
  static roundUpToDollar(amount: number): number {
    return Math.ceil(amount);
  }

  // Round down to nearest dollar
  static roundDownToDollar(amount: number): number {
    return Math.floor(amount);
  }

  // Calculate savings rate
  static calculateSavingsRate(income: number, expenses: number): number {
    if (income <= 0) {
      return 0;
    }
    const savings = income - expenses;
    return this.roundToCents((savings / income) * 100);
  }

  // Format delta (change in value)
  static formatDelta(current: number, previous: number, currency: string = 'USD'): string {
    const delta = current - previous;
    const percentage = previous !== 0 ? ((delta / previous) * 100) : 0;

    const sign = delta >= 0 ? '+' : '';
    const formattedDelta = this.formatCurrency(Math.abs(delta), currency);

    return `${sign}${delta < 0 ? '-' : ''}${formattedDelta} (${sign}${percentage.toFixed(1)}%)`;
  }
}

describe('CurrencyUtils', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as currency', () => {
      expect(CurrencyUtils.formatCurrency(1234.56)).toBe('$1,234.56');
      expect(CurrencyUtils.formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(CurrencyUtils.formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format negative numbers with negative sign', () => {
      expect(CurrencyUtils.formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(CurrencyUtils.formatCurrency(-0.99)).toBe('-$0.99');
    });

    it('should handle string inputs', () => {
      expect(CurrencyUtils.formatCurrency('1234.56')).toBe('$1,234.56');
      expect(CurrencyUtils.formatCurrency('-999.99')).toBe('-$999.99');
    });

    it('should handle Decimal inputs', () => {
      const decimal = new Decimal(1234.56);
      expect(CurrencyUtils.formatCurrency(decimal)).toBe('$1,234.56');
    });

    it('should handle invalid inputs', () => {
      expect(CurrencyUtils.formatCurrency('not-a-number')).toBe('$0.00');
      expect(CurrencyUtils.formatCurrency(NaN)).toBe('$0.00');
    });

    it('should format different currencies', () => {
      expect(CurrencyUtils.formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
      expect(CurrencyUtils.formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
      expect(CurrencyUtils.formatCurrency(1234.56, 'CAD')).toBe('C$1,234.56');
      expect(CurrencyUtils.formatCurrency(1234.56, 'JPY')).toBe('¥1,234.56');
    });

    it('should default to USD for unknown currencies', () => {
      expect(CurrencyUtils.formatCurrency(1234.56, 'XYZ')).toBe('$1,234.56');
    });
  });

  describe('formatCompactCurrency', () => {
    it('should format large numbers compactly', () => {
      expect(CurrencyUtils.formatCompactCurrency(1234)).toBe('$1.2K');
      expect(CurrencyUtils.formatCompactCurrency(1000)).toBe('$1K');
      expect(CurrencyUtils.formatCompactCurrency(1500000)).toBe('$1.5M');
      expect(CurrencyUtils.formatCompactCurrency(1000000000)).toBe('$1B');
    });

    it('should format small numbers without abbreviation', () => {
      expect(CurrencyUtils.formatCompactCurrency(999)).toBe('$999');
      expect(CurrencyUtils.formatCompactCurrency(1)).toBe('$1');
      expect(CurrencyUtils.formatCompactCurrency(0)).toBe('$0');
    });

    it('should handle negative numbers', () => {
      expect(CurrencyUtils.formatCompactCurrency(-1234)).toBe('-$1.2K');
      expect(CurrencyUtils.formatCompactCurrency(-1500000)).toBe('-$1.5M');
    });

    it('should remove unnecessary decimals', () => {
      expect(CurrencyUtils.formatCompactCurrency(1000)).toBe('$1K');
      expect(CurrencyUtils.formatCompactCurrency(1000000)).toBe('$1M');
      expect(CurrencyUtils.formatCompactCurrency(1000000000)).toBe('$1B');
    });

    it('should handle different currencies', () => {
      expect(CurrencyUtils.formatCompactCurrency(1234, 'EUR')).toBe('€1.2K');
      expect(CurrencyUtils.formatCompactCurrency(1500000, 'GBP')).toBe('£1.5M');
    });
  });

  describe('parseCurrency', () => {
    it('should parse currency strings to numbers', () => {
      expect(CurrencyUtils.parseCurrency('$1,234.56')).toBe(1234.56);
      expect(CurrencyUtils.parseCurrency('€999.99')).toBe(999.99);
      expect(CurrencyUtils.parseCurrency('£1,000,000.00')).toBe(1000000);
    });

    it('should handle negative values', () => {
      expect(CurrencyUtils.parseCurrency('-$1,234.56')).toBe(-1234.56);
      expect(CurrencyUtils.parseCurrency('($1,234.56)')).toBe(-1234.56);
    });

    it('should handle values without currency symbols', () => {
      expect(CurrencyUtils.parseCurrency('1,234.56')).toBe(1234.56);
      expect(CurrencyUtils.parseCurrency('999')).toBe(999);
    });

    it('should return null for invalid inputs', () => {
      expect(CurrencyUtils.parseCurrency('')).toBe(null);
      expect(CurrencyUtils.parseCurrency('not-a-number')).toBe(null);
      expect(CurrencyUtils.parseCurrency(null as any)).toBe(null);
      expect(CurrencyUtils.parseCurrency(undefined as any)).toBe(null);
    });

    it('should handle various currency formats', () => {
      expect(CurrencyUtils.parseCurrency('C$1,234.56')).toBe(1234.56);
      expect(CurrencyUtils.parseCurrency('A$999.99')).toBe(999.99);
      expect(CurrencyUtils.parseCurrency('¥1,234')).toBe(1234);
    });
  });

  describe('roundToCents', () => {
    it('should round to 2 decimal places', () => {
      expect(CurrencyUtils.roundToCents(1.234)).toBe(1.23);
      expect(CurrencyUtils.roundToCents(1.235)).toBe(1.24);
      expect(CurrencyUtils.roundToCents(1.999)).toBe(2.00);
    });

    it('should handle negative numbers', () => {
      expect(CurrencyUtils.roundToCents(-1.234)).toBe(-1.23);
      expect(CurrencyUtils.roundToCents(-1.235)).toBe(-1.24);
    });

    it('should preserve exact cents', () => {
      expect(CurrencyUtils.roundToCents(1.23)).toBe(1.23);
      expect(CurrencyUtils.roundToCents(100.00)).toBe(100.00);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(CurrencyUtils.calculatePercentage(25, 100)).toBe(25);
      expect(CurrencyUtils.calculatePercentage(50, 200)).toBe(25);
      expect(CurrencyUtils.calculatePercentage(333, 1000)).toBe(33.3);
    });

    it('should handle zero total', () => {
      expect(CurrencyUtils.calculatePercentage(100, 0)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(CurrencyUtils.calculatePercentage(-50, 100)).toBe(-50);
      expect(CurrencyUtils.calculatePercentage(50, -100)).toBe(-50);
    });
  });

  describe('formatPercentageWithAmount', () => {
    it('should format amount with percentage', () => {
      expect(CurrencyUtils.formatPercentageWithAmount(250, 1000)).toBe('$250.00 (25.0%)');
      expect(CurrencyUtils.formatPercentageWithAmount(333.33, 1000)).toBe('$333.33 (33.3%)');
    });

    it('should handle different currencies', () => {
      expect(CurrencyUtils.formatPercentageWithAmount(250, 1000, 'EUR')).toBe('€250.00 (25.0%)');
    });

    it('should handle zero total', () => {
      expect(CurrencyUtils.formatPercentageWithAmount(100, 0)).toBe('$100.00 (0.0%)');
    });
  });

  describe('Tax calculations', () => {
    describe('calculateTax', () => {
      it('should calculate tax amount', () => {
        expect(CurrencyUtils.calculateTax(100, 10)).toBe(10);
        expect(CurrencyUtils.calculateTax(99.99, 8.875)).toBe(8.87);
      });

      it('should round to cents', () => {
        expect(CurrencyUtils.calculateTax(10, 7.5)).toBe(0.75);
        expect(CurrencyUtils.calculateTax(10, 7.25)).toBe(0.73);
      });
    });

    describe('addTax', () => {
      it('should add tax to amount', () => {
        expect(CurrencyUtils.addTax(100, 10)).toBe(110);
        expect(CurrencyUtils.addTax(99.99, 8.875)).toBe(108.86);
      });
    });

    describe('removeTax', () => {
      it('should calculate amount before tax', () => {
        expect(CurrencyUtils.removeTax(110, 10)).toBe(100);
        expect(CurrencyUtils.removeTax(108.86, 8.875)).toBe(99.99);
      });
    });
  });

  describe('splitAmount', () => {
    it('should split amount proportionally', () => {
      const result = CurrencyUtils.splitAmount(100, [1, 1, 1]);
      expect(result).toEqual([33.34, 33.33, 33.33]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('should handle different ratios', () => {
      const result = CurrencyUtils.splitAmount(100, [2, 3, 5]);
      expect(result).toEqual([20, 30, 50]);
    });

    it('should handle rounding adjustments', () => {
      const result = CurrencyUtils.splitAmount(10, [1, 1, 1]);
      expect(result).toEqual([3.34, 3.33, 3.33]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(10);
    });

    it('should handle zero ratios', () => {
      const result = CurrencyUtils.splitAmount(100, [0, 0, 0]);
      expect(result).toEqual([0, 0, 0]);
    });

    it('should handle single ratio', () => {
      const result = CurrencyUtils.splitAmount(100, [1]);
      expect(result).toEqual([100]);
    });
  });

  describe('convertCurrency', () => {
    it('should convert between currencies', () => {
      expect(CurrencyUtils.convertCurrency(100, 'USD', 'EUR')).toBe(85);
      expect(CurrencyUtils.convertCurrency(100, 'USD', 'GBP')).toBe(73);
      expect(CurrencyUtils.convertCurrency(100, 'EUR', 'USD')).toBe(118);
    });

    it('should return same amount for same currency', () => {
      expect(CurrencyUtils.convertCurrency(100, 'USD', 'USD')).toBe(100);
    });

    it('should handle reverse conversions', () => {
      const usdToEur = CurrencyUtils.convertCurrency(100, 'USD', 'EUR');
      const eurToUsd = CurrencyUtils.convertCurrency(usdToEur, 'EUR', 'USD');
      expect(Math.abs(eurToUsd - 100)).toBeLessThan(1); // Allow for rounding
    });

    it('should throw error for unsupported conversions', () => {
      expect(() => CurrencyUtils.convertCurrency(100, 'XYZ', 'ABC')).toThrow();
    });
  });

  describe('formatCurrencyRange', () => {
    it('should format currency range', () => {
      expect(CurrencyUtils.formatCurrencyRange(100, 500)).toBe('$100.00 - $500.00');
      expect(CurrencyUtils.formatCurrencyRange(1000, 5000, 'EUR')).toBe('€1,000.00 - €5,000.00');
    });

    it('should handle same min and max', () => {
      expect(CurrencyUtils.formatCurrencyRange(100, 100)).toBe('$100.00');
    });
  });

  describe('calculateCompoundInterest', () => {
    it('should calculate compound interest', () => {
      // $1000 at 5% for 1 year, monthly compounding
      const result = CurrencyUtils.calculateCompoundInterest(1000, 5, 1, 12);
      expect(result).toBeCloseTo(1051.16, 2);
    });

    it('should handle annual compounding', () => {
      const result = CurrencyUtils.calculateCompoundInterest(1000, 10, 2, 1);
      expect(result).toBe(1210); // 1000 * 1.1^2
    });

    it('should handle zero interest', () => {
      const result = CurrencyUtils.calculateCompoundInterest(1000, 0, 5, 12);
      expect(result).toBe(1000);
    });
  });

  describe('calculateMonthlyPayment', () => {
    it('should calculate monthly loan payment', () => {
      // $10,000 at 5% for 1 year
      const payment = CurrencyUtils.calculateMonthlyPayment(10000, 5, 1);
      expect(payment).toBeCloseTo(856.07, 2);
    });

    it('should handle zero interest', () => {
      const payment = CurrencyUtils.calculateMonthlyPayment(12000, 0, 1);
      expect(payment).toBe(1000); // 12000 / 12
    });

    it('should handle longer terms', () => {
      // $100,000 at 4.5% for 30 years
      const payment = CurrencyUtils.calculateMonthlyPayment(100000, 4.5, 30);
      expect(payment).toBeCloseTo(506.69, 2);
    });
  });

  describe('formatAccounting', () => {
    it('should format positive numbers normally', () => {
      expect(CurrencyUtils.formatAccounting(1234.56)).toBe('$1,234.56');
    });

    it('should format negative numbers with parentheses', () => {
      expect(CurrencyUtils.formatAccounting(-1234.56)).toBe('($1,234.56)');
    });

    it('should handle different currencies', () => {
      expect(CurrencyUtils.formatAccounting(-1234.56, 'EUR')).toBe('(€1,234.56)');
    });
  });

  describe('isValidMonetaryInput', () => {
    it('should validate valid monetary inputs', () => {
      const validInputs = [
        '1234.56',
        '$1,234.56',
        '-$999.99',
        '€1.234,56',
        '999',
        '0.99',
        '$ 123.45',
      ];

      validInputs.forEach(input => {
        expect(CurrencyUtils.isValidMonetaryInput(input)).toBe(true);
      });
    });

    it('should reject invalid monetary inputs', () => {
      const invalidInputs = [
        'abc',
        '12.345', // More than 2 decimal places
        '$12.3.4',
        '12$34',
      ];

      invalidInputs.forEach(input => {
        expect(CurrencyUtils.isValidMonetaryInput(input)).toBe(false);
      });
    });
  });

  describe('Rounding methods', () => {
    it('should round up to dollar', () => {
      expect(CurrencyUtils.roundUpToDollar(1.01)).toBe(2);
      expect(CurrencyUtils.roundUpToDollar(1.99)).toBe(2);
      expect(CurrencyUtils.roundUpToDollar(1.00)).toBe(1);
    });

    it('should round down to dollar', () => {
      expect(CurrencyUtils.roundDownToDollar(1.99)).toBe(1);
      expect(CurrencyUtils.roundDownToDollar(1.01)).toBe(1);
      expect(CurrencyUtils.roundDownToDollar(2.00)).toBe(2);
    });
  });

  describe('calculateSavingsRate', () => {
    it('should calculate savings rate', () => {
      expect(CurrencyUtils.calculateSavingsRate(5000, 4000)).toBe(20);
      expect(CurrencyUtils.calculateSavingsRate(10000, 7500)).toBe(25);
    });

    it('should handle negative savings', () => {
      expect(CurrencyUtils.calculateSavingsRate(5000, 6000)).toBe(-20);
    });

    it('should handle zero income', () => {
      expect(CurrencyUtils.calculateSavingsRate(0, 100)).toBe(0);
    });

    it('should handle negative income', () => {
      expect(CurrencyUtils.calculateSavingsRate(-1000, 500)).toBe(0);
    });
  });

  describe('formatDelta', () => {
    it('should format positive changes', () => {
      expect(CurrencyUtils.formatDelta(1200, 1000)).toBe('+$200.00 (+20.0%)');
    });

    it('should format negative changes', () => {
      expect(CurrencyUtils.formatDelta(800, 1000)).toBe('-$200.00 (-20.0%)');
    });

    it('should handle zero previous value', () => {
      expect(CurrencyUtils.formatDelta(100, 0)).toBe('+$100.00 (+0.0%)');
    });

    it('should handle no change', () => {
      expect(CurrencyUtils.formatDelta(1000, 1000)).toBe('+$0.00 (+0.0%)');
    });

    it('should format with different currencies', () => {
      expect(CurrencyUtils.formatDelta(1200, 1000, 'EUR')).toBe('+€200.00 (+20.0%)');
    });
  });
});

describe('ValidationService Currency Methods', () => {
  describe('validateCurrencyAmount', () => {
    it('should validate valid amounts', () => {
      const result = ValidationService.validateCurrencyAmount(99.99);
      expect(result.isValid).toBe(true);
    });

    it('should handle Decimal type', () => {
      const decimal = new Decimal(123.45);
      const result = ValidationService.validateCurrencyAmount(decimal);
      expect(result.isValid).toBe(true);
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
  });
});