'use server';

import { db } from '@dental/db';
import {
  patients,
  toothConditions,
  clinicalNotes,
  users,
  medicalAlerts,
  allergies,
  auditEvents,
} from '@dental/db';
import { eq, and, desc, asc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { eventBus } from '@/lib/events';
import { generateCorrelationId } from '@/lib/utils';
import { formatErrorForClient } from '@/lib/errors';
import {
  recordToothConditionSchema,
  createClinicalNoteSchema,
} from '../domain/validation';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Record a new tooth condition or clinical finding on the dental chart.
 * Preserves history: each finding is immutable.
 */
export async function recordToothCondition(
  organizationId: string,
  patientId: string,
  formData: FormData
): Promise<ActionResult<{ conditionId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'clinical.write');

    const raw = {
      toothCode: formData.get('toothCode') as string,
      surface: (formData.get('surface') as string) || undefined,
      conditionType: formData.get('conditionType') as any,
      status: (formData.get('status') as any) || 'diagnosed',
      notes: (formData.get('notes') as string) || undefined,
      supersedesId: (formData.get('supersedesId') as string) || undefined,
    };

    const parsed = recordToothConditionSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field]!.push(issue.message);
      }
      return {
        success: false,
        error: { message: 'Invalid condition entry.', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    const correlationId = generateCorrelationId();

    // If supersedesId is given, deactivate previous condition while preserving row
    if (parsed.data.supersedesId) {
      await db
        .update(toothConditions)
        .set({ active: false })
        .where(
          and(
            eq(toothConditions.id, parsed.data.supersedesId),
            eq(toothConditions.organizationId, organizationId),
            eq(toothConditions.patientId, patientId)
          )
        );
    }

    const [condition] = await db
      .insert(toothConditions)
      .values({
        organizationId,
        patientId,
        toothCode: parsed.data.toothCode,
        surface: parsed.data.surface || null,
        conditionType: parsed.data.conditionType,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        recordedBy: session.user.id,
        supersedesId: parsed.data.supersedesId || null,
        active: true,
      })
      .returning();

    if (!condition) throw new Error('Failed to record tooth condition');

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'tooth_condition',
      entityId: condition.id,
      action: AuditActions.CHART_UPDATED,
      correlationId,
      changedFields: {
        toothCode: parsed.data.toothCode,
        surface: parsed.data.surface,
        conditionType: parsed.data.conditionType,
        status: parsed.data.status,
      },
    });

    eventBus.emit('chart.updated', {
      patientId,
      organizationId,
      toothCode: parsed.data.toothCode,
      conditionType: parsed.data.conditionType,
    });

    return { success: true, data: { conditionId: condition.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Remove / deactivate a tooth condition.
 */
export async function removeToothCondition(
  organizationId: string,
  conditionId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'clinical.write');

    await db
      .update(toothConditions)
      .set({ active: false })
      .where(
        and(
          eq(toothConditions.id, conditionId),
          eq(toothConditions.organizationId, organizationId)
        )
      );

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'tooth_condition',
      entityId: conditionId,
      action: AuditActions.CHART_UPDATED,
      changedFields: { active: false, removed: true },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Create and sign a structured clinical progress note (SOAP).
 */
export async function createClinicalNote(
  organizationId: string,
  patientId: string,
  formData: FormData
): Promise<ActionResult<{ noteId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'clinical.write');

    const raw = {
      dentistId: (formData.get('dentistId') as string) || undefined,
      chiefComplaint: (formData.get('chiefComplaint') as string) || undefined,
      diagnosis: (formData.get('diagnosis') as string) || undefined,
      treatmentProvided: formData.get('treatmentProvided') as string,
      plan: (formData.get('plan') as string) || undefined,
    };

    const parsed = createClinicalNoteSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field]!.push(issue.message);
      }
      return {
        success: false,
        error: { message: 'Please provide treatment provided details.', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    const correlationId = generateCorrelationId();

    const [note] = await db
      .insert(clinicalNotes)
      .values({
        organizationId,
        patientId,
        dentistId: parsed.data.dentistId || null,
        chiefComplaint: parsed.data.chiefComplaint || null,
        diagnosis: parsed.data.diagnosis || null,
        treatmentProvided: parsed.data.treatmentProvided,
        plan: parsed.data.plan || null,
        signedBy: session.user.id,
      })
      .returning();

    if (!note) throw new Error('Failed to create clinical note');

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'clinical_note',
      entityId: note.id,
      action: AuditActions.CLINICAL_NOTE_CHANGED,
      correlationId,
      changedFields: { signedBy: session.user.id },
    });

    eventBus.emit('clinical_note.created', {
      patientId,
      organizationId,
      noteId: note.id,
    });

    return { success: true, data: { noteId: note.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

export interface TimelineEvent {
  id: string;
  type: 'condition' | 'note' | 'alert' | 'allergy' | 'registration';
  title: string;
  description?: string | null;
  severity?: string;
  authorName?: string;
  timestamp: Date;
}

/**
 * Fetch a unified chronological timeline of all clinical and operational events for a patient.
 */
export async function getPatientTimeline(
  organizationId: string,
  patientId: string
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // 1. Patient registration
  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)),
  });

  if (patient) {
    events.push({
      id: `reg-${patient.id}`,
      type: 'registration',
      title: 'Patient Profile Created',
      description: `Registered as #${patient.patientNumber}`,
      timestamp: patient.createdAt,
    });
  }

  // 2. Tooth conditions
  const conditions = await db.query.toothConditions.findMany({
    where: and(
      eq(toothConditions.patientId, patientId),
      eq(toothConditions.organizationId, organizationId)
    ),
    with: {
      recorder: true,
    },
    orderBy: [desc(toothConditions.recordedAt)],
  });

  for (const c of conditions) {
    events.push({
      id: `cond-${c.id}`,
      type: 'condition',
      title: `Tooth ${c.toothCode}: ${c.conditionType.replace('_', ' ')}`,
      description: [
        c.surface ? `Surface: ${c.surface}` : 'Whole tooth',
        `Status: ${c.status}`,
        c.notes ? `Notes: ${c.notes}` : null,
      ]
        .filter(Boolean)
        .join(' • '),
      authorName: c.recorder ? `${c.recorder.firstName} ${c.recorder.lastName}` : undefined,
      timestamp: c.recordedAt,
    });
  }

  // 3. Clinical progress notes
  const notes = await db.query.clinicalNotes.findMany({
    where: and(
      eq(clinicalNotes.patientId, patientId),
      eq(clinicalNotes.organizationId, organizationId)
    ),
    with: {
      author: true,
    },
    orderBy: [desc(clinicalNotes.signedAt)],
  });

  for (const n of notes) {
    events.push({
      id: `note-${n.id}`,
      type: 'note',
      title: 'Clinical Progress Note Signed',
      description: n.treatmentProvided,
      authorName: n.author ? `${n.author.firstName} ${n.author.lastName}` : undefined,
      timestamp: n.signedAt,
    });
  }

  // 4. Medical alerts
  const alerts = await db.query.medicalAlerts.findMany({
    where: and(
      eq(medicalAlerts.patientId, patientId),
      eq(medicalAlerts.organizationId, organizationId)
    ),
    orderBy: [desc(medicalAlerts.createdAt)],
  });

  for (const a of alerts) {
    events.push({
      id: `alert-${a.id}`,
      type: 'alert',
      title: `Medical Alert Recorded: ${a.label}`,
      severity: a.severity,
      description: `Type: ${a.type} • Severity: ${a.severity}`,
      timestamp: a.createdAt,
    });
  }

  // Sort newest first
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
