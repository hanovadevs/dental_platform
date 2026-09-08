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
  TREATMENT_ITEM_UPDATED: 'treatment_item.updated',
  PROCEDURE_PERFORMED: 'procedure.performed',

  // Appointment
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_STATUS_CHANGED: 'appointment.status_changed',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_DELETED: 'appointment.deleted',

  // Billing
  INVOICE_CREATED: 'invoice.created',
  INVOICE_ADJUSTED: 'invoice.adjusted',
  PAYMENT_RECORDED: 'payment.recorded',
  PAYMENT_REVERSED: 'payment.reversed',

  // Export
  EXPORT_CREATED: 'export.created',

  // File
  FILE_ACCESSED: 'file.accessed',

  // Revenue & Recall
  REVENUE_OPPORTUNITY_CREATED: 'revenue_opportunity.created',
  REVENUE_OPPORTUNITY_UPDATED: 'revenue_opportunity.updated',
  REVENUE_OPPORTUNITY_RESOLVED: 'revenue_opportunity.resolved',
  REVENUE_OPPORTUNITY_SNOOZED: 'revenue_opportunity.snoozed',
  OUTREACH_LOGGED: 'outreach.logged',
  RECALL_RULE_CREATED: 'recall_rule.created',
  RECALL_CREATED: 'recall.created',
  RECALL_UPDATED: 'recall.updated',

  // Communications
  COMMUNICATION_SENT: 'communication.sent',
  COMMUNICATION_FAILED: 'communication.failed',
  COMMUNICATION_OPT_OUT: 'communication.opt_out',
  COMMUNICATION_TEMPLATE_CREATED: 'communication_template.created',
  COMMUNICATION_TEMPLATE_UPDATED: 'communication_template.updated',
  COMMUNICATION_RULE_CREATED: 'communication_rule.created',
  COMMUNICATION_RULE_UPDATED: 'communication_rule.updated',
  APPOINTMENT_CONFIRMED_BY_TOKEN: 'appointment.confirmed_by_token',
} as const;
