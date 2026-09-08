'use server';

import { db } from '@dental/db';
import { labCases, labVendors } from '@dental/db';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { formatErrorForClient } from '@/lib/errors';
import {
  createLabCaseSchema,
  updateLabCaseStatusSchema,
  createLabVendorSchema,
  CreateLabCaseInput,
  UpdateLabCaseStatusInput,
  CreateLabVendorInput,
} from '../domain/validation';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Get all lab cases for a practice, optionally filtered by status, patient, or vendor.
 */
export async function getLabCases(
  organizationId: string,
  filter?: { status?: string; patientId?: string; vendorId?: string }
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.read');

    const whereConditions = [eq(labCases.organizationId, organizationId)];

    if (filter?.status && filter.status !== 'all') {
      whereConditions.push(eq(labCases.status, filter.status));
    }

    if (filter?.patientId) {
      whereConditions.push(eq(labCases.patientId, filter.patientId));
    }

    if (filter?.vendorId) {
      whereConditions.push(eq(labCases.labVendorId, filter.vendorId));
    }

    const cases = await db.query.labCases.findMany({
      where: and(...whereConditions),
      with: {
        patient: true,
        vendor: true,
        dentist: true,
      },
      orderBy: [desc(labCases.createdAt)],
    });

    return { success: true, data: cases };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Order a new lab case from a dental laboratory.
 */
export async function createLabCase(
  organizationId: string,
  rawInput: CreateLabCaseInput
): Promise<ActionResult<{ labCaseId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.write');

    const parsed = createLabCaseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid lab case data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    const [newCase] = await db
      .insert(labCases)
      .values({
        organizationId,
        patientId: data.patientId,
        dentistId: data.dentistId || session.user.id,
        labVendorId: data.labVendorId,
        appointmentId: data.appointmentId || null,
        toothNumber: data.toothNumber || null,
        workType: data.workType,
        shade: data.shade || null,
        status: data.sentDate ? 'sent' : 'prepared',
        sentDate: data.sentDate ? new Date(data.sentDate) : new Date(),
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        cost: data.cost.toFixed(2),
        notes: data.notes || null,
        trackingNumber: data.trackingNumber || null,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'lab_case',
      entityId: newCase.id,
      action: AuditActions.LAB_CASE_CREATED,
      changedFields: {
        patientId: data.patientId,
        workType: data.workType,
        labVendorId: data.labVendorId,
        cost: data.cost,
      },
    });

    revalidatePath('/operations');
    revalidatePath(`/patients/${data.patientId}`);
    return { success: true, data: { labCaseId: newCase.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Update the status of a lab case (e.g. mark sent, received, fitted, or request rework).
 */
export async function updateLabCaseStatus(
  organizationId: string,
  rawInput: UpdateLabCaseStatusInput
): Promise<ActionResult<{ labCaseId: string; newStatus: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.write');

    const parsed = updateLabCaseStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid status update',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { labCaseId, status, receivedDate, fittedDate, reworkReason, notes } = parsed.data;

    const currentCase = await db.query.labCases.findFirst({
      where: and(eq(labCases.id, labCaseId), eq(labCases.organizationId, organizationId)),
    });

    if (!currentCase) {
      return { success: false, error: { message: 'Lab case not found', code: 'NOT_FOUND' } };
    }

    const updates: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'received') {
      updates.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
    } else if (status === 'fitted') {
      updates.fittedDate = fittedDate ? new Date(fittedDate) : new Date();
    }

    if (reworkReason) updates.reworkReason = reworkReason;
    if (notes) updates.notes = notes;

    await db.update(labCases).set(updates).where(eq(labCases.id, labCaseId));

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'lab_case',
      entityId: labCaseId,
      action: AuditActions.LAB_CASE_STATUS_CHANGED,
      changedFields: {
        fromStatus: currentCase.status,
        toStatus: status,
        reworkReason,
      },
    });

    revalidatePath('/operations');
    revalidatePath(`/patients/${currentCase.patientId}`);
    return { success: true, data: { labCaseId, newStatus: status } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Get all registered lab vendors for an organization.
 */
export async function getLabVendors(organizationId: string): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.read');

    const vendors = await db.query.labVendors.findMany({
      where: and(eq(labVendors.organizationId, organizationId), eq(labVendors.active, true)),
      orderBy: [desc(labVendors.createdAt)],
    });

    return { success: true, data: vendors };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Register a new dental lab vendor.
 */
export async function createLabVendor(
  organizationId: string,
  rawInput: CreateLabVendorInput
): Promise<ActionResult<{ vendorId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.write');

    const parsed = createLabVendorSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid vendor data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    const [vendor] = await db
      .insert(labVendors)
      .values({
        organizationId,
        name: data.name,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'lab_vendor',
      entityId: vendor.id,
      action: AuditActions.LAB_VENDOR_CREATED,
      changedFields: { name: vendor.name },
    });

    revalidatePath('/operations');
    return { success: true, data: { vendorId: vendor.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
