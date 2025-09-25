// Since date utilities are part of ValidationService, we'll test the date-specific methods
// and also create additional date calculation utilities that would be useful for the app

import { ValidationService } from '../../backend/src/services/validation.service';

// Date utility functions that would be useful for the Family Finance app
export class DateUtils {
  // Calculate days between two dates
  static daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc2 - utc1) / msPerDay);
  }

  // Get the start of a day
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  // Get the end of a day
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  // Get the start of a month
  static startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  // Get the end of a month
  static endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // Get the start of a year
  static startOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
  }

  // Get the end of a year
  static endOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  // Add days to a date
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Add months to a date
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    const day = result.getDate();
    result.setMonth(result.getMonth() + months);

    // Handle month overflow (e.g., Jan 31 + 1 month should be Feb 28/29)
    if (result.getDate() !== day) {
      result.setDate(0); // Go to last day of previous month
    }

    return result;
  }

  // Add years to a date
  static addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  // Format date as YYYY-MM-DD
  static formatISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Parse YYYY-MM-DD string to Date
  static parseISODate(dateString: string): Date | null {
    const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateString.match(regex);

    if (!match) {
      return null;
    }

    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    // Validate the date is real (not Feb 30, etc.)
    if (date.getFullYear() !== Number(year) ||
        date.getMonth() !== Number(month) - 1 ||
        date.getDate() !== Number(day)) {
      return null;
    }

    return date;
  }

  // Get next occurrence of a recurring date (monthly, quarterly, annual)
  static getNextRecurrence(date: Date, frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'): Date {
    switch (frequency) {
      case 'weekly':
        return this.addDays(date, 7);
      case 'biweekly':
        return this.addDays(date, 14);
      case 'monthly':
        return this.addMonths(date, 1);
      case 'quarterly':
        return this.addMonths(date, 3);
      case 'annual':
        return this.addYears(date, 1);
      default:
        throw new Error(`Invalid frequency: ${frequency}`);
    }
  }

  // Get all occurrences of a recurring date within a date range
  static getRecurrences(
    startDate: Date,
    endDate: Date,
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual',
    maxOccurrences: number = 100
  ): Date[] {
    const occurrences: Date[] = [];
    let currentDate = new Date(startDate);
    let count = 0;

    while (currentDate <= endDate && count < maxOccurrences) {
      occurrences.push(new Date(currentDate));
      currentDate = this.getNextRecurrence(currentDate, frequency);
      count++;
    }

    return occurrences;
  }

  // Calculate age in years from birthdate
  static calculateAge(birthDate: Date, asOfDate: Date = new Date()): number {
    let age = asOfDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = asOfDate.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && asOfDate.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  // Get the fiscal year for a date given a fiscal year start month
  static getFiscalYear(date: Date, fiscalYearStartMonth: number): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-based

    if (month < fiscalYearStartMonth) {
      return year - 1;
    }

    return year;
  }

  // Get the fiscal quarter for a date given a fiscal year start month
  static getFiscalQuarter(date: Date, fiscalYearStartMonth: number): number {
    let month = date.getMonth() + 1; // JavaScript months are 0-based

    // Adjust month relative to fiscal year start
    month = month - fiscalYearStartMonth + 1;
    if (month <= 0) {
      month += 12;
    }

    return Math.ceil(month / 3);
  }

  // Check if a date is a weekend
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  // Check if a date is a weekday
  static isWeekday(date: Date): boolean {
    return !this.isWeekend(date);
  }

  // Get next weekday
  static getNextWeekday(date: Date): Date {
    let nextDay = this.addDays(date, 1);
    while (this.isWeekend(nextDay)) {
      nextDay = this.addDays(nextDay, 1);
    }
    return nextDay;
  }

  // Get previous weekday
  static getPreviousWeekday(date: Date): Date {
    let prevDay = this.addDays(date, -1);
    while (this.isWeekend(prevDay)) {
      prevDay = this.addDays(prevDay, -1);
    }
    return prevDay;
  }

  // Check if year is a leap year
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  // Get days in month
  static getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  // Format relative time (e.g., "2 days ago", "in 3 hours")
  static formatRelativeTime(date: Date, relativeTo: Date = new Date()): string {
    const diffMs = date.getTime() - relativeTo.getTime();
    const absDiffMs = Math.abs(diffMs);
    const isPast = diffMs < 0;

    const seconds = Math.floor(absDiffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
      const unit = years === 1 ? 'year' : 'years';
      return isPast ? `${years} ${unit} ago` : `in ${years} ${unit}`;
    }
    if (months > 0) {
      const unit = months === 1 ? 'month' : 'months';
      return isPast ? `${months} ${unit} ago` : `in ${months} ${unit}`;
    }
    if (weeks > 0) {
      const unit = weeks === 1 ? 'week' : 'weeks';
      return isPast ? `${weeks} ${unit} ago` : `in ${weeks} ${unit}`;
    }
    if (days > 0) {
      const unit = days === 1 ? 'day' : 'days';
      return isPast ? `${days} ${unit} ago` : `in ${days} ${unit}`;
    }
    if (hours > 0) {
      const unit = hours === 1 ? 'hour' : 'hours';
      return isPast ? `${hours} ${unit} ago` : `in ${hours} ${unit}`;
    }
    if (minutes > 0) {
      const unit = minutes === 1 ? 'minute' : 'minutes';
      return isPast ? `${minutes} ${unit} ago` : `in ${minutes} ${unit}`;
    }
    if (seconds > 0) {
      const unit = seconds === 1 ? 'second' : 'seconds';
      return isPast ? `${seconds} ${unit} ago` : `in ${seconds} ${unit}`;
    }

    return 'just now';
  }
}

