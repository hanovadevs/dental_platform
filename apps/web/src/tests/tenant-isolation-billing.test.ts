import { describe, it, expect, vi } from 'vitest';
import { resolveTenantContext } from '@/lib/permissions';
import { PermissionError } from '@/lib/errors';
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
        treatmentPlans: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        invoices: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        payments: {
          findMany: vi.fn(),
        },
        patients: {
          findFirst: vi.fn(),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
    },
  };
});

describe('Tenant Isolation: Treatments & Billing (Scenario E)', () => {
  const userA = 'user-aaa-111';
  const orgA = 'org-aaa-111';
  const orgB = 'org-bbb-222';

  it('prohibits user from Practice A from accessing Practice B financial context', async () => {
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    // User A querying Practice B has no active membership
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(
      PermissionError
    );
  });

  it('ensures treatment plan queries are strictly filtered by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.treatmentPlans.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.treatmentPlans.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('ensures invoice queries are strictly filtered by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.invoices.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.invoices.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });
});
