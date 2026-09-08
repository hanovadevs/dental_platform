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

/**
 * Formats a major numeric currency amount to standard display string.
 */
export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

/**
 * Formats a Date or date string to standard display format.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


