import { randomUUID } from 'crypto';

/**
 * Generate a correlation ID for request tracing.
 * Used in audit events and structured logging.
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format money in minor currency units to display string.
 * Per spec: never use floating-point arithmetic for financial totals.
 */
export function formatMoney(amountMinor: number, currency: string): string {
  const major = Math.floor(amountMinor / 100);
  const minor = Math.abs(amountMinor % 100);
  const formatted = `${major.toLocaleString()}.${minor.toString().padStart(2, '0')}`;

  // Currency symbol mapping (extensible)
  const symbols: Record<string, string> = {
    PKR: 'Rs.',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED',
  };

  const symbol = symbols[currency] ?? currency;
  return `${symbol} ${formatted}`;
}
