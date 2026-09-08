'use server';

import { db } from '@dental/db';
import {
  appointments,
  appointmentStatusHistory,
  appointmentTypes,
  waitingListEntries,
  chairs,
  staffProfiles,
  patients,
} from '@dental/db';
import { eq, and, ne, notInArray, desc, gte, lte } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { eventBus } from '@/lib/events';
import { generateCorrelationId } from '@/lib/utils';
import { formatErrorForClient } from '@/lib/errors';
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  transitionAppointmentStatusSchema,
  createWaitingListEntrySchema,
  createAppointmentTypeSchema,
} from '../domain/validation';
import {
  calculateEndTime,
  findChairConflict,
  findDentistConflict,
} from '../domain/conflicts';
import { DEFAULT_APPOINTMENT_TYPES } from '../domain/types';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Ensures default appointment categories exist for the practice.
 */
export async function ensureDefaultAppointmentTypes(organizationId: string): Promise<void> {
  const existing = await db
    .select({ id: appointmentTypes.id })
    .from(appointmentTypes)
    .where(eq(appointmentTypes.organizationId, organizationId))
    .limit(1);

  if (existing.length === 0) {
    for (const item of DEFAULT_APPOINTMENT_TYPES) {
      await db.insert(appointmentTypes).values({
        organizationId,
        name: item.name,
        durationMinutes: item.durationMinutes,
        color: item.color,
      });
    }
  }
}

/**
 * Book / Create a new dental appointment.
 * Enforces multi-tenant isolation, chair conflict prevention, and dentist conflict prevention.
 */