describe('DateUtils', () => {
  describe('daysBetween', () => {
    it('should calculate days between two dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-10');
      expect(DateUtils.daysBetween(date1, date2)).toBe(9);
    });

    it('should return negative days for past dates', () => {
      const date1 = new Date('2024-01-10');
      const date2 = new Date('2024-01-01');
      expect(DateUtils.daysBetween(date1, date2)).toBe(-9);
    });

    it('should return 0 for same date', () => {
      const date = new Date('2024-01-01');
      expect(DateUtils.daysBetween(date, date)).toBe(0);
    });

    it('should handle daylight saving time correctly', () => {
      const date1 = new Date('2024-03-09'); // Before DST
      const date2 = new Date('2024-03-11'); // After DST
      expect(DateUtils.daysBetween(date1, date2)).toBe(2);
    });
  });

  describe('startOfDay / endOfDay', () => {
    it('should get start of day', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const start = DateUtils.startOfDay(date);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    it('should get end of day', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const end = DateUtils.endOfDay(date);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });

  describe('startOfMonth / endOfMonth', () => {
    it('should get start of month', () => {
      const date = new Date('2024-01-15');
      const start = DateUtils.startOfMonth(date);
      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(0);
      expect(start.getFullYear()).toBe(2024);
    });

    it('should get end of month', () => {
      const date = new Date('2024-01-15');
      const end = DateUtils.endOfMonth(date);
      expect(end.getDate()).toBe(31);
      expect(end.getMonth()).toBe(0);
      expect(end.getFullYear()).toBe(2024);
    });

    it('should handle February in leap year', () => {
      const date = new Date('2024-02-15');
      const end = DateUtils.endOfMonth(date);
      expect(end.getDate()).toBe(29);
    });

    it('should handle February in non-leap year', () => {
      const date = new Date('2023-02-15');
      const end = DateUtils.endOfMonth(date);
      expect(end.getDate()).toBe(28);
    });
  });

  describe('startOfYear / endOfYear', () => {
    it('should get start of year', () => {
      const date = new Date('2024-06-15');
      const start = DateUtils.startOfYear(date);
      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(0);
      expect(start.getFullYear()).toBe(2024);
    });

    it('should get end of year', () => {
      const date = new Date('2024-06-15');
      const end = DateUtils.endOfYear(date);
      expect(end.getDate()).toBe(31);
      expect(end.getMonth()).toBe(11);
      expect(end.getFullYear()).toBe(2024);
    });
  });

  describe('addDays / addMonths / addYears', () => {
    it('should add days correctly', () => {
      const date = new Date('2024-01-15');
      const result = DateUtils.addDays(date, 10);
      expect(result.getDate()).toBe(25);
    });

    it('should handle month overflow when adding days', () => {
      const date = new Date('2024-01-30');
      const result = DateUtils.addDays(date, 5);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });

    it('should add months correctly', () => {
      const date = new Date('2024-01-15');
      const result = DateUtils.addMonths(date, 2);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBe(15);
    });

    it('should handle day overflow when adding months', () => {
      const date = new Date('2024-01-31');
      const result = DateUtils.addMonths(date, 1);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29); // Leap year
    });

    it('should add years correctly', () => {
      const date = new Date('2024-01-15');
      const result = DateUtils.addYears(date, 3);
      expect(result.getFullYear()).toBe(2027);
    });

    it('should handle leap year when adding years', () => {
      const date = new Date('2024-02-29');
      const result = DateUtils.addYears(date, 1);
      expect(result.getMonth()).toBe(1); // Still February
      expect(result.getDate()).toBe(29); // But Feb 28 in non-leap year becomes Feb 29
    });
  });

  describe('formatISODate / parseISODate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-05T12:30:00');
      expect(DateUtils.formatISODate(date)).toBe('2024-01-05');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2024, 0, 5); // Jan 5, 2024
      expect(DateUtils.formatISODate(date)).toBe('2024-01-05');
    });

    it('should parse valid ISO date string', () => {
      const date = DateUtils.parseISODate('2024-01-15');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it('should return null for invalid date format', () => {
      expect(DateUtils.parseISODate('01/15/2024')).toBeNull();
      expect(DateUtils.parseISODate('2024-1-15')).toBeNull();
      expect(DateUtils.parseISODate('not-a-date')).toBeNull();
    });

    it('should return null for invalid dates', () => {
      expect(DateUtils.parseISODate('2024-02-30')).toBeNull();
      expect(DateUtils.parseISODate('2024-13-01')).toBeNull();
      expect(DateUtils.parseISODate('2024-00-15')).toBeNull();
    });
  });

  describe('getNextRecurrence', () => {
    it('should get next weekly recurrence', () => {
      const date = new Date('2024-01-01');
      const next = DateUtils.getNextRecurrence(date, 'weekly');
      expect(DateUtils.daysBetween(date, next)).toBe(7);
    });

    it('should get next biweekly recurrence', () => {
      const date = new Date('2024-01-01');
      const next = DateUtils.getNextRecurrence(date, 'biweekly');
      expect(DateUtils.daysBetween(date, next)).toBe(14);
    });

    it('should get next monthly recurrence', () => {
      const date = new Date('2024-01-15');
      const next = DateUtils.getNextRecurrence(date, 'monthly');
      expect(next.getMonth()).toBe(1);
      expect(next.getDate()).toBe(15);
    });

    it('should handle month-end dates correctly', () => {
      const date = new Date('2024-01-31');
      const next = DateUtils.getNextRecurrence(date, 'monthly');
      expect(next.getMonth()).toBe(1);
      expect(next.getDate()).toBe(29); // Feb 29 in leap year
    });

    it('should get next quarterly recurrence', () => {
      const date = new Date('2024-01-15');
      const next = DateUtils.getNextRecurrence(date, 'quarterly');
      expect(next.getMonth()).toBe(3); // April
      expect(next.getDate()).toBe(15);
    });

    it('should get next annual recurrence', () => {
      const date = new Date('2024-01-15');
      const next = DateUtils.getNextRecurrence(date, 'annual');
      expect(next.getFullYear()).toBe(2025);
      expect(next.getMonth()).toBe(0);
      expect(next.getDate()).toBe(15);
    });

    it('should throw error for invalid frequency', () => {
      const date = new Date('2024-01-01');
      expect(() => DateUtils.getNextRecurrence(date, 'invalid' as any)).toThrow();
    });
  });

  describe('getRecurrences', () => {
    it('should get all monthly recurrences in a year', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-12-31');
      const recurrences = DateUtils.getRecurrences(start, end, 'monthly');
      expect(recurrences).toHaveLength(12);
      expect(recurrences[0].getMonth()).toBe(0); // January
      expect(recurrences[11].getMonth()).toBe(11); // December
    });

    it('should get quarterly recurrences', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-12-31');
      const recurrences = DateUtils.getRecurrences(start, end, 'quarterly');
      expect(recurrences).toHaveLength(4);
      expect(recurrences[0].getMonth()).toBe(0); // January
      expect(recurrences[1].getMonth()).toBe(3); // April
      expect(recurrences[2].getMonth()).toBe(6); // July
      expect(recurrences[3].getMonth()).toBe(9); // October
    });

    it('should respect max occurrences limit', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2025-12-31');
      const recurrences = DateUtils.getRecurrences(start, end, 'weekly', 10);
      expect(recurrences).toHaveLength(10);
    });

    it('should stop at end date', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-20');
      const recurrences = DateUtils.getRecurrences(start, end, 'weekly');
      expect(recurrences).toHaveLength(3);
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-15');
      const asOfDate = new Date('2024-01-15');
      expect(DateUtils.calculateAge(birthDate, asOfDate)).toBe(34);
    });

    it('should handle birthday not yet reached', () => {
      const birthDate = new Date('1990-06-15');
      const asOfDate = new Date('2024-01-15');
      expect(DateUtils.calculateAge(birthDate, asOfDate)).toBe(33);
    });

    it('should handle same month but day not reached', () => {
      const birthDate = new Date('1990-01-20');
      const asOfDate = new Date('2024-01-15');
      expect(DateUtils.calculateAge(birthDate, asOfDate)).toBe(33);
    });

    it('should use current date if not provided', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25);
      expect(DateUtils.calculateAge(birthDate)).toBe(25);
    });
  });

  describe('getFiscalYear / getFiscalQuarter', () => {
    it('should get fiscal year with January start', () => {
      const date = new Date('2024-06-15');
      expect(DateUtils.getFiscalYear(date, 1)).toBe(2024);
    });

    it('should get fiscal year with July start', () => {
      const date = new Date('2024-06-15');
      expect(DateUtils.getFiscalYear(date, 7)).toBe(2023);

      const date2 = new Date('2024-08-15');
      expect(DateUtils.getFiscalYear(date2, 7)).toBe(2024);
    });

    it('should get fiscal quarter with January start', () => {
      expect(DateUtils.getFiscalQuarter(new Date('2024-01-15'), 1)).toBe(1);
      expect(DateUtils.getFiscalQuarter(new Date('2024-04-15'), 1)).toBe(2);
      expect(DateUtils.getFiscalQuarter(new Date('2024-07-15'), 1)).toBe(3);
      expect(DateUtils.getFiscalQuarter(new Date('2024-10-15'), 1)).toBe(4);
    });

    it('should get fiscal quarter with July start', () => {
      expect(DateUtils.getFiscalQuarter(new Date('2024-07-15'), 7)).toBe(1);
      expect(DateUtils.getFiscalQuarter(new Date('2024-10-15'), 7)).toBe(2);
      expect(DateUtils.getFiscalQuarter(new Date('2024-01-15'), 7)).toBe(3);
      expect(DateUtils.getFiscalQuarter(new Date('2024-04-15'), 7)).toBe(4);
    });
  });

  describe('isWeekend / isWeekday', () => {
    it('should identify weekends', () => {
      expect(DateUtils.isWeekend(new Date('2024-01-06'))).toBe(true); // Saturday
      expect(DateUtils.isWeekend(new Date('2024-01-07'))).toBe(true); // Sunday
    });

    it('should identify weekdays', () => {
      expect(DateUtils.isWeekday(new Date('2024-01-08'))).toBe(true); // Monday
      expect(DateUtils.isWeekday(new Date('2024-01-12'))).toBe(true); // Friday
    });

    it('should be mutually exclusive', () => {
      const date = new Date('2024-01-15');
      expect(DateUtils.isWeekend(date)).toBe(!DateUtils.isWeekday(date));
    });
  });

  describe('getNextWeekday / getPreviousWeekday', () => {
    it('should get next weekday from Friday', () => {
      const friday = new Date('2024-01-05');
      const next = DateUtils.getNextWeekday(friday);
      expect(next.getDay()).toBe(1); // Monday
      expect(next.getDate()).toBe(8);
    });

    it('should get next weekday from weekday', () => {
      const monday = new Date('2024-01-08');
      const next = DateUtils.getNextWeekday(monday);
      expect(next.getDay()).toBe(2); // Tuesday
      expect(next.getDate()).toBe(9);
    });

    it('should get previous weekday from Monday', () => {
      const monday = new Date('2024-01-08');
      const prev = DateUtils.getPreviousWeekday(monday);
      expect(prev.getDay()).toBe(5); // Friday
      expect(prev.getDate()).toBe(5);
    });

    it('should get previous weekday from weekday', () => {
      const wednesday = new Date('2024-01-10');
      const prev = DateUtils.getPreviousWeekday(wednesday);
      expect(prev.getDay()).toBe(2); // Tuesday
      expect(prev.getDate()).toBe(9);
    });
  });

  describe('isLeapYear', () => {
    it('should identify leap years', () => {
      expect(DateUtils.isLeapYear(2024)).toBe(true);
      expect(DateUtils.isLeapYear(2020)).toBe(true);
      expect(DateUtils.isLeapYear(2000)).toBe(true);
    });

    it('should identify non-leap years', () => {
      expect(DateUtils.isLeapYear(2023)).toBe(false);
      expect(DateUtils.isLeapYear(2025)).toBe(false);
      expect(DateUtils.isLeapYear(1900)).toBe(false);
      expect(DateUtils.isLeapYear(2100)).toBe(false);
    });
  });

  describe('getDaysInMonth', () => {
    it('should get days in month', () => {
      expect(DateUtils.getDaysInMonth(2024, 0)).toBe(31); // January
      expect(DateUtils.getDaysInMonth(2024, 1)).toBe(29); // February (leap year)
      expect(DateUtils.getDaysInMonth(2023, 1)).toBe(28); // February (non-leap)
      expect(DateUtils.getDaysInMonth(2024, 3)).toBe(30); // April
    });
  });

  describe('formatRelativeTime', () => {
    it('should format past times correctly', () => {
      const now = new Date('2024-01-15T12:00:00');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T11:59:30'), now
      )).toBe('30 seconds ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T11:30:00'), now
      )).toBe('30 minutes ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T09:00:00'), now
      )).toBe('3 hours ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-10T12:00:00'), now
      )).toBe('5 days ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-01T12:00:00'), now
      )).toBe('2 weeks ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2023-12-01T12:00:00'), now
      )).toBe('1 month ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2022-01-15T12:00:00'), now
      )).toBe('2 years ago');
    });

    it('should format future times correctly', () => {
      const now = new Date('2024-01-15T12:00:00');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T12:00:30'), now
      )).toBe('in 30 seconds');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T12:30:00'), now
      )).toBe('in 30 minutes');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T15:00:00'), now
      )).toBe('in 3 hours');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-20T12:00:00'), now
      )).toBe('in 5 days');
    });

    it('should handle singular units', () => {
      const now = new Date('2024-01-15T12:00:00');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T11:59:59'), now
      )).toBe('1 second ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T11:59:00'), now
      )).toBe('1 minute ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T11:00:00'), now
      )).toBe('1 hour ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-14T12:00:00'), now
      )).toBe('1 day ago');

      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-08T12:00:00'), now
      )).toBe('1 week ago');
    });

    it('should return "just now" for very recent times', () => {
      const now = new Date('2024-01-15T12:00:00');

      expect(DateUtils.formatRelativeTime(now, now)).toBe('just now');
      expect(DateUtils.formatRelativeTime(
        new Date('2024-01-15T12:00:00.500'), now
      )).toBe('just now');
    });
  });
});

