'use server';

import { db } from '@dental/db';
import {
  invoices,
  invoiceItems,
  payments,
  patients,
  users,
  locations,
} from '@dental/db';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { eventBus } from '@/lib/events';
import { generateCorrelationId } from '@/lib/utils';
import { formatErrorForClient } from '@/lib/errors';
import {
  createInvoiceSchema,
  recordPaymentSchema,
  CreateInvoiceInput,
  RecordPaymentInput,
} from '../domain/validation';
import { calculateInvoiceTotals, applyPaymentToInvoice } from '../domain/calculations';
import { generateNextInvoiceNumber, generateNextReceiptNumber } from '../domain/invoice-number';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Create a new sequential invoice with line items.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 12).
 */
export async function createInvoice(
  organizationId: string,
  rawInput: CreateInvoiceInput
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'billing.write');

    const parsed = createInvoiceSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.');
        fieldErrors[field] = [...(fieldErrors[field] || []), issue.message];
      }
      return {
        success: false,
        error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    // Verify patient belongs to organization
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, parsed.data.patientId),
        eq(patients.organizationId, organizationId)
      ),
    });
    if (!patient) {
      return { success: false, error: { message: 'Patient not found', code: 'NOT_FOUND' } };
    }

    const totals = calculateInvoiceTotals(parsed.data.items);
    const invoiceNumber = await generateNextInvoiceNumber(organizationId);

    const [newInvoice] = await db
      .insert(invoices)
      .values({
        organizationId,
        locationId: parsed.data.locationId,
        patientId: parsed.data.patientId,
        invoiceNumber,
        status: 'issued',
        currency: 'USD',
        subtotal: totals.subtotal.toFixed(2),
        discountTotal: totals.discountTotal.toFixed(2),
        taxTotal: totals.taxTotal.toFixed(2),
        total: totals.total.toFixed(2),
        amountPaid: '0.00',
        amountDue: totals.total.toFixed(2),
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        notes: parsed.data.notes ?? null,
      })
      .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

    const itemsToInsert = parsed.data.items.map((item) => {
      const qty = Math.max(1, item.quantity || 1);
      const unitPrice = item.unitPrice || 0;
      const discount = item.discount || 0;
      const lineTotal = Math.max(0, qty * unitPrice - qty * discount);

      return {
        invoiceId: newInvoice.id,
        procedureId: item.procedureId ?? null,
        treatmentPlanItemId: item.treatmentPlanItemId ?? null,
        description: item.description,
        quantity: qty,
        unitPrice: unitPrice.toFixed(2),
        discount: discount.toFixed(2),
        total: lineTotal.toFixed(2),
      };
    });

    await db.insert(invoiceItems).values(itemsToInsert);

    const correlationId = generateCorrelationId();
    await createAuditEvent({
      organizationId,
      locationId: parsed.data.locationId,
      actorUserId: session.user.id,
      entityType: 'invoice',
      entityId: newInvoice.id,
      action: AuditActions.INVOICE_CREATED,
      correlationId,
      changedFields: { invoiceNumber, total: totals.total },
    });

    await eventBus.emit('invoice.created', {
      invoiceId: newInvoice.id,
      invoiceNumber,
      patientId: parsed.data.patientId,
      organizationId,
      total: totals.total,
    });

    revalidatePath(`/patients/${parsed.data.patientId}`);
    revalidatePath('/billing');

    return {
      success: true,
      data: { id: newInvoice.id, invoiceNumber: newInvoice.invoiceNumber },
    };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Record a payment against an invoice or patient account.
 * Generates sequential REC-xxxx receipt and updates ledger balances.
 */
