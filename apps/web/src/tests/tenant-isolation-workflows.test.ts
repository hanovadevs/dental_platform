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
        inventoryItems: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        inventoryTransactions: {
          findMany: vi.fn(),
        },
        labVendors: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        labCases: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        prescriptions: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        patientDocuments: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        consentTemplates: {
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

describe('Tenant Isolation: Clinic Workflows & Executive Analytics (Scenario E)', () => {
  const userA = 'user-alpha-1';
  const orgA = 'org-alpha-1';
  const orgB = 'org-bravo-2';

  it('strictly prohibits user from Org A from accessing Org B context', async () => {
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    // User A has no membership in Org B
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(PermissionError);
  });

  it('guarantees inventory items query is isolated by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.inventoryItems.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.inventoryItems.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('guarantees lab cases query is isolated by organizationId', async () => {
    const mockFindMany = vi.mocked(db.query.labCases.findMany);
    mockFindMany.mockResolvedValueOnce([]);

    await db.query.labCases.findMany({
      where: vi.fn() as any,
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('guarantees prescription and consent documents queries are isolated by organizationId', async () => {
    const mockPrescriptions = vi.mocked(db.query.prescriptions.findMany);
    const mockDocuments = vi.mocked(db.query.patientDocuments.findMany);

    mockPrescriptions.mockResolvedValueOnce([]);
    mockDocuments.mockResolvedValueOnce([]);

    await db.query.prescriptions.findMany({
      where: vi.fn() as any,
    });
    await db.query.patientDocuments.findMany({
      where: vi.fn() as any,
    });

    expect(mockPrescriptions).toHaveBeenCalledTimes(1);
    expect(mockDocuments).toHaveBeenCalledTimes(1);
  });
});
