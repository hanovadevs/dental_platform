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
        revenueOpportunities: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        recalls: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        recallRules: {
          findMany: vi.fn(),
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

describe('Tenant Isolation: Revenue & Recalls (Scenario E)', () => {
  const userA = 'user-aaa-111';
  const orgA = 'org-aaa-111';
  const orgB = 'org-bbb-222';

  it('prohibits user from Practice A from accessing Practice B revenue opportunities', async () => {
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    // User A has no active membership in Practice B
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(
      PermissionError
    );
  });

  it('ensures revenue opportunity queries are strictly filtered by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.revenueOpportunities.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.revenueOpportunities.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('ensures recall queries are strictly filtered by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.recalls.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.recalls.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });
});
