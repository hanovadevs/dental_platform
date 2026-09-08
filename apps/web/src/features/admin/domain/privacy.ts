/**
 * Data Portability & GDPR Right to Erasure Domain Logic
 * Per spec (08_SECURITY_PRIVACY_AND_AUDIT.md Section 10 & 02_PHASES_AND_ROADMAP.md Phase 9).
 */

export interface PatientPiiRecord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  dateOfBirth?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  archivedAt?: Date | null;
}

export interface EmergencyContactPiiRecord {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface ClinicalNotePiiRecord {
  id: string;
  chiefComplaint: string;
  diagnosis?: string | null;
  treatmentProvided?: string | null;
  plan?: string | null;
}

/**
 * Irreversibly scrubs patient identifiable data while preserving ledger linkages.
 */
export function scrubPatientPii(
  record: PatientPiiRecord,
  reason: string,
  now = new Date()
): PatientPiiRecord {
  const pseudonym = record.id.slice(0, 8).toUpperCase();
  return {
    ...record,
    firstName: '[ANONYMIZED]',
    lastName: `Patient-${pseudonym}`,
    email: `erased-${pseudonym}@redacted.local`,
    phone: '+0000000000',
    dateOfBirth: null,
    address: 'REDACTED UNDER GDPR / PRIVACY REQUEST',
    notes: `Record scrubbed under privacy erasure request on ${now.toISOString()}. Reason: ${reason}`,
    status: 'archived',
    archivedAt: now,
  };
}

/**
 * Scrubs emergency contact information.
 */
export function scrubEmergencyContact(
  contact: EmergencyContactPiiRecord
): EmergencyContactPiiRecord {
  return {
    ...contact,
    name: '[ANONYMIZED CONTACT]',
    phone: '+0000000000',
    relationship: 'REDACTED',
  };
}

/**
 * Redacts subjective and narrative clinical note text.
 */
export function scrubClinicalNote(
  note: ClinicalNotePiiRecord
): ClinicalNotePiiRecord {
  return {
    ...note,
    chiefComplaint: '[REDACTED UNDER PRIVACY REQUEST]',
    diagnosis: '[REDACTED]',
    treatmentProvided: '[REDACTED]',
    plan: '[REDACTED]',
  };
}

/**
 * Assembles and formats a complete practice export archive.
 */
export function buildPracticeExportBundle(params: {
  exportedByUserId: string;
  organization: { id?: string; name?: string; slug?: string; currency?: string };
  locations: any[];
  chairs: any[];
  staff: any[];
  dentists: any[];
  patients: any[];
  appointments: any[];
  dentalChart: any[];
  clinicalNotes: any[];
  treatmentPlans: any[];
  procedures: any[];
  invoices: any[];
  payments: any[];
  inventory: any[];
  labCases: any[];
  now?: Date;
}) {
  const exportTime = (params.now || new Date()).toISOString();
  const recordCounts = {
    locations: params.locations.length,
    chairs: params.chairs.length,
    staff: params.staff.length,
    dentists: params.dentists.length,
    patients: params.patients.length,
    appointments: params.appointments.length,
    procedures: params.procedures.length,
    invoices: params.invoices.length,
    payments: params.payments.length,
    inventoryItems: params.inventory.length,
    labCases: params.labCases.length,
  };

  const bundle = {
    version: '1.0.0',
    exportedAt: exportTime,
    exportedByUserId: params.exportedByUserId,
    organization: params.organization,
    locations: params.locations,
    chairs: params.chairs,
    staff: params.staff,
    dentists: params.dentists,
    patients: params.patients,
    appointments: params.appointments,
    dentalChart: params.dentalChart,
    clinicalNotes: params.clinicalNotes,
    treatmentPlans: params.treatmentPlans,
    procedures: params.procedures,
    invoices: params.invoices,
    payments: params.payments,
    inventory: params.inventory,
    labCases: params.labCases,
    recordCounts,
  };

  const orgIdSlice = (params.organization.id || 'org').slice(0, 8);
  const dateStr = exportTime.split('T')[0];
  const fileName = `dental-practice-archive-${orgIdSlice}-${dateStr}.json`;

  return {
    bundle,
    fileName,
    recordCounts,
    exportJson: JSON.stringify(bundle, null, 2),
  };
}
