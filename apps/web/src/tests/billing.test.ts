import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceTotals,
  applyPaymentToInvoice,
} from '@/features/billing/domain/calculations';
import {
  createInvoiceSchema,
  recordPaymentSchema,
} from '@/features/billing/domain/validation';

describe('Billing Domain: Exact Calculations', () => {
  it('calculates invoice subtotal, discounts, and total with penny accuracy', () => {
    const items = [
      { quantity: 1, unitPrice: 75.0, discount: 0 },
      { quantity: 2, unitPrice: 120.5, discount: 10.0 }, // 241 - 20 = 221
      { quantity: 1, unitPrice: 950.0, discount: 50.0 }, // 900
    ];

    const result = calculateInvoiceTotals(items);

    // Subtotal: 75 + (2 * 120.50) + 950 = 75 + 241 + 950 = 1266
    expect(result.subtotal).toBe(1266.0);

    // Discount Total: (2 * 10) + 50 = 70
    expect(result.discountTotal).toBe(70.0);

    // Total: 1266 - 70 = 1196
    expect(result.total).toBe(1196.0);
    expect(result.amountDue).toBe(1196.0);
  });

  it('calculates tax correctly when taxRatePercent is specified', () => {
    const items = [{ quantity: 1, unitPrice: 100.0, discount: 0 }];
    const withTax = calculateInvoiceTotals(items, 8.5); // 8.5% tax

    expect(withTax.subtotal).toBe(100.0);
    expect(withTax.taxTotal).toBe(8.5);
    expect(withTax.total).toBe(108.5);
  });

  it('applies partial payment and correctly reduces invoice balance', () => {
    const invoice = {
      total: '500.00',
      amountPaid: '0.00',
    };

    // First partial payment: $200
    const pmt1 = applyPaymentToInvoice(invoice, 200);
    expect(pmt1.newAmountPaid).toBe(200.0);
    expect(pmt1.newAmountDue).toBe(300.0);
    expect(pmt1.status).toBe('partially_paid');

    // Second payment: $300 (satisfies remaining balance)
    const pmt2 = applyPaymentToInvoice(
      { total: '500.00', amountPaid: pmt1.newAmountPaid },
      300
    );
    expect(pmt2.newAmountPaid).toBe(500.0);
    expect(pmt2.newAmountDue).toBe(0.0);
    expect(pmt2.status).toBe('paid');
  });

  it('handles overpayment without producing negative amountDue', () => {
    const invoice = {
      total: '100.00',
      amountPaid: '0.00',
    };

    const result = applyPaymentToInvoice(invoice, 150);
    expect(result.newAmountPaid).toBe(150.0);
    expect(result.newAmountDue).toBe(0.0);
    expect(result.status).toBe('paid');
  });
});

describe('Billing Domain: Validation Schemas', () => {
  it('validates invoice creation schema', () => {
    const valid = {
      patientId: '11111111-1111-1111-1111-111111111111',
      locationId: '22222222-2222-2222-2222-222222222222',
      items: [
        {
          description: 'Comprehensive Exam & Cleaning',
          quantity: 1,
          unitPrice: 195.0,
          discount: 0,
        },
      ],
      dueAt: '2026-10-01T00:00:00Z',
    };

    expect(createInvoiceSchema.safeParse(valid).success).toBe(true);

    const invalidNoItems = {
      ...valid,
      items: [],
    };
    expect(createInvoiceSchema.safeParse(invalidNoItems).success).toBe(false);
  });

  it('validates record payment schema', () => {
    const valid = {
      patientId: '11111111-1111-1111-1111-111111111111',
      invoiceId: '33333333-3333-3333-3333-333333333333',
      amount: 150.0,
      method: 'card',
      reference: 'AuthCode-88219',
    };

    expect(recordPaymentSchema.safeParse(valid).success).toBe(true);

    // Negative or zero amount rejected
    const invalidZero = { ...valid, amount: 0 };
    expect(recordPaymentSchema.safeParse(invalidZero).success).toBe(false);

    const invalidNegative = { ...valid, amount: -10 };
    expect(recordPaymentSchema.safeParse(invalidNegative).success).toBe(false);

    // Invalid method rejected
    const invalidMethod = { ...valid, method: 'bitcoin' };
    expect(recordPaymentSchema.safeParse(invalidMethod).success).toBe(false);
  });
});
