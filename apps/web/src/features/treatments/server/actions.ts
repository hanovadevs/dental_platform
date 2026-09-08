'use server';

import { db } from '@dental/db';
import {
  treatmentDefinitions,
  treatmentPlans,
  treatmentPlanItems,
  procedures,
  patients,
  staffProfiles,
  users,
} from '@dental/db';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { eventBus } from '@/lib/events';
import { generateCorrelationId } from '@/lib/utils';
import { formatErrorForClient } from '@/lib/errors';
import {
  createTreatmentDefinitionSchema,
  createTreatmentPlanSchema,
  updatePlanItemStatusSchema,
  completeTreatmentItemSchema,
  CreateTreatmentPlanInput,
  CreateTreatmentDefinitionInput,
  UpdatePlanItemStatusInput,
  CompleteTreatmentItemInput,
} from '../domain/validation';
import { calculatePlanRollups, derivePlanStatus } from '../domain/rollups';
import { DEFAULT_TREATMENT_CATALOG } from '../domain/types';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Ensures the organization has standard default treatments in its catalog.
 */
export async function ensureDefaultTreatmentCatalog(
  organizationId: string
): Promise<void> {
  const existing = await db
    .select({ id: treatmentDefinitions.id })
    .from(treatmentDefinitions)
    .where(eq(treatmentDefinitions.organizationId, organizationId))
    .limit(1);

  if (existing.length === 0) {
    const toInsert = DEFAULT_TREATMENT_CATALOG.map((item) => ({
      organizationId,
      code: item.code,
      name: item.name,
      category: item.category,
      defaultDurationMinutes: item.defaultDurationMinutes,
      defaultPrice: item.defaultPrice,
      currency: 'USD',
      toothSpecific: item.toothSpecific,
      surfaceSpecific: item.surfaceSpecific,
      active: true,
    }));
    await db.insert(treatmentDefinitions).values(toInsert);
  }
}

/**
 * Get all active treatment definitions for an organization.
 */
export async function getTreatmentDefinitions(
  organizationId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.read');

    await ensureDefaultTreatmentCatalog(organizationId);

    const catalog = await db
      .select()
      .from(treatmentDefinitions)
      .where(
        and(
          eq(treatmentDefinitions.organizationId, organizationId),
          eq(treatmentDefinitions.active, true)
        )
      )
      .orderBy(asc(treatmentDefinitions.category), asc(treatmentDefinitions.name));

    return { success: true, data: catalog };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Add a new treatment definition to the clinic catalog.
 */
export async function createTreatmentDefinition(
  organizationId: string,
  rawInput: CreateTreatmentDefinitionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.catalog');

    const parsed = createTreatmentDefinitionSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.');
        fieldErrors[field] = [...(fieldErrors[field] || []), issue.message];
      }
      return {
        success: false,
        error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    const [created] = await db
      .insert(treatmentDefinitions)
      .values({
        organizationId,
        code: parsed.data.code.toUpperCase(),
        name: parsed.data.name,
        category: parsed.data.category,
        defaultDurationMinutes: parsed.data.defaultDurationMinutes,
        defaultPrice: parsed.data.defaultPrice.toFixed(2),
        currency: parsed.data.currency,
        toothSpecific: parsed.data.toothSpecific,
        surfaceSpecific: parsed.data.surfaceSpecific,
        active: true,
      })
      .returning({ id: treatmentDefinitions.id });

    revalidatePath('/treatments');
    return { success: true, data: { id: created.id } };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Fetch all treatment plans for a patient with items and financial rollups.
 */
export async function getTreatmentPlansForPatient(
  organizationId: string,
  patientId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.read');

    const plans = await db.query.treatmentPlans.findMany({
      where: and(
        eq(treatmentPlans.organizationId, organizationId),
        eq(treatmentPlans.patientId, patientId)
      ),
      with: {
        dentist: {
          with: {
            membership: {
              with: {
                user: true,
              },
            },
          },
        },
        location: true,
        items: {
          with: {
            treatmentDefinition: true,
          },
          orderBy: (items, { asc }) => [asc(items.sequence)],
        },
      },
      orderBy: (plans, { desc }) => [desc(plans.createdAt)],
    });

    const enrichedPlans = plans.map((plan) => {
      const rollups = calculatePlanRollups(plan.items);
      return {
        ...plan,
        rollups,
      };
    });

    return { success: true, data: enrichedPlans };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Fetch a single treatment plan by ID with rollups.
 */
export async function getTreatmentPlanById(
  organizationId: string,
  planId: string
): Promise<ActionResult<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.read');

    const plan = await db.query.treatmentPlans.findFirst({
      where: and(
        eq(treatmentPlans.organizationId, organizationId),
        eq(treatmentPlans.id, planId)
      ),
      with: {
        dentist: {
          with: {
            membership: {
              with: {
                user: true,
              },
            },
          },
        },
        location: true,
        items: {
          with: {
            treatmentDefinition: true,
          },
          orderBy: (items, { asc }) => [asc(items.sequence)],
        },
      },
    });

    if (!plan) {
      return { success: false, error: { message: 'Treatment plan not found', code: 'NOT_FOUND' } };
    }

    const rollups = calculatePlanRollups(plan.items);
    return { success: true, data: { ...plan, rollups } };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Create a new treatment plan with line items.
 */
export async function createTreatmentPlan(
  organizationId: string,
  rawInput: CreateTreatmentPlanInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.write');

    const parsed = createTreatmentPlanSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.');
        fieldErrors[field] = [...(fieldErrors[field] || []), issue.message];
      }
      return {
        success: false,
        error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields: fieldErrors },
      };
    }

    // Verify patient belongs to organization
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, parsed.data.patientId),
        eq(patients.organizationId, organizationId)
      ),
    });
    if (!patient) {
      return { success: false, error: { message: 'Patient not found', code: 'NOT_FOUND' } };
    }

    const [newPlan] = await db
      .insert(treatmentPlans)
      .values({
        organizationId,
        locationId: parsed.data.locationId,
        patientId: parsed.data.patientId,
        dentistId: parsed.data.dentistId,
        title: parsed.data.title,
        status: 'draft',
        notes: parsed.data.notes ?? null,
      })
      .returning({ id: treatmentPlans.id });

    // Insert line items
    const itemsToInsert = parsed.data.items.map((item, idx) => ({
      treatmentPlanId: newPlan.id,
      treatmentDefinitionId: item.treatmentDefinitionId,
      toothCode: item.toothCode ?? null,
      surface: item.surface ?? null,
      sequence: item.sequence || idx + 1,
      priority: item.priority || 'normal',
      price: item.price.toFixed(2),
      discount: (item.discount || 0).toFixed(2),
      status: 'proposed',
      notes: item.notes ?? null,
    }));

    await db.insert(treatmentPlanItems).values(itemsToInsert);

    const correlationId = generateCorrelationId();
    await createAuditEvent({
      organizationId,
      locationId: parsed.data.locationId,
      actorUserId: session.user.id,
      entityType: 'treatment_plan',
      entityId: newPlan.id,
      action: AuditActions.TREATMENT_PLAN_CREATED,
      correlationId,
    });

    await eventBus.emit('treatment_plan.created', {
      planId: newPlan.id,
      patientId: parsed.data.patientId,
      organizationId,
      itemCount: itemsToInsert.length,
    });

    revalidatePath(`/patients/${parsed.data.patientId}`);
    revalidatePath('/treatments');

    return { success: true, data: { id: newPlan.id } };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Present treatment plan to patient.
 */
