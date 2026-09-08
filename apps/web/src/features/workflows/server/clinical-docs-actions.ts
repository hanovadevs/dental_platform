'use server';

import { db } from '@dental/db';
import {
  prescriptions,
  prescriptionItems,
  medicationTemplates,
  consentTemplates,
  patientDocuments,
} from '@dental/db';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { formatErrorForClient } from '@/lib/errors';
import {
  createPrescriptionSchema,
  createMedicationTemplateSchema,
  createConsentTemplateSchema,
  signDocumentSchema,
  CreatePrescriptionInput,
  CreateMedicationTemplateInput,
  CreateConsentTemplateInput,
  SignDocumentInput,
} from '../domain/validation';
import {
  DEFAULT_MEDICATION_TEMPLATES,
  DEFAULT_CONSENT_TEMPLATES,
} from '../domain/types';
import { revalidatePath } from 'next/cache';
import { createHash } from 'crypto';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

// ============================================================================
// 1. PRESCRIPTIONS & MEDICATION TEMPLATES
// ============================================================================

/**
 * Get prescriptions for a specific patient or entire clinic.
 */
export async function getPrescriptions(
  organizationId: string,
  patientId?: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.read');

    const whereConditions = [eq(prescriptions.organizationId, organizationId)];
    if (patientId) {
      whereConditions.push(eq(prescriptions.patientId, patientId));
    }

    const rxList = await db.query.prescriptions.findMany({
      where: and(...whereConditions),
      with: {
        patient: true,
        dentist: true,
        items: true,
      },
      orderBy: [desc(prescriptions.issuedAt)],
    });

    return { success: true, data: rxList };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Issue a new prescription to a patient with line-items.
 */
export async function createPrescription(
  organizationId: string,
  rawInput: CreatePrescriptionInput
): Promise<ActionResult<{ prescriptionId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.write');

    const parsed = createPrescriptionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid prescription data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    // Create prescription parent record
    const [rx] = await db
      .insert(prescriptions)
      .values({
        organizationId,
        patientId: data.patientId,
        dentistId: data.dentistId || session.user.id,
        appointmentId: data.appointmentId || null,
        status: 'active',
        notes: data.notes || null,
      })
      .returning();

    // Insert prescription items
    for (const item of data.items) {
      await db.insert(prescriptionItems).values({
        prescriptionId: rx.id,
        medicationName: item.medicationName,
        dosage: item.dosage,
        form: item.form,
        frequency: item.frequency,
        durationDays: item.durationDays,
        quantity: item.quantity,
        instructions: item.instructions || null,
      });
    }

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'prescription',
      entityId: rx.id,
      action: AuditActions.PRESCRIPTION_CREATED,
      changedFields: {
        patientId: data.patientId,
        itemCount: data.items.length,
      },
    });

    revalidatePath(`/patients/${data.patientId}`);
    return { success: true, data: { prescriptionId: rx.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Fetch practice medication templates.
 */
export async function getMedicationTemplates(organizationId: string): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'documents.read');

    await ensureDefaultMedicationTemplates(organizationId);

    const templates = await db.query.medicationTemplates.findMany({
      where: and(
        eq(medicationTemplates.organizationId, organizationId),
        eq(medicationTemplates.active, true)
      ),
      orderBy: [desc(medicationTemplates.createdAt)],
    });

    return { success: true, data: templates };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Seed default dental medication templates if none exist for clinic.
 */
export async function ensureDefaultMedicationTemplates(organizationId: string): Promise<void> {
  const existing = await db.query.medicationTemplates.findFirst({
    where: eq(medicationTemplates.organizationId, organizationId),
  });

  if (!existing) {
    for (const tpl of DEFAULT_MEDICATION_TEMPLATES) {
      await db.insert(medicationTemplates).values({
        organizationId,
        name: tpl.name,
        medicationName: tpl.medicationName,
        dosage: tpl.dosage,
        form: tpl.form,
        frequency: tpl.frequency,
        durationDays: tpl.durationDays,
        instructions: tpl.instructions,
      });
    }
  }
}

/**
 * Create a custom practice medication template.
 */
export async function createMedicationTemplate(
  organizationId: string,
  rawInput: CreateMedicationTemplateInput
): Promise<ActionResult<{ templateId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'documents.write');

    const parsed = createMedicationTemplateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid template parameters',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    const [tpl] = await db
      .insert(medicationTemplates)
      .values({
        organizationId,
        name: data.name,
        medicationName: data.medicationName,
        dosage: data.dosage,
        form: data.form,
        frequency: data.frequency,
        durationDays: data.durationDays,
        instructions: data.instructions || null,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'medication_template',
      entityId: tpl.id,
      action: AuditActions.MEDICATION_TEMPLATE_CREATED,
      changedFields: { name: tpl.name },
    });

    revalidatePath('/operations');
    return { success: true, data: { templateId: tpl.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

// ============================================================================
// 2. CLINICAL DOCUMENTS & DIGITAL CONSENT
// ============================================================================

/**
 * Get all clinical documents and signed consent forms for a patient.
 */
export async function getPatientDocuments(
  organizationId: string,
  patientId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.read');

    const docs = await db.query.patientDocuments.findMany({
      where: and(
        eq(patientDocuments.organizationId, organizationId),
        eq(patientDocuments.patientId, patientId)
      ),
      with: {
        template: true,
      },
      orderBy: [desc(patientDocuments.createdAt)],
    });

    return { success: true, data: docs };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Record a digital consent form signed by a patient or guardian.
 * Generates cryptographic SHA-256 hash for document integrity verification.
 */
export async function signConsentDocument(
  organizationId: string,
  rawInput: SignDocumentInput
): Promise<ActionResult<{ documentId: string; fileHash: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.write');

    const parsed = signDocumentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid signature data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    const signedAt = new Date();
    // Compute tamper-evident hash of the content, signer, and timestamp
    const signaturePayload = `${organizationId}:${data.patientId}:${data.title}:${data.content || ''}:${data.signerName}:${signedAt.toISOString()}`;
    const fileHash = createHash('sha256').update(signaturePayload).digest('hex');

    const [doc] = await db
      .insert(patientDocuments)
      .values({
        organizationId,
        patientId: data.patientId,
        templateId: data.templateId || null,
        title: data.title,
        type: data.type,
        status: 'signed',
        content: data.content || null,
        signedAt,
        signerName: data.signerName,
        signatureData: data.signatureData,
        witnessName: data.witnessName || null,
        fileHash,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'patient_document',
      entityId: doc.id,
      action: AuditActions.DOCUMENT_SIGNED,
      changedFields: {
        title: data.title,
        signerName: data.signerName,
        fileHash,
      },
    });

    revalidatePath(`/patients/${data.patientId}`);
    return { success: true, data: { documentId: doc.id, fileHash } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Fetch practice consent templates.
 */
export async function getConsentTemplates(organizationId: string): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'clinical.read');

    await ensureDefaultConsentTemplates(organizationId);

    const templates = await db.query.consentTemplates.findMany({
      where: and(
        eq(consentTemplates.organizationId, organizationId),
        eq(consentTemplates.active, true)
      ),
      orderBy: [desc(consentTemplates.createdAt)],
    });

    return { success: true, data: templates };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Seed default dental consent templates if none exist for clinic.
 */
export async function ensureDefaultConsentTemplates(organizationId: string): Promise<void> {
  const existing = await db.query.consentTemplates.findFirst({
    where: eq(consentTemplates.organizationId, organizationId),
  });

  if (!existing) {
    for (const tpl of DEFAULT_CONSENT_TEMPLATES) {
      await db.insert(consentTemplates).values({
        organizationId,
        title: tpl.title,
        category: tpl.category,
        body: tpl.body,
        version: 1,
      });
    }
  }
}

/**
 * Create custom consent template.
 */
export async function createConsentTemplate(
  organizationId: string,
  rawInput: CreateConsentTemplateInput
): Promise<ActionResult<{ templateId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'documents.write');

    const parsed = createConsentTemplateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid consent template data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    const [tpl] = await db
      .insert(consentTemplates)
      .values({
        organizationId,
        title: data.title,
        category: data.category,
        body: data.body,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'consent_template',
      entityId: tpl.id,
      action: AuditActions.CONSENT_TEMPLATE_CREATED,
      changedFields: { title: tpl.title },
    });

    revalidatePath('/operations');
    return { success: true, data: { templateId: tpl.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
