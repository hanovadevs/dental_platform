'use server';

import { db } from '@dental/db';
import {
  patients,
  patientEmergencyContacts,
  medicalAlerts,
  allergies,
} from '@dental/db';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { eventBus } from '@/lib/events';
import { generateCorrelationId } from '@/lib/utils';
import { formatErrorForClient } from '@/lib/errors';
import { generateNextPatientNumber } from '../domain/patient-number';
import {
  createPatientSchema,
  updatePatientSchema,
  createMedicalAlertSchema,
  createAllergySchema,
  type CreatePatientInput,
  type UpdatePatientInput,
  type CreateMedicalAlertInput,
  type CreateAllergyInput,
} from '../domain/validation';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Create a new canonical patient record.
 */
export async function createPatient(
  organizationId: string,
  formData: FormData
): Promise<ActionResult<{ patientId: string; patientNumber: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'patient.write');

    const emContactName = formData.get('emergencyContactName') as string;
    const alertLabel = formData.get('initialAlertLabel') as string;

    const raw = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || undefined,
      dateOfBirth: (formData.get('dateOfBirth') as string) || undefined,
      gender: (formData.get('gender') as string) || undefined,
      primaryLocationId: formData.get('primaryLocationId') as string,
      primaryDentistId: (formData.get('primaryDentistId') as string) || undefined,
      preferredLanguage: (formData.get('preferredLanguage') as string) || 'en',
      preferredContactMethod: (formData.get('preferredContactMethod') as 'phone' | 'sms' | 'email' | 'whatsapp') || 'phone',
      leadSource: (formData.get('leadSource') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
      emergencyContact: emContactName
        ? {
            name: emContactName,
            relationship: (formData.get('emergencyContactRelationship') as string) || 'Other',
            phone: (formData.get('emergencyContactPhone') as string) || (formData.get('phone') as string),
          }
        : undefined,
      initialMedicalAlert: alertLabel
        ? {
            type: (formData.get('initialAlertType') as string) || 'medical_condition',
            label: alertLabel,
            severity: ((formData.get('initialAlertSeverity') as string) || 'medium') as 'low' | 'medium' | 'high' | 'critical',
          }
        : undefined,
    };

    const parsed = createPatientSchema.safeParse(raw);
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
    const patientNumber = await generateNextPatientNumber(organizationId);

    // 1. Create Patient
    const [patient] = await db
      .insert(patients)
      .values({
        organizationId,
        primaryLocationId: parsed.data.primaryLocationId,
        patientNumber,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        dateOfBirth: parsed.data.dateOfBirth || null,
        gender: parsed.data.gender || null,
        primaryDentistId: parsed.data.primaryDentistId || null,
        preferredLanguage: parsed.data.preferredLanguage,
        preferredContactMethod: parsed.data.preferredContactMethod,
        leadSource: parsed.data.leadSource || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
        status: 'active',
      })
      .returning();

    if (!patient) throw new Error('Failed to create patient');

    // 2. Emergency Contact if provided
    if (parsed.data.emergencyContact) {
      await db.insert(patientEmergencyContacts).values({
        organizationId,
        patientId: patient.id,
        name: parsed.data.emergencyContact.name,
        relationship: parsed.data.emergencyContact.relationship,
        phone: parsed.data.emergencyContact.phone,
      });
    }

    // 3. Initial Medical Alert if provided
    if (parsed.data.initialMedicalAlert) {
      await db.insert(medicalAlerts).values({
        organizationId,
        patientId: patient.id,
        type: parsed.data.initialMedicalAlert.type,
        label: parsed.data.initialMedicalAlert.label,
        severity: parsed.data.initialMedicalAlert.severity,
        createdBy: session.user.id,
        active: true,
      });
    }

    // 4. Audit Log & Domain Event
    await createAuditEvent({
      organizationId,
      locationId: parsed.data.primaryLocationId,
      actorUserId: session.user.id,
      entityType: 'patient',
      entityId: patient.id,
      action: AuditActions.PATIENT_CREATED,
      correlationId,
      changedFields: {
        patientNumber,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      },
    });

    eventBus.emit('patient.created', {
      patientId: patient.id,
      organizationId,
      patientNumber,
      primaryLocationId: parsed.data.primaryLocationId,
      hasMedicalAlert: !!parsed.data.initialMedicalAlert,
    });

    return {
      success: true,
      data: { patientId: patient.id, patientNumber },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Update an existing patient's details.
 */
export async function updatePatient(
  organizationId: string,
  patientId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'patient.write');

    const raw = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || undefined,
      dateOfBirth: (formData.get('dateOfBirth') as string) || undefined,
      gender: (formData.get('gender') as string) || undefined,
      primaryLocationId: (formData.get('primaryLocationId') as string) || undefined,
      primaryDentistId: (formData.get('primaryDentistId') as string) || undefined,
      preferredLanguage: (formData.get('preferredLanguage') as string) || undefined,
      preferredContactMethod: (formData.get('preferredContactMethod') as 'phone' | 'sms' | 'email' | 'whatsapp') || undefined,
      leadSource: (formData.get('leadSource') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
      status: (formData.get('status') as 'active' | 'recall_due' | 'inactive' | 'archived') || undefined,
    };

    const parsed = updatePatientSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: { message: 'Please provide valid patient details.', code: 'VALIDATION_ERROR' } };
    }

    await db
      .update(patients)
      .set({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        dateOfBirth: parsed.data.dateOfBirth || null,
        gender: parsed.data.gender || null,
        ...(parsed.data.primaryLocationId ? { primaryLocationId: parsed.data.primaryLocationId } : {}),
        primaryDentistId: parsed.data.primaryDentistId || null,
        ...(parsed.data.preferredLanguage ? { preferredLanguage: parsed.data.preferredLanguage } : {}),
        ...(parsed.data.preferredContactMethod ? { preferredContactMethod: parsed.data.preferredContactMethod } : {}),
        leadSource: parsed.data.leadSource || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.organizationId, organizationId)
        )
      );

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'patient',
      entityId: patientId,
      action: AuditActions.PATIENT_UPDATED,
      changedFields: parsed.data,
    });

    eventBus.emit('patient.updated', { patientId, organizationId });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Archive (soft-delete) a patient record.
 * Per spec (04_SYSTEM_ARCHITECTURE.md Section 4, 05_DATA_MODEL_AND_DOMAIN.md Section 4):
 * Never destructively delete patient records; set status = 'archived' and recorded archivedAt.
 */
