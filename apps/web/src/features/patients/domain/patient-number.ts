import { db } from '@dental/db';
import { patients } from '@dental/db';
import { eq, sql } from 'drizzle-orm';

/**
 * Generate a sequential, human-friendly patient identifier for an organization.
 * Format: P-1001, P-1002, etc.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 4).
 */
export async function generateNextPatientNumber(organizationId: string): Promise<string> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(patients)
    .where(eq(patients.organizationId, organizationId));

  const count = result?.count ?? 0;
  const nextNum = 1001 + count;
  return `P-${nextNum}`;
}