export async function createAppointment(
  organizationId: string,
  formData: FormData
): Promise<ActionResult<{ appointmentId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'appointment.write');

    const raw = {
      patientId: formData.get('patientId') as string,
      locationId: formData.get('locationId') as string,
      chairId: formData.get('chairId') as string,
      dentistId: formData.get('dentistId') as string,
      appointmentTypeId: formData.get('appointmentTypeId') as string,
      startAt: formData.get('startAt') as string,
      durationMinutes: formData.get('durationMinutes') as string,
      notes: (formData.get('notes') as string) || undefined,
      source: (formData.get('source') as any) || 'reception',
    };

    const parsed = createAppointmentSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field]!.push(issue.message);
      }
      return {
        success: false,
        error: { message: 'Invalid appointment details.', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    const startAt = new Date(parsed.data.startAt);
    const endAt = calculateEndTime(startAt, parsed.data.durationMinutes);

    // 1. Fetch potential overlapping active appointments for this organization
    const activeAppointments = await db
      .select({
        id: appointments.id,
        chairId: appointments.chairId,
        dentistId: appointments.dentistId,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          notInArray(appointments.status, ['cancelled', 'no_show'])
        )
      );

    // 2. Check chair conflict
    const chairConflict = findChairConflict(
      activeAppointments,
      parsed.data.chairId,
      startAt,
      endAt
    );
    if (chairConflict) {
      return {
        success: false,
        error: {
          message: 'The selected dental chair is already booked during this time slot.',
          code: 'CHAIR_CONFLICT',
        },
      };
    }

    // 3. Check dentist conflict
    const dentistConflict = findDentistConflict(
      activeAppointments,
      parsed.data.dentistId,
      startAt,
      endAt
    );
    if (dentistConflict) {
      return {
        success: false,
        error: {
          message: 'The treating practitioner already has another appointment scheduled during this time.',
          code: 'DENTIST_CONFLICT',
        },
      };
    }

    const correlationId = generateCorrelationId();

    // 4. Insert Appointment
    const [newAppt] = await db
      .insert(appointments)
      .values({
        organizationId,
        locationId: parsed.data.locationId,
        patientId: parsed.data.patientId,
        dentistId: parsed.data.dentistId,
        chairId: parsed.data.chairId,
        appointmentTypeId: parsed.data.appointmentTypeId,
        startAt,
        endAt,
        status: 'scheduled',
        confirmationStatus: 'unconfirmed',
        source: parsed.data.source,
        notes: parsed.data.notes || null,
        createdBy: session.user.id,
      })
      .returning();

    if (!newAppt) throw new Error('Failed to create appointment');

    // 5. Append initial status to history
    await db.insert(appointmentStatusHistory).values({
      organizationId,
      appointmentId: newAppt.id,
      fromStatus: null,
      toStatus: 'scheduled',
      reason: 'Initial booking',
      changedBy: session.user.id,
    });

    // 6. Audit & Domain Event
    await createAuditEvent({
      organizationId,
      locationId: parsed.data.locationId,
      actorUserId: session.user.id,
      entityType: 'appointment',
      entityId: newAppt.id,
      action: AuditActions.APPOINTMENT_CREATED,
      correlationId,
      changedFields: {
        patientId: parsed.data.patientId,
        chairId: parsed.data.chairId,
        dentistId: parsed.data.dentistId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
    });

    eventBus.emit('appointment.created', {
      appointmentId: newAppt.id,
      organizationId,
      patientId: parsed.data.patientId,
      startAt: startAt.toISOString(),
    });

    return { success: true, data: { appointmentId: newAppt.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Transition appointment status along the clinical reception workflow.
 * ('scheduled' -> 'confirmed' -> 'checked_in' -> 'in_chair' -> 'completed' -> 'cancelled' -> 'no_show')
 * Mandatory cancellation reason preserved per Scenario C.
 */
export async function transitionAppointmentStatus(
  organizationId: string,
  appointmentId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'appointment.write');

    const raw = {
      targetStatus: formData.get('targetStatus') as string,
      reason: (formData.get('reason') as string) || undefined,
    };

    const parsed = transitionAppointmentStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message || 'Invalid status transition.',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    const current = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, appointmentId),
        eq(appointments.organizationId, organizationId)
      ),
    });

    if (!current) {
      return { success: false, error: { message: 'Appointment not found.', code: 'NOT_FOUND' } };
    }

    const correlationId = generateCorrelationId();

    // 1. Update appointment row
    await db
      .update(appointments)
      .set({
        status: parsed.data.targetStatus,
        cancellationReason: parsed.data.targetStatus === 'cancelled' ? parsed.data.reason : current.cancellationReason,
        confirmationStatus:
          parsed.data.targetStatus === 'confirmed' ? 'confirmed_clinic' : current.confirmationStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.organizationId, organizationId)));

    // 2. Append immutable status transition history
    await db.insert(appointmentStatusHistory).values({
      organizationId,
      appointmentId,
      fromStatus: current.status,
      toStatus: parsed.data.targetStatus,
      reason: parsed.data.reason || null,
      changedBy: session.user.id,
    });

    // 3. Audit & Domain Event
    const isCancel = parsed.data.targetStatus === 'cancelled';
    await createAuditEvent({
      organizationId,
      locationId: current.locationId,
      actorUserId: session.user.id,
      entityType: 'appointment',
      entityId: appointmentId,
      action: isCancel ? AuditActions.APPOINTMENT_CANCELLED : AuditActions.APPOINTMENT_STATUS_CHANGED || 'appointment.status_changed',
      reason: parsed.data.reason,
      correlationId,
      changedFields: { fromStatus: current.status, toStatus: parsed.data.targetStatus },
    });

    eventBus.emit(isCancel ? 'appointment.cancelled' : 'appointment.status_changed', {
      appointmentId,
      organizationId,
      fromStatus: current.status,
      toStatus: parsed.data.targetStatus,
      reason: parsed.data.reason,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Reschedule an existing appointment to a new time, chair, or dentist.
 * Checks for conflicts and logs transition history.
 */
export async function rescheduleAppointment(
  organizationId: string,
  appointmentId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'appointment.write');

    const current = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, appointmentId),
        eq(appointments.organizationId, organizationId)
      ),
    });

    if (!current) {
      return { success: false, error: { message: 'Appointment not found.', code: 'NOT_FOUND' } };
    }

    const raw = {
      startAt: formData.get('startAt') as string,
      durationMinutes: formData.get('durationMinutes') as string,
      chairId: (formData.get('chairId') as string) || current.chairId,
      dentistId: (formData.get('dentistId') as string) || current.dentistId,
      reason: (formData.get('reason') as string) || undefined,
    };

    const parsed = rescheduleAppointmentSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: parsed.error.issues[0]?.message || 'Invalid reschedule request.', code: 'VALIDATION_ERROR' },
      };
    }

    const startAt = new Date(parsed.data.startAt);
    const endAt = calculateEndTime(startAt, parsed.data.durationMinutes);
    const targetChairId = parsed.data.chairId || current.chairId;
    const targetDentistId = parsed.data.dentistId || current.dentistId;

    // Overlap checks excluding current appointment
    const activeAppointments = await db
      .select({
        id: appointments.id,
        chairId: appointments.chairId,
        dentistId: appointments.dentistId,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          ne(appointments.id, appointmentId),
          notInArray(appointments.status, ['cancelled', 'no_show'])
        )
      );

    const chairConflict = findChairConflict(activeAppointments, targetChairId, startAt, endAt, appointmentId);
    if (chairConflict) {
      return { success: false, error: { message: 'Dental chair is busy during the requested time.', code: 'CHAIR_CONFLICT' } };
    }

    const dentistConflict = findDentistConflict(activeAppointments, targetDentistId, startAt, endAt, appointmentId);
    if (dentistConflict) {
      return { success: false, error: { message: 'Practitioner already has an appointment during this slot.', code: 'DENTIST_CONFLICT' } };
    }

    // Update appointment
    await db
      .update(appointments)
      .set({
        startAt,
        endAt,
        chairId: targetChairId,
        dentistId: targetDentistId,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.organizationId, organizationId)));

    // Record status history
    await db.insert(appointmentStatusHistory).values({
      organizationId,
      appointmentId,
      fromStatus: current.status,
      toStatus: current.status,
      reason: parsed.data.reason ? `Rescheduled: ${parsed.data.reason}` : 'Rescheduled time or chair',
      changedBy: session.user.id,
    });

    eventBus.emit('appointment.rescheduled', {
      appointmentId,
      organizationId,
      newStartAt: startAt.toISOString(),
      newEndAt: endAt.toISOString(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Add a patient to the waiting list for cancellation fill (ChairFill).
 */
export async function addToWaitingList(
  organizationId: string,
  formData: FormData
): Promise<ActionResult<{ entryId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'appointment.write');

    const raw = {
      patientId: formData.get('patientId') as string,
      locationId: formData.get('locationId') as string,
      preferredDentistId: (formData.get('preferredDentistId') as string) || undefined,
      appointmentTypeId: (formData.get('appointmentTypeId') as string) || undefined,
      priority: (formData.get('priority') as any) || 'normal',
      notes: (formData.get('notes') as string) || undefined,
    };

    const parsed = createWaitingListEntrySchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: { message: 'Invalid waiting list entry.', code: 'VALIDATION_ERROR' } };
    }

    const [entry] = await db
      .insert(waitingListEntries)
      .values({
        organizationId,
        locationId: parsed.data.locationId,
        patientId: parsed.data.patientId,
        preferredDentistId: parsed.data.preferredDentistId || null,
        appointmentTypeId: parsed.data.appointmentTypeId || null,
        priority: parsed.data.priority,
        status: 'waiting',
        notes: parsed.data.notes || null,
      })
      .returning();

    if (!entry) throw new Error('Failed to create waiting list entry');

    return { success: true, data: { entryId: entry.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
