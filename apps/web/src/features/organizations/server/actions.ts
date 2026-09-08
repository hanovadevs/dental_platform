'use server';

import { db } from '@dental/db';
import {
  organizations,
  locations,
  roles,
  permissions,
  rolePermissions,
  memberships,
  membershipLocations,
} from '@dental/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { generateCorrelationId, slugify } from '@/lib/utils';
import { formatErrorForClient } from '@/lib/errors';
import { createOrganizationSchema, createLocationSchema } from '../domain/validation';
import { DEFAULT_ROLES, DEFAULT_PERMISSIONS } from '@dental/db';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Create a new organization (clinic) and set up default roles/permissions.
 * Also creates the first location and assigns the creator as Owner.
 *
 * Per spec request lifecycle (03_IMPLEMENTATION_PLAN.md Section 4):
 * 1. Authenticate user
 * 2. Validate input
 * 3. Execute business rule (create org + roles + membership in transaction)
 * 4. Create audit event
 * 5. Return typed result
 */
export async function createOrganization(
  formData: FormData,
): Promise<ActionResult<{ organizationId: string; locationId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const raw = {
      name: formData.get('name') as string,
      phone: (formData.get('phone') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
      defaultCurrency: (formData.get('defaultCurrency') as string) || 'PKR',
      defaultTimezone: (formData.get('defaultTimezone') as string) || 'Asia/Karachi',
    };

    const parsed = createOrganizationSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field]!.push(issue.message);
      }
      return {
        success: false,
        error: { message: 'Please fix the errors below.', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    const correlationId = generateCorrelationId();
    const slug = slugify(parsed.data.name) + '-' + Date.now().toString(36);

    // Create org
    const [org] = await db
      .insert(organizations)
      .values({
        name: parsed.data.name,
        slug,
        defaultCurrency: parsed.data.defaultCurrency,
        defaultTimezone: parsed.data.defaultTimezone,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
      })
      .returning();

    if (!org) throw new Error('Failed to create organization');

    // Create default location
    const locationName = formData.get('locationName') as string || 'Main Branch';
    const locationAddress = formData.get('locationAddress') as string || '';

    const [location] = await db
      .insert(locations)
      .values({
        organizationId: org.id,
        name: locationName,
        address: locationAddress || null,
        phone: parsed.data.phone || null,
        timezone: parsed.data.defaultTimezone,
      })
      .returning();

    // Ensure permissions exist
    const existingPerms = await db.select().from(permissions);
    const permMap: Record<string, string> = {};
    for (const p of existingPerms) {
      permMap[p.code] = p.id;
    }

    // Insert any missing permissions
    for (const perm of DEFAULT_PERMISSIONS) {
      if (!permMap[perm.code]) {
        const [inserted] = await db
          .insert(permissions)
          .values({
            code: perm.code,
            name: perm.name,
            description: `Permission: ${perm.name}`,
            module: perm.module,
          })
          .onConflictDoNothing({ target: permissions.code })
          .returning();
        if (inserted) {
          permMap[perm.code] = inserted.id;
        }
      }
    }

    // Create roles for this organization
    const roleMap: Record<string, string> = {};
    for (const [roleName, roleDef] of Object.entries(DEFAULT_ROLES)) {
      const [role] = await db
        .insert(roles)
        .values({
          organizationId: org.id,
          name: roleName,
          description: roleDef.description,
          isSystem: 'true',
        })
        .returning();

      if (role) {
        roleMap[roleName] = role.id;
        for (const permCode of roleDef.permissions) {
          const permId = permMap[permCode];
          if (permId) {
            await db.insert(rolePermissions).values({
              roleId: role.id,
              permissionId: permId,
            }).onConflictDoNothing();
          }
        }
      }
    }

    // Create Owner membership for current user
    const ownerRoleId = roleMap['Owner'];
    if (!ownerRoleId) throw new Error('Owner role not created');

    const [membership] = await db
      .insert(memberships)
      .values({
        organizationId: org.id,
        userId: session.user.id,
        roleId: ownerRoleId,
        status: 'active',
      })
      .returning();

    // Grant location access
    if (membership && location) {
      await db.insert(membershipLocations).values({
        membershipId: membership.id,
        locationId: location.id,
      });
    }

    // Audit
    await createAuditEvent({
      organizationId: org.id,
      actorUserId: session.user.id,
      entityType: 'organization',
      entityId: org.id,
      action: AuditActions.ORGANIZATION_CREATED,
      correlationId,
    });

    await createAuditEvent({
      organizationId: org.id,
      locationId: location?.id,
      actorUserId: session.user.id,
      entityType: 'location',
      entityId: location!.id,
      action: AuditActions.LOCATION_CREATED,
      correlationId,
    });

    return {
      success: true,
      data: { organizationId: org.id, locationId: location!.id },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Create a new location within an existing organization.
 */
export async function createLocation(
  organizationId: string,
  formData: FormData,
): Promise<ActionResult<{ locationId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    // Resolve tenant + check permission
    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'settings.manage');

    const raw = {
      name: formData.get('name') as string,
      address: (formData.get('address') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      timezone: (formData.get('timezone') as string) || 'Asia/Karachi',
    };

    const parsed = createLocationSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field]!.push(issue.message);
      }
      return {
        success: false,
        error: { message: 'Please fix the errors below.', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    const correlationId = generateCorrelationId();

    const [location] = await db
      .insert(locations)
      .values({
        organizationId,
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        timezone: parsed.data.timezone,
      })
      .returning();

    if (!location) throw new Error('Failed to create location');

    await createAuditEvent({
      organizationId,
      locationId: location.id,
      actorUserId: session.user.id,
      entityType: 'location',
      entityId: location.id,
      action: AuditActions.LOCATION_CREATED,
      correlationId,
    });

    return { success: true, data: { locationId: location.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
