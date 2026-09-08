import { describe, it, expect } from 'vitest';
import { slugify, formatMoney, formatCurrency, formatDate, generateCorrelationId } from '@/lib/utils';

describe('Utils', () => {
  describe('slugify', () => {
    it('converts a string to a URL-safe slug', () => {
      expect(slugify('Smile Dental Clinic')).toBe('smile-dental-clinic');
    });

    it('handles special characters', () => {
      expect(slugify('Dr. Ahmed\'s Clinic!')).toBe('dr-ahmeds-clinic');
    });

    it('handles extra spaces', () => {
      expect(slugify('  Hello   World  ')).toBe('hello-world');
    });
  });

  describe('formatMoney', () => {
    it('formats PKR correctly', () => {
      expect(formatMoney(5500000, 'PKR')).toBe('Rs. 55,000.00');
    });

    it('formats USD correctly', () => {
      expect(formatMoney(999, 'USD')).toBe('$ 9.99');
    });

    it('formats zero amount', () => {
      expect(formatMoney(0, 'PKR')).toBe('Rs. 0.00');
    });

    it('formats with unknown currency', () => {
      expect(formatMoney(1000, 'XYZ')).toBe('XYZ 10.00');
    });
  });

  describe('generateCorrelationId', () => {
    it('returns a valid UUID', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('returns unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateCorrelationId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('formatDate', () => {
    it('formats valid date object correctly', () => {
      const date = new Date('2026-05-15T12:00:00Z');
      expect(formatDate(date)).toContain('2026');
    });

    it('returns empty string for null or invalid dates', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate('invalid-date')).toBe('');
    });
  });
});

