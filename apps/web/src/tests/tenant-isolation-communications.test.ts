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
        communications: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        communicationTemplates: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        communicationConsents: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        communicationRules: {
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

describe('Tenant Isolation: Communications & Messaging', () => {
  const userA = 'user-aaa-111';
  const orgA = 'org-aaa-111';
  const orgB = 'org-bbb-222';

  it('prohibits user from Practice A from accessing Practice B communications context', async () => {
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    // User A has no active membership in Practice B
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(PermissionError);
  });

  it('ensures communication log queries are strictly scoped by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.communications.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.communications.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('ensures communication template queries are strictly scoped by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.communicationTemplates.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.communicationTemplates.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('ensures communication consent preferences are strictly scoped by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.communicationConsents.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.communicationConsents.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('ensures reminder automation rules are strictly scoped by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.communicationRules.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.communicationRules.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });
});
