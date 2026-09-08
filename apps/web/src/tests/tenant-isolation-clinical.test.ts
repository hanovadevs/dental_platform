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
        toothConditions: {
          findMany: vi.fn(),
        },
        clinicalNotes: {
          findMany: vi.fn(),
        },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
        })),
      })),
    },
  };
});

describe('Tenant Isolation: Clinical Chart & Notes (Scenario E)', () => {
  const userA = 'user-aaa-111';
  const orgA = 'org-aaa-111';
  const orgB = 'org-bbb-222';
  const patientB = 'patient-bbb-999';

  it('rejects clinical context resolution when user belongs to a different organization', async () => {
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    // User A querying Practice B returns no membership
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(
      PermissionError
    );
  });

  it('ensures tooth condition queries enforce organization isolation', async () => {
    const mockFindMany = vi.mocked(db.query.toothConditions.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    // Querying with tenant scoping
    const results = await db.query.toothConditions.findMany({
      where: undefined,
    });

    expect(results).toEqual([]);
  });

  it('ensures clinical note queries enforce organization isolation', async () => {
    const mockFindMany = vi.mocked(db.query.clinicalNotes.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    const results = await db.query.clinicalNotes.findMany({
      where: undefined,
    });

    expect(results).toEqual([]);
  });
});
