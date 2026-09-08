/**
 * Revenue Opportunity Engine Types.
 * Per spec: 05_DATA_MODEL_AND_DOMAIN.md Section 14, 15, 16 and 06_UI_UX_DESIGN_SYSTEM.md Section 19.
 */

export const OPPORTUNITY_TYPES = [
  'unaccepted_treatment',
  'overdue_recall',
  'cancelled_appointment',
  'no_show',
  'empty_chair',
  'outstanding_balance',
  'inactive_patient',
  'lost_lead',
] as const;

export type OpportunityType = typeof OPPORTUNITY_TYPES[number];

export const OPPORTUNITY_STATUSES = [
  'open',
  'in_progress',
  'snoozed',
  'converted',
  'lost',
  'not_applicable',
  'closed',
] as const;

export type OpportunityStatus = typeof OPPORTUNITY_STATUSES[number];

export const OPPORTUNITY_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type OpportunityPriority = typeof OPPORTUNITY_PRIORITIES[number];

export const OUTREACH_CHANNELS = [
  'phone',
  'sms',
  'email',
  'whatsapp',
  'in_person',
  'other',
] as const;

export type OutreachChannel = typeof OUTREACH_CHANNELS[number];

export const OUTREACH_OUTCOMES = [
  'spoke_with_patient',
  'left_voicemail',
  'message_sent',
  'no_answer',
  'call_back_requested',
  'booking_made',
  'declined',
] as const;

export type OutreachOutcome = typeof OUTREACH_OUTCOMES[number];

export const RESOLUTION_TYPES = [
  'appointment_booked',
  'treatment_accepted',
  'invoice_paid',
  'declined_by_patient',
  'unresponsive',
  'cancelled',
] as const;

export type ResolutionType = typeof RESOLUTION_TYPES[number];

export const RECALL_STATUSES = [
  'upcoming',
  'due',
  'overdue',
  'contacted',
  'booked',
  'snoozed',
  'not_eligible',
] as const;

export type RecallStatus = typeof RECALL_STATUSES[number];

export interface RevenueMetrics {
  totalPipelineValue: number;
  totalRecoveredRevenue: number;
  openOpportunitiesCount: number;
  convertedCount: number;
  lostCount: number;
  overdueRecallsCount: number;
  unacceptedTreatmentsValue: number;
  outstandingBalancesValue: number;
}

export interface DefaultRecallRuleConfig {
  name: string;
  intervalDays: number;
  code?: string;
}

export const DEFAULT_RECALL_RULES: DefaultRecallRuleConfig[] = [
  { name: '6-Month Routine Hygiene & Checkup', intervalDays: 180, code: 'D0120' },
  { name: '3-Month Periodontal Maintenance', intervalDays: 90, code: 'D4910' },
  { name: '12-Month Annual Comprehensive Exam', intervalDays: 365, code: 'D0150' },
];
