import { db } from '@dental/db';
import { invoices, payments } from '@dental/db';
import { eq, sql } from 'drizzle-orm';

/**
 * Generate a sequential, human-friendly invoice identifier for an organization.
 * Format: INV-1001, INV-1002, etc.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 12).
 */
export async function generateNextInvoiceNumber(organizationId: string): Promise<string> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));

  const count = result?.count ?? 0;
  const nextNum = 1001 + count;
  return `INV-${nextNum}`;
}

/**
 * Generate a sequential, human-friendly receipt identifier for an organization.
 * Format: REC-1001, REC-1002, etc.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 12).
 */
export async function generateNextReceiptNumber(organizationId: string): Promise<string> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(eq(payments.organizationId, organizationId));

  const count = result?.count ?? 0;
  const nextNum = 1001 + count;
  return `REC-${nextNum}`;
}