export async function presentTreatmentPlan(
  organizationId: string,
  planId: string
): Promise<ActionResult<{ id: string; presentedAt: Date }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.write');

    const plan = await db.query.treatmentPlans.findFirst({
      where: and(
        eq(treatmentPlans.id, planId),
        eq(treatmentPlans.organizationId, organizationId)
      ),
    });

    if (!plan) {
      return { success: false, error: { message: 'Treatment plan not found', code: 'NOT_FOUND' } };
    }

    const presentedAt = new Date();
    const nextStatus = plan.status === 'draft' ? 'presented' : plan.status;

    await db
      .update(treatmentPlans)
      .set({
        status: nextStatus,
        presentedAt,
        updatedAt: presentedAt,
      })
      .where(eq(treatmentPlans.id, planId));

    await createAuditEvent({
      organizationId,
      locationId: plan.locationId,
      actorUserId: session.user.id,
      entityType: 'treatment_plan',
      entityId: planId,
      action: AuditActions.TREATMENT_PLAN_PRESENTED,
      changedFields: { status: nextStatus, presentedAt },
    });

    await eventBus.emit('treatment_plan.presented', {
      planId,
      patientId: plan.patientId,
      organizationId,
      presentedAt,
    });

    revalidatePath(`/patients/${plan.patientId}`);
    revalidatePath('/treatments');

    return { success: true, data: { id: planId, presentedAt } };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Update an individual treatment plan item's status (e.g. accepted, declined, deferred).
 */