export async function archivePatient(
  organizationId: string,
  patientId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'patient.archive');

    const [archived] = await db
      .update(patients)
      .set({
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.organizationId, organizationId)
        )
      )
      .returning();

    if (!archived) {
      return { success: false, error: { message: 'Patient not found.', code: 'NOT_FOUND' } };
    }

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'patient',
      entityId: patientId,
      action: AuditActions.PATIENT_ARCHIVED,
      reason: reason || 'Patient archived by clinic staff',
    });

    eventBus.emit('patient.archived', { patientId, organizationId });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Add a medical alert to a patient.
 */
export async function addMedicalAlert(
  organizationId: string,
  patientId: string,
  formData: FormData
): Promise<ActionResult<{ alertId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'patient.write');

    const raw = {
      type: formData.get('type') as string,
      label: formData.get('label') as string,
      severity: formData.get('severity') as 'low' | 'medium' | 'high' | 'critical',
    };

    const parsed = createMedicalAlertSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: { message: 'Please provide valid medical alert details.', code: 'VALIDATION_ERROR' } };
    }

    const [alert] = await db
      .insert(medicalAlerts)
      .values({
        organizationId,
        patientId,
        type: parsed.data.type,
        label: parsed.data.label,
        severity: parsed.data.severity,
        createdBy: session.user.id,
        active: true,
      })
      .returning();

    if (!alert) throw new Error('Failed to create medical alert');

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'medical_alert',
      entityId: alert.id,
      action: AuditActions.MEDICAL_ALERT_CHANGED,
      changedFields: { patientId, label: parsed.data.label, severity: parsed.data.severity },
    });

    eventBus.emit('patient.medical_alert_created', {
      patientId,
      organizationId,
      alertId: alert.id,
      severity: parsed.data.severity,
    });

    return { success: true, data: { alertId: alert.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Resolve / deactivate a medical alert.
 */
export async function resolveMedicalAlert(
  organizationId: string,
  alertId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'patient.write');

    await db
      .update(medicalAlerts)
      .set({ active: false, resolvedAt: new Date() })
      .where(
        and(
          eq(medicalAlerts.id, alertId),
          eq(medicalAlerts.organizationId, organizationId)
        )
      );

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'medical_alert',
      entityId: alertId,
      action: AuditActions.MEDICAL_ALERT_CHANGED,
      changedFields: { active: false, resolved: true },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Add an allergy to a patient.
 */
export async function addAllergy(
  organizationId: string,
  patientId: string,
  formData: FormData
): Promise<ActionResult<{ allergyId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'patient.write');

    const raw = {
      substance: formData.get('substance') as string,
      reaction: (formData.get('reaction') as string) || undefined,
      severity: (formData.get('severity') as 'low' | 'medium' | 'high' | 'critical') || 'medium',
    };

    const parsed = createAllergySchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: { message: 'Please provide valid allergy details.', code: 'VALIDATION_ERROR' } };
    }

    const [allergy] = await db
      .insert(allergies)
      .values({
        organizationId,
        patientId,
        substance: parsed.data.substance,
        reaction: parsed.data.reaction || null,
        severity: parsed.data.severity,
        active: true,
      })
      .returning();

    if (!allergy) throw new Error('Failed to create allergy record');

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'allergy',
      entityId: allergy.id,
      action: AuditActions.ALLERGY_CHANGED,
      changedFields: { patientId, substance: parsed.data.substance },
    });

    return { success: true, data: { allergyId: allergy.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Remove an allergy record.
 */
export async function removeAllergy(
  organizationId: string,
  allergyId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'You must be signed in.', code: 'UNAUTHENTICATED' } };
    }

    const ctx = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(ctx, 'patient.write');

    await db
      .delete(allergies)
      .where(
        and(
          eq(allergies.id, allergyId),
          eq(allergies.organizationId, organizationId)
        )
      );

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'allergy',
      entityId: allergyId,
      action: AuditActions.ALLERGY_CHANGED,
      changedFields: { deleted: true },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
