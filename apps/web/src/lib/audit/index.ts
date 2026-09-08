import { db } from '@dental/db';
import { auditEvents } from '@dental/db';
import { generateCorrelationId } from '../utils';

/**
 * Audit event creation utility.
 * Per spec (04_SYSTEM_ARCHITECTURE.md Section 12, 08_SECURITY_PRIVACY_AND_AUDIT.md Section 9):
 * - Every sensitive mutation should record an audit event
 * - Audit records should be append-only
 * - Never log full patient records or sensitive data
 */
export interface AuditEventInput {
  organizationId: string;
  locationId?: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  changedFields?: Record<string, unknown>;
  reason?: string;
  correlationId?: string;
}

export async function createAuditEvent(input: AuditEventInput): Promise<void> {
  await db.insert(auditEvents).values({
    organizationId: input.organizationId,
    locationId: input.locationId ?? null,
    actorUserId: input.actorUserId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    changedFields: input.changedFields ?? null,
    reason: input.reason ?? null,
    correlationId: input.correlationId ?? generateCorrelationId(),
  });
}

/**
 * Common audit action constants.
 * Using constants instead of magic strings per spec.
 */
export const AuditActions = {
  // Auth
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',

  // Organization
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',

  // Location
  LOCATION_CREATED: 'location.created',
  LOCATION_UPDATED: 'location.updated',

  // Staff
  MEMBERSHIP_CREATED: 'membership.created',
  MEMBERSHIP_UPDATED: 'membership.updated',
  MEMBERSHIP_DEACTIVATED: 'membership.deactivated',
  STAFF_CREATED: 'staff.created',
  STAFF_UPDATED: 'staff.updated',
  STAFF_DEACTIVATED: 'staff.deactivated',
  CHAIR_CREATED: 'chair.created',
  CHAIR_UPDATED: 'chair.updated',
  PERMISSION_CHANGED: 'permission.changed',

  // Patient
  PATIENT_CREATED: 'patient.created',
  PATIENT_UPDATED: 'patient.updated',
  PATIENT_ARCHIVED: 'patient.archived',
  MEDICAL_ALERT_CHANGED: 'medical_alert.changed',
  ALLERGY_CHANGED: 'allergy.changed',

  // Clinical
  CHART_UPDATED: 'chart.updated',
  CLINICAL_NOTE_CHANGED: 'clinical_note.changed',

  // Treatment
  TREATMENT_PLAN_CREATED: 'treatment_plan.created',
  TREATMENT_PLAN_PRESENTED: 'treatment_plan.presented',
  TREATMENT_PLAN_CHANGED: 'treatment_plan.changed',

  // Appointment
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_DELETED: 'appointment.deleted',

  // Billing
  PAYMENT_RECORDED: 'payment.recorded',
  PAYMENT_REVERSED: 'payment.reversed',
  INVOICE_ADJUSTED: 'invoice.adjusted',

  // Export
  EXPORT_CREATED: 'export.created',

  // File
  FILE_ACCESSED: 'file.accessed',
} as const;
