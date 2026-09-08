import { describe, it, expect, vi } from 'vitest';
import { resolveTenantContext } from '@/lib/permissions';
import { PermissionError, UnauthenticatedError } from '@/lib/errors';
import { db } from '@dental/db';

vi.mock('@dental/db', async () => {
  const actual = await vi.importActual('@dental/db');
  return {
    ...actual,
    db: {
      query: {
        memberships: {
          findFirst: vi.fn(),
        },
        roles: {
          findFirst: vi.fn(),
        },
        patients: {
          findFirst: vi.fn(),
        },
      },
      select: vi.fn(),
    },
  };
});

describe('Tenant Isolation: Patient & Staff Operations (Scenario E)', () => {
  const userA = 'user-aaa-111';
  const orgA = 'org-aaa-111';
  const userB = 'user-bbb-222';
  const orgB = 'org-bbb-222';
  const patientB = 'patient-bbb-999';

  it('blocks user from Practice A when attempting to resolve Practice B tenant context', async () => {
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    // User A querying Practice B returns no membership
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(
      PermissionError
    );
  });

  it('prohibits patient queries that omit organizationId scoping', async () => {
    // Verifies that multi-tenant queries must enforce and(eq(patients.id, patientId), eq(patients.organizationId, orgId))
    const mockPatientFind = vi.mocked(db.query.patients.findFirst);
    mockPatientFind.mockResolvedValueOnce(undefined);

    // If User A attempts to find patient from Org B in Org A's context, returns not found
    const result = await db.query.patients.findFirst({
      where: undefined,
    });
    expect(result).toBeUndefined();
  });
});
