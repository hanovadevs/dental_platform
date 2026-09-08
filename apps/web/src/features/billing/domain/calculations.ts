export interface InvoiceLineItemInput {
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface InvoiceCalculatedTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountDue: number;
}

/**
 * Calculates accurate invoice totals with 2-decimal penny rounding.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 12).
 */
export function calculateInvoiceTotals(
  items: InvoiceLineItemInput[],
  taxRatePercent: number = 0
): InvoiceCalculatedTotals {
  let subtotalCents = 0;
  let discountTotalCents = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.round(item.quantity || 1));
    const priceCents = Math.round((item.unitPrice || 0) * 100);
    const discCents = Math.round((item.discount || 0) * 100);

    subtotalCents += qty * priceCents;
    discountTotalCents += qty * Math.min(discCents, priceCents);
  }

  const taxableCents = Math.max(0, subtotalCents - discountTotalCents);
  const taxTotalCents = Math.round((taxableCents * taxRatePercent) / 100);
  const totalCents = taxableCents + taxTotalCents;

  const subtotal = subtotalCents / 100;
  const discountTotal = discountTotalCents / 100;
  const taxTotal = taxTotalCents / 100;
  const total = totalCents / 100;

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total,
    amountDue: total,
  };
}

export interface PaymentApplicationResult {
  newAmountPaid: number;
  newAmountDue: number;
  status: 'partially_paid' | 'paid';
}

/**
 * Applies a payment amount to an existing invoice balance.
 */
export function applyPaymentToInvoice(
  invoice: { total: number | string; amountPaid: number | string },
  paymentAmount: number
): PaymentApplicationResult {
  const total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total;
  const currentPaid = typeof invoice.amountPaid === 'string' ? parseFloat(invoice.amountPaid) : invoice.amountPaid;

  const totalCents = Math.round(total * 100);
  const currentPaidCents = Math.round(currentPaid * 100);
  const paymentCents = Math.round(paymentAmount * 100);

  const newPaidCents = currentPaidCents + paymentCents;
  const newDueCents = Math.max(0, totalCents - newPaidCents);

  const newAmountPaid = newPaidCents / 100;
  const newAmountDue = newDueCents / 100;
  const status = newDueCents <= 0 ? 'paid' : 'partially_paid';

  return {
    newAmountPaid,
    newAmountDue,
    status,
  };
}