describe('ValidationService Date Methods', () => {
  describe('validateDate', () => {
    it('should validate current date', () => {
      const result = ValidationService.validateDate(new Date());
      expect(result.isValid).toBe(true);
    });

    it('should validate date strings', () => {
      const result = ValidationService.validateDate('2024-01-15');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid dates', () => {
      const result = ValidationService.validateDate('not-a-date');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date must be a valid date');
    });

    it('should enforce date range restrictions', () => {
      const veryOldDate = new Date('1899-12-31');
      const result1 = ValidationService.validateDate(veryOldDate);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Date cannot be before January 1, 1900');

      const veryFutureDate = new Date();
      veryFutureDate.setFullYear(veryFutureDate.getFullYear() + 51);
      const result2 = ValidationService.validateDate(veryFutureDate);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Date cannot be more than 50 years in the future');
    });

    it('should handle allowFuture parameter', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const resultAllowed = ValidationService.validateDate(tomorrow, 'Date', true);
      expect(resultAllowed.isValid).toBe(true);

      const resultNotAllowed = ValidationService.validateDate(tomorrow, 'Date', false);
      expect(resultNotAllowed.isValid).toBe(false);
      expect(resultNotAllowed.errors).toContain('Date cannot be in the future');
    });
  });

  describe('Date validation in complex objects', () => {
    it('should validate income event dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const result = ValidationService.validateIncomeEvent({
        name: 'Salary',
        amount: 5000,
        scheduledDate: futureDate,
        frequency: 'monthly',
      });

      expect(result.isValid).toBe(true);
    });

    it('should validate payment due dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const result = ValidationService.validatePayment({
        payee: 'Electric Company',
        amount: 150,
        dueDate: pastDate,
        paymentType: 'recurring',
        frequency: 'monthly',
      });

      expect(result.isValid).toBe(true);
    });
  });
});