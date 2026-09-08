'use server';

import { db } from '@dental/db';
import {
  organizations,
  locations,
  chairs,
  staffProfiles,
  dentistProfiles,
  patients,
  patientEmergencyContacts,
  medicalAlerts,
  allergies,
  appointments,
  toothConditions,
  clinicalNotes,
  treatmentPlans,
  treatmentPlanItems,
  procedures,
  invoices,
  payments,
  inventoryItems,
  inventoryTransactions,
  labCases,
  labVendors,
  communications,
  patientImports,
} from '@dental/db';
import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { formatErrorForClient } from '@/lib/errors';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { generateNextPatientNumber } from '@/features/patients/domain/patient-number';
import { parsePatientCsvContent } from '../domain/csv-parser';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * 1. Export complete practice archive as structured JSON.
 * Per spec (08_SECURITY_PRIVACY_AND_AUDIT.md Section 10 & 02_PHASES_AND_ROADMAP.md Phase 9).
 */
export async function exportCompletePracticeArchive(
  organizationId: string
): Promise<
  ActionResult<{
    exportJson: string;
    fileName: string;
    recordCounts: Record<string, number>;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'reports.export');

    // Rate limit exports to prevent server resource exhaustion (3/hr)
    const rateCheck = checkRateLimit(organizationId, 'export');
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: { message: rateCheck.error || 'Export rate limit reached', code: 'RATE_LIMITED' },
      };
    }

    // Parallel fetch of practice domain entities strictly isolated to organizationId
    const [
      org,
      locList,
      chairList,
      staffList,
      dentistList,
      patList,
      apptList,
      toothList,
      notesList,
      plansList,
      procsList,
      invList,
      paymentsList,
      invItemsList,
      labCasesList,
    ] = await Promise.all([
      db.query.organizations.findFirst({ where: eq(organizations.id, organizationId) }),
      db.query.locations.findMany({ where: eq(locations.organizationId, organizationId) }),
      db.query.chairs.findMany({ where: eq(chairs.organizationId, organizationId) }),
      db.query.staffProfiles.findMany({ where: eq(staffProfiles.organizationId, organizationId) }),
      db.query.dentistProfiles.findMany({
        where: eq(dentistProfiles.organizationId, organizationId),
      }),
      db.query.patients.findMany({
        where: eq(patients.organizationId, organizationId),
        with: {
          emergencyContacts: true,
          medicalAlerts: true,
          allergies: true,
        },
      }),
      db.query.appointments.findMany({ where: eq(appointments.organizationId, organizationId) }),
      db.query.toothConditions.findMany({
        where: eq(toothConditions.organizationId, organizationId),
      }),
      db.query.clinicalNotes.findMany({ where: eq(clinicalNotes.organizationId, organizationId) }),
      db.query.treatmentPlans.findMany({
        where: eq(treatmentPlans.organizationId, organizationId),
        with: { items: true },
      }),
      db.query.procedures.findMany({ where: eq(procedures.organizationId, organizationId) }),
      db.query.invoices.findMany({
        where: eq(invoices.organizationId, organizationId),
        with: { items: true },
      }),
      db.query.payments.findMany({ where: eq(payments.organizationId, organizationId) }),
      db.query.inventoryItems.findMany({
        where: eq(inventoryItems.organizationId, organizationId),
      }),
      db.query.labCases.findMany({ where: eq(labCases.organizationId, organizationId) }),
    ]);

    const exportBundle = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedByUserId: session.user.id,
      organization: {
        id: org?.id,
        name: org?.name,
        slug: org?.slug,
        currency: org?.defaultCurrency,
      },
      locations: locList,
      chairs: chairList,
      staff: staffList,
      dentists: dentistList,
      patients: patList,
      appointments: apptList,
      dentalChart: toothList,
      clinicalNotes: notesList,
      treatmentPlans: plansList,
      procedures: procsList,
      invoices: invList,
      payments: paymentsList,
      inventory: invItemsList,
      labCases: labCasesList,
    };

    const recordCounts = {
      locations: locList.length,
      chairs: chairList.length,
      staff: staffList.length,
      patients: patList.length,
      appointments: apptList.length,
      procedures: procsList.length,
      invoices: invList.length,
      payments: paymentsList.length,
      inventoryItems: invItemsList.length,
      labCases: labCasesList.length,
    };

    const fileName = `dental-practice-archive-${organizationId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
    const exportJson = JSON.stringify(exportBundle, null, 2);

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'practice_export',
      entityId: organizationId,
      action: AuditActions.PRACTICE_DATA_EXPORTED,
      changedFields: { fileName, recordCounts },
    });

    return {
      success: true,
      data: {
        exportJson,
        fileName,
        recordCounts,
      },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * 2. GDPR Right to Erasure / Patient PII Anonymization.
 * Scrubs identifiable details while preserving numerical financial ledgers for statutory tax compliance.
 * Per spec (08_SECURITY_PRIVACY_AND_AUDIT.md Section 10).
 */
export async function anonymizePatientData(
  organizationId: string,
  patientId: string,
  reason: string
): Promise<ActionResult<{ anonymizedId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'patient.archive');

    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)),
    });

    if (!patient) {
      return { success: false, error: { message: 'Patient not found', code: 'NOT_FOUND' } };
    }

    const pseudonym = patientId.slice(0, 8).toUpperCase();

    // 1. Irreversibly scrub patient demographics
    await db
      .update(patients)
      .set({
        firstName: '[ANONYMIZED]',
        lastName: `Patient-${pseudonym}`,
        email: `erased-${pseudonym}@redacted.local`,
        phone: '+0000000000',
        dateOfBirth: null,
        address: 'REDACTED UNDER GDPR / PRIVACY REQUEST',
        notes: `Record scrubbed under privacy erasure request on ${new Date().toISOString()}. Reason: ${reason}`,
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)));

    // 2. Scrub emergency contacts
    await db
      .update(patientEmergencyContacts)
      .set({
        name: '[ANONYMIZED CONTACT]',
        phone: '+0000000000',
        relationship: 'REDACTED',
      })
      .where(
        and(
          eq(patientEmergencyContacts.patientId, patientId),
          eq(patientEmergencyContacts.organizationId, organizationId)
        )
      );

    // 3. Redact clinical note bodies while keeping structural ledger timestamps
    await db
      .update(clinicalNotes)
      .set({
        chiefComplaint: '[REDACTED UNDER PRIVACY REQUEST]',
        diagnosis: '[REDACTED]',
        treatmentProvided: '[REDACTED]',
        plan: '[REDACTED]',
      })
      .where(
        and(eq(clinicalNotes.patientId, patientId), eq(clinicalNotes.organizationId, organizationId))
      );

    // 4. Audit event log with reason
    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'patient',
      entityId: patientId,
      action: AuditActions.PATIENT_DATA_ANONYMIZED,
      changedFields: { pseudonym, reason, anonymizedAt: new Date().toISOString() },
    });

    return { success: true, data: { anonymizedId: patientId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

export interface ImportPatientOptions {
  fileName?: string;
  primaryLocationId?: string;
  onDuplicate?: 'skip' | 'update';
}

/**
 * 3. Bulk CSV Patient Import Engine.
 * Per spec (09_TESTING_AND_QA.md Section 7).
 */
export async function importPatientsFromCsv(
  organizationId: string,
  csvContent: string,
  fileNameOrOptions?: string | ImportPatientOptions,
  explicitOptions?: ImportPatientOptions
): Promise<
  ActionResult<{
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: { row: number; error: string }[];
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'patient.import');

    const fileName =
      typeof fileNameOrOptions === 'string'
        ? fileNameOrOptions
        : fileNameOrOptions?.fileName || 'patients-import.csv';

    const options: ImportPatientOptions =
      typeof fileNameOrOptions === 'object' && fileNameOrOptions !== null
        ? fileNameOrOptions
        : explicitOptions || {};

    const parseResult = parsePatientCsvContent(csvContent);
    if (!parseResult.valid) {
      return {
        success: false,
        error: {
          message: parseResult.errorMessage || 'Invalid CSV format',
          code: parseResult.errorCode || 'VALIDATION_ERROR',
        },
      };
    }

    const onDuplicate = options.onDuplicate || 'skip';
    let importedCount = 0;
    let skippedCount = 0;
    const failedCount = parseResult.errors.length;
    const errors: { row: number; error: string }[] = [...parseResult.errors];

    // Ensure a target primary location exists
    let targetLocationId = options.primaryLocationId;
    if (!targetLocationId) {
      const loc = await db.query.locations.findFirst({
        where: and(eq(locations.organizationId, organizationId), eq(locations.active, true)),
      });
      if (!loc) {
        return {
          success: false,
          error: { message: 'No active clinic location found to assign imported patients.', code: 'LOCATION_REQUIRED' },
        };
      }
      targetLocationId = loc.id;
    }

    // Pre-fetch existing patient phone and email sets for rapid duplicate check
    const existingPatients = await db.query.patients.findMany({
      where: eq(patients.organizationId, organizationId),
      columns: { id: true, phone: true, email: true },
    });

    const phoneMap = new Map<string, string>();
    const emailMap = new Map<string, string>();
    for (const ep of existingPatients) {
      if (ep.phone) phoneMap.set(ep.phone.replace(/[^0-9+]/g, ''), ep.id);
      if (ep.email) emailMap.set(ep.email.toLowerCase(), ep.id);
    }

    for (const row of parseResult.rows) {
      const { firstName, lastName, phone, cleanPhone, email, cleanEmail, dateOfBirth, gender, address } = row;

      const existingId =
        (cleanPhone && phoneMap.get(cleanPhone)) || (cleanEmail && emailMap.get(cleanEmail));

      if (existingId) {
        if (onDuplicate === 'skip') {
          skippedCount += 1;
          continue;
        } else if (onDuplicate === 'update') {
          await db
            .update(patients)
            .set({
              firstName,
              lastName,
              phone: phone || undefined,
              email: email || undefined,
              dateOfBirth: dateOfBirth || undefined,
              gender: gender || undefined,
              address: address || undefined,
              updatedAt: new Date(),
            })
            .where(eq(patients.id, existingId));
          importedCount += 1;
          continue;
        }
      }

      // Generate sequence patient number
      const patientNumber = await generateNextPatientNumber(organizationId);

      // Create new patient
      const [newPat] = await db
        .insert(patients)
        .values({
          organizationId,
          primaryLocationId: targetLocationId,
          patientNumber,
          firstName,
          lastName,
          phone: phone || cleanPhone || '+0000000000',
          email: email || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          address: address || undefined,
          status: 'active',
          leadSource: 'csv_bulk_import',
        })
        .returning({ id: patients.id });

      if (cleanPhone) phoneMap.set(cleanPhone, newPat.id);
      if (cleanEmail) emailMap.set(cleanEmail, newPat.id);
      importedCount += 1;
    }

    const totalRows = parseResult.rows.length + parseResult.errors.length;

    // Record bulk import summary audit log
    await db.insert(patientImports).values({
      organizationId,
      fileName,
      totalRows,
      importedRows: importedCount,
      failedRows: failedCount,
      status: failedCount > 0 && importedCount === 0 ? 'failed' : 'completed',
      errorReport: JSON.stringify(errors),
      importedBy: session.user.id,
    });

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'patient_import',
      entityId: organizationId,
      action: AuditActions.PATIENTS_BULK_IMPORTED,
      changedFields: {
        fileName,
        total: totalRows,
        imported: importedCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    });

    return {
      success: true,
      data: {
        totalRows,
        importedCount,
        skippedCount,
        failedCount,
        errors,
      },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
