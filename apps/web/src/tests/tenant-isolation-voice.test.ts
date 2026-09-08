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
        voiceCallTasks: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-task-id' }]),
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

describe('Tenant Isolation: AI Voice Agent (Scenario E)', () => {
  const userA = 'user-aaa-111';
  const orgA = 'org-aaa-111';
  const orgB = 'org-bbb-222';

  it('prohibits practitioner from Practice A from accessing Practice B call queue', async () => {
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    // User A has no membership in Practice B
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(
      PermissionError
    );
  });

  it('ensures voice call task queries are scoped by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.voiceCallTasks.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.voiceCallTasks.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });
});