export async function recordPayment(
  organizationId: string,
  rawInput: RecordPaymentInput
): Promise<ActionResult<{ id: string; receiptNumber: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'billing.write');

    const parsed = recordPaymentSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.');
        fieldErrors[field] = [...(fieldErrors[field] || []), issue.message];
      }
      return {
        success: false,
        error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    // Verify patient belongs to organization
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, parsed.data.patientId),
        eq(patients.organizationId, organizationId)
      ),
    });
    if (!patient) {
      return { success: false, error: { message: 'Patient not found', code: 'NOT_FOUND' } };
    }

    // If invoiceId provided, verify and update
    let targetInvoice = null;
    if (parsed.data.invoiceId) {
      targetInvoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, parsed.data.invoiceId),
          eq(invoices.organizationId, organizationId)
        ),
      });
      if (!targetInvoice) {
        return { success: false, error: { message: 'Invoice not found', code: 'NOT_FOUND' } };
      }
    }

    const receiptNumber = await generateNextReceiptNumber(organizationId);

    const [paymentRecord] = await db
      .insert(payments)
      .values({
        organizationId,
        patientId: parsed.data.patientId,
        invoiceId: parsed.data.invoiceId ?? null,
        receiptNumber,
        amount: parsed.data.amount.toFixed(2),
        currency: 'USD',
        method: parsed.data.method,
        reference: parsed.data.reference ?? null,
        recordedBy: session.user.id,
        status: 'completed',
        notes: parsed.data.notes ?? null,
      })
      .returning({ id: payments.id, receiptNumber: payments.receiptNumber });

    // Update invoice balance if attached
    if (targetInvoice) {
      const appResult = applyPaymentToInvoice(targetInvoice, parsed.data.amount);
      await db
        .update(invoices)
        .set({
          amountPaid: appResult.newAmountPaid.toFixed(2),
          amountDue: appResult.newAmountDue.toFixed(2),
          status: appResult.status,
        })
        .where(eq(invoices.id, targetInvoice.id));
    }

    const correlationId = generateCorrelationId();
    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'payment',
      entityId: paymentRecord.id,
      action: AuditActions.PAYMENT_RECORDED,
      correlationId,
      changedFields: {
        receiptNumber,
        amount: parsed.data.amount,
        invoiceId: parsed.data.invoiceId,
      },
    });

    await eventBus.emit('payment.recorded', {
      paymentId: paymentRecord.id,
      receiptNumber,
      patientId: parsed.data.patientId,
      invoiceId: parsed.data.invoiceId,
      amount: parsed.data.amount,
      organizationId,
    });

    revalidatePath(`/patients/${parsed.data.patientId}`);
    revalidatePath('/billing');

    return {
      success: true,
      data: { id: paymentRecord.id, receiptNumber: paymentRecord.receiptNumber },
    };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Fetch all invoices for an organization with optional filters.
 */
export async function getInvoices(
  organizationId: string,
  filters?: { patientId?: string; status?: string }
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'billing.read');

    const conditions = [eq(invoices.organizationId, organizationId)];
    if (filters?.patientId) {
      conditions.push(eq(invoices.patientId, filters.patientId));
    }
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'unpaid') {
        conditions.push(sql`${invoices.status} IN ('issued', 'partially_paid')`);
      } else {
        conditions.push(eq(invoices.status, filters.status));
      }
    }

    const invoiceList = await db.query.invoices.findMany({
      where: and(...conditions),
      with: {
        patient: true,
        location: true,
        items: true,
        payments: true,
      },
      orderBy: (invoices, { desc }) => [desc(invoices.issuedAt)],
    });

    return { success: true, data: invoiceList };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Fetch patient financial summary (total billed, total paid, net balance, lists).
 */
export async function getPatientFinancialSummary(
  organizationId: string,
  patientId: string
): Promise<
  ActionResult<{
    totalBilled: number;
    totalPaid: number;
    outstandingBalance: number;
    invoices: any[];
    payments: any[];
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'billing.read');

    const patientInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.patientId, patientId)
      ),
      with: {
        items: true,
        payments: true,
      },
      orderBy: (invoices, { desc }) => [desc(invoices.issuedAt)],
    });

    const patientPayments = await db.query.payments.findMany({
      where: and(
        eq(payments.organizationId, organizationId),
        eq(payments.patientId, patientId)
      ),
      with: {
        recorder: true,
      },
      orderBy: (payments, { desc }) => [desc(payments.paidAt)],
    });

    let totalBilled = 0;
    let totalPaid = 0;

    for (const inv of patientInvoices) {
      totalBilled += parseFloat(inv.total || '0');
    }

    for (const pmt of patientPayments) {
      if (pmt.status === 'completed') {
        totalPaid += parseFloat(pmt.amount || '0');
      }
    }

    const outstandingBalance = Math.max(0, Math.round((totalBilled - totalPaid) * 100) / 100);

    return {
      success: true,
      data: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        outstandingBalance,
        invoices: patientInvoices,
        payments: patientPayments,
      },
    };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Fetch clinic-wide billing metrics for the billing overview dashboard.
 */
export async function getBillingMetrics(
  organizationId: string
): Promise<
  ActionResult<{
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    openInvoicesCount: number;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'billing.read');

    const allInvoices = await db
      .select({
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        amountDue: invoices.amountDue,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));

    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let openInvoicesCount = 0;

    for (const inv of allInvoices) {
      totalBilled += parseFloat(inv.total || '0');
      totalCollected += parseFloat(inv.amountPaid || '0');
      totalOutstanding += parseFloat(inv.amountDue || '0');
      if (inv.status === 'issued' || inv.status === 'partially_paid') {
        openInvoicesCount++;
      }
    }

    return {
      success: true,
      data: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        openInvoicesCount,
      },
    };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}
