'use server';

import { db } from '@dental/db';
import {
  users,
  memberships,
  membershipLocations,
  staffProfiles,
  dentistProfiles,
  staffAvailability,
  chairs,
} from '@dental/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { eventBus } from '@/lib/events';
import { generateCorrelationId } from '@/lib/utils';
import { formatErrorForClient } from '@/lib/errors';
import {
  createStaffProfileSchema,
  updateStaffProfileSchema,
  updateDentistProfileSchema,
  staffAvailabilitySlotSchema,
  chairSchema,
  type StaffAvailabilitySlotInput,
} from '../domain/validation';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Create a new staff member within an organization.
 * Links user identity, membership, locations, staff profile, and optional dentist profile.
 */
export async function createStaffMember(
  organizationId: string,
  formData: FormData
): Promise<ActionResult<{ staffProfileId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'staff.manage');

    const locationIdsRaw = formData.getAll('locationIds') as string[];
    const raw = {
      email: formData.get('email') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      phone: (formData.get('phone') as string) || undefined,
      jobTitle: formData.get('jobTitle') as string,
      roleId: formData.get('roleId') as string,
      locationIds: locationIdsRaw.length > 0 ? locationIdsRaw : [formData.get('locationId') as string].filter(Boolean),
      isDentist: formData.get('isDentist') === 'true',
      licenseNumber: (formData.get('licenseNumber') as string) || undefined,
      specialty: (formData.get('specialty') as string) || 'General Dentistry',
      defaultAppointmentDuration: formData.get('defaultAppointmentDuration') || 30,
    };

    const parsed = createStaffProfileSchema.safeParse(raw);
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

    // 1. Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: parsed.data.email,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          emailVerified: false,
        })
        .returning();
      user = newUser!;
    }

    // 2. Check if already member
    const existingMembership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.userId, user.id)
      ),
    });

    if (existingMembership) {
      return {
        success: false,
        error: {
          message: 'A user with this email is already a member of this practice.',
          code: 'CONFLICT',
        },
      };
    }

    // 3. Create membership
    const [membership] = await db
      .insert(memberships)
      .values({
        organizationId,
        userId: user.id,
        roleId: parsed.data.roleId,
        status: 'active',
      })
      .returning();

    if (!membership) throw new Error('Failed to create membership');

    // 4. Assign locations
    for (const locId of parsed.data.locationIds) {
      await db.insert(membershipLocations).values({
        membershipId: membership.id,
        locationId: locId,
      });
    }

    // 5. Create staff profile
    const displayName = `${parsed.data.firstName} ${parsed.data.lastName}`;
    const [profile] = await db
      .insert(staffProfiles)
      .values({
        organizationId,
        membershipId: membership.id,
        displayName,
        phone: parsed.data.phone || null,
        jobTitle: parsed.data.jobTitle,
        active: true,
      })
      .returning();

    if (!profile) throw new Error('Failed to create staff profile');

    // 6. Optional dentist profile
    if (parsed.data.isDentist) {
      await db.insert(dentistProfiles).values({
        organizationId,
        staffProfileId: profile.id,
        licenseNumber: parsed.data.licenseNumber || null,
        specialty: parsed.data.specialty,
        defaultAppointmentDuration: parsed.data.defaultAppointmentDuration,
      });
    }

    // 7. Audit log & Event
    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'staff_profile',
      entityId: profile.id,
      action: AuditActions.STAFF_CREATED,
      correlationId,
      changedFields: { displayName, jobTitle: parsed.data.jobTitle },
    });

    eventBus.emit('staff.created', {
      staffProfileId: profile.id,
      organizationId,
      jobTitle: parsed.data.jobTitle,
      isDentist: parsed.data.isDentist,
    });

    return { success: true, data: { staffProfileId: profile.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Update staff profile details.
 */
export async function updateStaffProfile(
  organizationId: string,
  staffProfileId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'staff.manage');

    const raw = {
      displayName: formData.get('displayName') as string,
      phone: (formData.get('phone') as string) || undefined,
      jobTitle: formData.get('jobTitle') as string,
      active: formData.get('active') !== null ? formData.get('active') === 'true' : undefined,
    };

    const parsed = updateStaffProfileSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: 'Please provide valid staff information.', code: 'VALIDATION_ERROR' },
      };
    }

    await db
      .update(staffProfiles)
      .set({
        displayName: parsed.data.displayName,
        phone: parsed.data.phone || null,
        jobTitle: parsed.data.jobTitle,
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(staffProfiles.id, staffProfileId),
          eq(staffProfiles.organizationId, organizationId)
        )
      );

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'staff_profile',
      entityId: staffProfileId,
      action: AuditActions.STAFF_UPDATED,
      changedFields: parsed.data,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Deactivate a staff member.
 */
