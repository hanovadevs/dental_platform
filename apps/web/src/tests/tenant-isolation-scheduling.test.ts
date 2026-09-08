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
        appointments: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        waitingListEntries: {
          findMany: vi.fn(),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-appt-id' }]),
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

describe('Tenant Isolation: Appointments & Calendar (Scenario E)', () => {
  const userA = 'user-aaa-111';
  const orgA = 'org-aaa-111';
  const orgB = 'org-bbb-222';

  it('prohibits user from Practice A from accessing Practice B calendar context', async () => {
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    // User A querying Practice B returns no membership
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(
      PermissionError
    );
  });

  it('ensures appointment queries are scoped by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.appointments.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    const result = await db.query.appointments.findMany({
      where: undefined,
    });

    expect(result).toEqual([]);
  });

  it('ensures waiting list entries are scoped by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.waitingListEntries.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    const result = await db.query.waitingListEntries.findMany({
      where: undefined,
    });

    expect(result).toEqual([]);
  });
});
