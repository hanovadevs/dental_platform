import { db } from '@dental/db';
import { memberships, rolePermissions, permissions, membershipLocations } from '@dental/db';
import { eq, and } from 'drizzle-orm';
import { PermissionError, UnauthenticatedError, NotFoundError } from '../errors';
import type { PermissionCode } from '@dental/db';

/**
 * Resolved session context for a user within a specific organization.
 * Every tenant-sensitive operation must resolve this first.
 */
export interface TenantContext {
  userId: string;
  organizationId: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  locationIds: string[];
  permissions: Set<string>;
}

/**
 * Resolve the tenant context for a user in a given organization.
 * This is the core of tenant isolation — every request must go through this.
 *
 * Per spec (04_SYSTEM_ARCHITECTURE.md Section 4):
 * "Every tenant-sensitive query must be scoped by the authenticated user's organization."
 */
export async function resolveTenantContext(
  userId: string,
  organizationId: string,
): Promise<TenantContext> {
  if (!userId) {
    throw new UnauthenticatedError();
  }

  // Find active membership
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, userId),
      eq(memberships.organizationId, organizationId),
      eq(memberships.status, 'active'),
    ),
    with: {
      // We'll do separate queries for role info
    },
  });

  if (!membership) {
    throw new PermissionError('You are not a member of this organization.');
  }

  // Get role permissions
  const rolePerms = await db
    .select({
      permissionCode: permissions.code,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, membership.roleId));

  const permSet = new Set(rolePerms.map((rp) => rp.permissionCode));

  // Get allowed locations
  const locAccess = await db
    .select({ locationId: membershipLocations.locationId })
    .from(membershipLocations)
    .where(eq(membershipLocations.membershipId, membership.id));

  const locationIds = locAccess.map((l) => l.locationId);

  // Get role name (for display, not for permission checking)
  const { roles } = await import('@dental/db');
  const role = await db.query.roles.findFirst({
    where: eq(roles.id, membership.roleId),
  });

  return {
    userId,
    organizationId,
    membershipId: membership.id,
    roleId: membership.roleId,
    roleName: role?.name ?? 'Unknown',
    locationIds,
    permissions: permSet,
  };
}

/**
 * Check if the tenant context has a specific permission.
 * Throws PermissionError if the permission is not granted.
 *
 * Per spec: "Do not hard-code behavior such as if role === 'receptionist'"
 */
export function requirePermission(
  context: TenantContext,
  permission: PermissionCode,
): void {
  if (!context.permissions.has(permission)) {
    throw new PermissionError(
      `You do not have the required permission: ${permission}`,
    );
  }
}

/**
 * Check if the tenant context has access to a specific location.
 * Empty locationIds means all locations (for owner/admin).
 */
export function requireLocationAccess(
  context: TenantContext,
  locationId: string,
): void {
  // If the user has no specific location restrictions, they have access to all
  if (context.locationIds.length === 0) return;

  if (!context.locationIds.includes(locationId)) {
    throw new PermissionError('You do not have access to this location.');
  }
}

/**
 * Check multiple permissions (all must be present).
 */
export function requireAllPermissions(
  context: TenantContext,
  perms: PermissionCode[],
): void {
  for (const perm of perms) {
    requirePermission(context, perm);
  }
}

/**
 * Check if at least one permission is present.
 */
export function requireAnyPermission(
  context: TenantContext,
  perms: PermissionCode[],
): void {
  const hasAny = perms.some((p) => context.permissions.has(p));
  if (!hasAny) {
    throw new PermissionError(
      `You need one of: ${perms.join(', ')}`,
    );
  }
}
