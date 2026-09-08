import { describe, it, expect, vi } from 'vitest';
import {
  resolveTenantContext,
  requirePermission,
  requireLocationAccess,
  requireAllPermissions,
  requireAnyPermission,
  type TenantContext,
} from '@/lib/permissions';
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
      },
      select: vi.fn(),
    },
  };
});

describe('Tenant Isolation Tests (Scenario E — Cross-Tenant Attack)', () => {
  const userA = 'user-aaa-111';
  const orgA = 'org-aaa-111';
  const userB = 'user-bbb-222';
  const orgB = 'org-bbb-222';

  it('rejects unauthenticated tenant resolution', async () => {
    await expect(resolveTenantContext('', orgA)).rejects.toThrow(
      UnauthenticatedError
    );
  });

  it('blocks User A from accessing Clinic B (Cross-Tenant Attack)', async () => {
    // Mock db returning null when User A requests Org B
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(
      PermissionError
    );
    await expect(resolveTenantContext(userA, orgB)).rejects.toThrow(
      'You are not a member of this organization.'
    );
  });

  it('blocks deactivated memberships from accessing clinic', async () => {
    // If membership status is not active (e.g. deactivated or invited)
    const mockFindFirst = vi.mocked(db.query.memberships.findFirst);
    mockFindFirst.mockResolvedValueOnce(undefined);

    await expect(resolveTenantContext(userA, orgA)).rejects.toThrow(
      PermissionError
    );
  });

  it('enforces location isolation within an organization', () => {
    const contextWithLocations: TenantContext = {
      userId: userA,
      organizationId: orgA,
      membershipId: 'mem-1',
      roleId: 'role-1',
      roleName: 'Dentist',
      locationIds: ['loc-branch-1'],
      permissions: new Set(['patient.read']),
    };

    // User has access to loc-branch-1
    expect(() =>
      requireLocationAccess(contextWithLocations, 'loc-branch-1')
    ).not.toThrow();

    // User attempts to access loc-branch-2 (cross-branch attack)
    expect(() =>
      requireLocationAccess(contextWithLocations, 'loc-branch-2')
    ).toThrow(PermissionError);
  });

  it('enforces permission matrix on tenant context', () => {
    const receptionistContext: TenantContext = {
      userId: userA,
      organizationId: orgA,
      membershipId: 'mem-1',
      roleId: 'role-receptionist',
      roleName: 'Receptionist',
      locationIds: [],
      permissions: new Set(['patient.read', 'patient.write', 'appointment.write']),
    };

    // Allowed action
    expect(() =>
      requirePermission(receptionistContext, 'patient.read')
    ).not.toThrow();

    // Denied action: clinical write (receptionist should never edit chart)
    expect(() =>
      requirePermission(receptionistContext, 'clinical.write')
    ).toThrow(PermissionError);

    // Denied action: refund (receptionist cannot issue refunds)
    expect(() =>
      requirePermission(receptionistContext, 'billing.refund')
    ).toThrow(PermissionError);
  });

  it('evaluates requireAllPermissions and requireAnyPermission correctly', () => {
    const dentistContext: TenantContext = {
      userId: userB,
      organizationId: orgB,
      membershipId: 'mem-2',
      roleId: 'role-dentist',
      roleName: 'Dentist',
      locationIds: [],
      permissions: new Set(['patient.read', 'clinical.read', 'clinical.write']),
    };

    // All permissions present
    expect(() =>
      requireAllPermissions(dentistContext, ['patient.read', 'clinical.read'])
    ).not.toThrow();

    // Missing one permission
    expect(() =>
      requireAllPermissions(dentistContext, ['patient.read', 'settings.manage'])
    ).toThrow(PermissionError);

    // Any permission satisfied
    expect(() =>
      requireAnyPermission(dentistContext, ['settings.manage', 'clinical.write'])
    ).not.toThrow();

    // None satisfied
    expect(() =>
      requireAnyPermission(dentistContext, ['settings.manage', 'billing.refund'])
    ).toThrow(PermissionError);
  });
});