export async function deactivateStaffMember(
  organizationId: string,
  staffProfileId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'staff.manage');

    const profile = await db.query.staffProfiles.findFirst({
      where: and(
        eq(staffProfiles.id, staffProfileId),
        eq(staffProfiles.organizationId, organizationId)
      ),
    });

    if (!profile) {
      return { success: false, error: { message: 'Staff profile not found.', code: 'NOT_FOUND' } };
    }

    // Deactivate profile
    await db
      .update(staffProfiles)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(staffProfiles.id, staffProfileId));

    // Deactivate membership
    await db
      .update(memberships)
      .set({ status: 'deactivated', updatedAt: new Date() })
      .where(eq(memberships.id, profile.membershipId));

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'staff_profile',
      entityId: staffProfileId,
      action: AuditActions.STAFF_DEACTIVATED,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Update or set dentist clinical profile.
 */
export async function updateDentistProfile(
  organizationId: string,
  staffProfileId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'staff.manage');

    const raw = {
      licenseNumber: (formData.get('licenseNumber') as string) || undefined,
      specialty: formData.get('specialty') as string,
      defaultAppointmentDuration: formData.get('defaultAppointmentDuration') || 30,
    };

    const parsed = updateDentistProfileSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: { message: 'Invalid dentist details.', code: 'VALIDATION_ERROR' } };
    }

    const existing = await db.query.dentistProfiles.findFirst({
      where: and(
        eq(dentistProfiles.staffProfileId, staffProfileId),
        eq(dentistProfiles.organizationId, organizationId)
      ),
    });

    if (existing) {
      await db
        .update(dentistProfiles)
        .set({
          licenseNumber: parsed.data.licenseNumber || null,
          specialty: parsed.data.specialty,
          defaultAppointmentDuration: parsed.data.defaultAppointmentDuration,
          updatedAt: new Date(),
        })
        .where(eq(dentistProfiles.id, existing.id));
    } else {
      await db.insert(dentistProfiles).values({
        organizationId,
        staffProfileId,
        licenseNumber: parsed.data.licenseNumber || null,
        specialty: parsed.data.specialty,
        defaultAppointmentDuration: parsed.data.defaultAppointmentDuration,
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Set recurring weekly availability slots for a practitioner.
 */
export async function setStaffAvailability(
  organizationId: string,
  staffProfileId: string,
  slots: StaffAvailabilitySlotInput[]
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'staff.manage');

    // Remove current availability
    await db
      .delete(staffAvailability)
      .where(
        and(
          eq(staffAvailability.organizationId, organizationId),
          eq(staffAvailability.staffProfileId, staffProfileId)
        )
      );

    // Insert new valid slots
    for (const slot of slots) {
      const parsed = staffAvailabilitySlotSchema.parse(slot);
      await db.insert(staffAvailability).values({
        organizationId,
        staffProfileId,
        locationId: parsed.locationId,
        dayOfWeek: parsed.dayOfWeek,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        active: parsed.active,
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Operating Chairs: Create chair in location.
 */
export async function createChair(
  organizationId: string,
  formData: FormData
): Promise<ActionResult<{ chairId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'settings.manage');

    const raw = {
      locationId: formData.get('locationId') as string,
      name: formData.get('name') as string,
      active: formData.get('active') !== 'false',
    };

    const parsed = chairSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: { message: 'Please provide a valid chair name.', code: 'VALIDATION_ERROR' } };
    }

    const [chair] = await db
      .insert(chairs)
      .values({
        organizationId,
        locationId: parsed.data.locationId,
        name: parsed.data.name,
        active: parsed.data.active,
      })
      .returning();

    if (!chair) throw new Error('Failed to create chair');

    await createAuditEvent({
      organizationId,
      locationId: parsed.data.locationId,
      actorUserId: session.user.id,
      entityType: 'chair',
      entityId: chair.id,
      action: AuditActions.CHAIR_CREATED,
      changedFields: { name: parsed.data.name },
    });

    return { success: true, data: { chairId: chair.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Operating Chairs: Update chair.
 */
export async function updateChair(
  organizationId: string,
  chairId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'settings.manage');

    const name = formData.get('name') as string;
    const active = formData.get('active') !== null ? formData.get('active') === 'true' : undefined;

    if (!name || name.trim().length === 0) {
      return { success: false, error: { message: 'Chair name cannot be empty.', code: 'VALIDATION_ERROR' } };
    }

    await db
      .update(chairs)
      .set({
        name: name.trim(),
        ...(active !== undefined ? { active } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chairs.id, chairId),
          eq(chairs.organizationId, organizationId)
        )
      );

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'chair',
      entityId: chairId,
      action: AuditActions.CHAIR_UPDATED,
      changedFields: { name, active },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