export async function updatePlanItemStatus(
  organizationId: string,
  rawInput: UpdatePlanItemStatusInput
): Promise<ActionResult<{ id: string; newStatus: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.write');

    const parsed = updatePlanItemStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } };
    }

    const item = await db.query.treatmentPlanItems.findFirst({
      where: eq(treatmentPlanItems.id, parsed.data.itemId),
      with: {
        treatmentPlan: true,
      },
    });

    if (!item || item.treatmentPlan.organizationId !== organizationId) {
      return { success: false, error: { message: 'Treatment plan item not found', code: 'NOT_FOUND' } };
    }

    const updateFields: any = {
      status: parsed.data.status,
    };
    if (parsed.data.status === 'accepted') {
      updateFields.acceptedAt = new Date();
    }
    if (parsed.data.notes) {
      updateFields.notes = parsed.data.notes;
    }

    await db
      .update(treatmentPlanItems)
      .set(updateFields)
      .where(eq(treatmentPlanItems.id, parsed.data.itemId));

    // Get all items to update parent plan status
    const allItems = await db
      .select({ status: treatmentPlanItems.status })
      .from(treatmentPlanItems)
      .where(eq(treatmentPlanItems.treatmentPlanId, item.treatmentPlanId));

    const derivedStatus = derivePlanStatus(
      item.treatmentPlan.status as any,
      allItems.map((i) => (i.status === parsed.data.itemId ? { status: parsed.data.status } : i))
    );

    await db
      .update(treatmentPlans)
      .set({
        status: derivedStatus,
        updatedAt: new Date(),
      })
      .where(eq(treatmentPlans.id, item.treatmentPlanId));

    await createAuditEvent({
      organizationId,
      locationId: item.treatmentPlan.locationId,
      actorUserId: session.user.id,
      entityType: 'treatment_plan_item',
      entityId: parsed.data.itemId,
      action: AuditActions.TREATMENT_ITEM_UPDATED,
      changedFields: { status: parsed.data.status, planStatus: derivedStatus },
    });

    revalidatePath(`/patients/${item.treatmentPlan.patientId}`);
    revalidatePath('/treatments');

    return { success: true, data: { id: parsed.data.itemId, newStatus: parsed.data.status } };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Mark a treatment plan item as completed and record the clinical Procedure record.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 11 & Scenario A).
 */
export async function completeTreatmentItem(
  organizationId: string,
  rawInput: CompleteTreatmentItemInput
): Promise<ActionResult<{ procedureId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.write');

    const parsed = completeTreatmentItemSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } };
    }

    const item = await db.query.treatmentPlanItems.findFirst({
      where: eq(treatmentPlanItems.id, parsed.data.itemId),
      with: {
        treatmentPlan: true,
      },
    });

    if (!item || item.treatmentPlan.organizationId !== organizationId) {
      return { success: false, error: { message: 'Treatment plan item not found', code: 'NOT_FOUND' } };
    }

    const now = new Date();

    // 1. Mark plan item completed
    await db
      .update(treatmentPlanItems)
      .set({
        status: 'completed',
        completedAt: now,
      })
      .where(eq(treatmentPlanItems.id, parsed.data.itemId));

    // 2. Insert clinical Procedure record
    const [procedure] = await db
      .insert(procedures)
      .values({
        organizationId,
        patientId: item.treatmentPlan.patientId,
        appointmentId: parsed.data.appointmentId ?? null,
        treatmentPlanItemId: item.id,
        treatmentDefinitionId: item.treatmentDefinitionId,
        dentistId: parsed.data.dentistId,
        toothCode: parsed.data.toothCode ?? item.toothCode ?? null,
        surface: parsed.data.surface ?? item.surface ?? null,
        performedAt: now,
        notes: parsed.data.notes ?? null,
      })
      .returning({ id: procedures.id });

    // 3. Recalculate parent plan status
    const allItems = await db
      .select({ status: treatmentPlanItems.status })
      .from(treatmentPlanItems)
      .where(eq(treatmentPlanItems.treatmentPlanId, item.treatmentPlanId));

    const derivedStatus = derivePlanStatus(
      item.treatmentPlan.status as any,
      allItems.map((i) => (i.status === parsed.data.itemId ? { status: 'completed' } : i))
    );

    await db
      .update(treatmentPlans)
      .set({
        status: derivedStatus,
        updatedAt: now,
      })
      .where(eq(treatmentPlans.id, item.treatmentPlanId));

    // 4. Audit event
    await createAuditEvent({
      organizationId,
      locationId: item.treatmentPlan.locationId,
      actorUserId: session.user.id,
      entityType: 'procedure',
      entityId: procedure.id,
      action: AuditActions.PROCEDURE_PERFORMED,
      changedFields: {
        treatmentPlanItemId: item.id,
        performedAt: now,
      },
    });

    await eventBus.emit('treatment.completed', {
      procedureId: procedure.id,
      patientId: item.treatmentPlan.patientId,
      organizationId,
      treatmentDefinitionId: item.treatmentDefinitionId,
    });

    revalidatePath(`/patients/${item.treatmentPlan.patientId}`);
    revalidatePath('/treatments');

    return { success: true, data: { procedureId: procedure.id } };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}

/**
 * Fetch all clinical procedures completed for a patient.
 */
export async function getPatientProcedures(
  organizationId: string,
  patientId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'treatment.read');

    const procedureList = await db.query.procedures.findMany({
      where: and(
        eq(procedures.organizationId, organizationId),
        eq(procedures.patientId, patientId)
      ),
      with: {
        treatmentDefinition: true,
        dentist: {
          with: {
            membership: {
              with: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: (procedures, { desc }) => [desc(procedures.performedAt)],
    });

    return { success: true, data: procedureList };
  } catch (err) {
    return { success: false, error: formatErrorForClient(err) };
  }
}
