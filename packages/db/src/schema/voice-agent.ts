import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { patients } from './patients';
import { revenueOpportunities } from './revenue';
import { appointments } from './scheduling';
import { users } from './users';

/**
 * Voice Call Task Status Enumeration.
 * Per spec (02_PHASES_AND_ROADMAP.md Phase 10 & 07_REVENUE_ENGINE.md Section 18).
 */
export const voiceCallTaskStatusEnum = pgEnum('voice_call_task_status', [
  'pending',
  'queued',
  'in_progress',
  'completed',
  'failed',
  'escalated_to_human',
  'cancelled',
]);

/**
 * Voice Call Intent Enumeration.
 */
export const voiceCallIntentEnum = pgEnum('voice_call_intent', [
  'treatment_followup',
  'overdue_recall',
  'appointment_confirmation',
  'unscheduled_care',
  'reactivation',
  'custom',
]);

/**
 * AI Voice Call Tasks Table (Downstream executor of clinic-approved workflows).
 * Per spec (04_SYSTEM_ARCHITECTURE.md Section 11 & 07_REVENUE_ENGINE.md Section 18).
 */
export const voiceCallTasks = pgTable('voice_call_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id').references(() => revenueOpportunities.id, {
    onDelete: 'set null',
  }),
  intent: voiceCallIntentEnum('intent').notNull().default('treatment_followup'),
  status: voiceCallTaskStatusEnum('status').notNull().default('pending'),

  // Script boundaries & clinical context (pre-approved summaries, open appointment slots)
  approvedContext: jsonb('approved_context').notNull().default({}),

  // Clinical safety boundaries (no_clinical_advice = true, escalation triggers, max duration)
  constraints: jsonb('constraints').notNull().default({
    no_clinical_advice: true,
    human_escalation_required_for: ['acute_pain', 'pricing_dispute', 'clinical_diagnosis'],
    max_duration_seconds: 300,
  }),

  // External provider reference (e.g. Bland, Retell, Vapi)
  providerJobId: varchar('provider_job_id', { length: 150 }),

  // Outcome
  outcome: varchar('outcome', { length: 50 }),
  bookedAppointmentId: uuid('booked_appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),

  // Human escalation flags
  needsHumanFollowup: boolean('needs_human_followup').notNull().default(false),
  humanFollowupReason: text('human_followup_reason'),

  // Call record and transcripts
  transcript: text('transcript'),
  callDurationSeconds: integer('call_duration_seconds').default(0),

  // Scheduling & execution timestamps
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('voice_tasks_org_status_idx').on(table.organizationId, table.status),
  index('voice_tasks_patient_idx').on(table.patientId),
  index('voice_tasks_opp_idx').on(table.opportunityId),
]);
