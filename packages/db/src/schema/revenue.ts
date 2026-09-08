import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';
import { organizations, locations } from './organizations';
import { patients } from './patients';
import { users } from './users';
import { appointments } from './scheduling';
import { treatmentPlans, treatmentDefinitions } from './treatments';
import { invoices } from './billing';

/**
 * Revenue Opportunity (First-class domain entity).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 15, 06_UI_UX_DESIGN_SYSTEM.md Section 19).
 */
export const revenueOpportunities = pgTable('revenue_opportunities', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, {
    onDelete: 'set null',
  }),
  patientId: uuid('patient_id').references(() => patients.id, {
    onDelete: 'cascade',
  }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  treatmentPlanId: uuid('treatment_plan_id').references(() => treatmentPlans.id, {
    onDelete: 'set null',
  }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, {
    onDelete: 'set null',
  }),
  type: varchar('type', { length: 50 }).notNull(),
  // 'unaccepted_treatment' | 'overdue_recall' | 'cancelled_appointment' | 'no_show' | 'empty_chair' | 'outstanding_balance' | 'inactive_patient' | 'lost_lead'
  status: varchar('status', { length: 30 }).default('open').notNull(),
  // 'open' | 'in_progress' | 'snoozed' | 'converted' | 'lost' | 'not_applicable' | 'closed'
  priority: varchar('priority', { length: 20 }).default('normal').notNull(),
  // 'low' | 'normal' | 'high' | 'urgent'
  estimatedValue: numeric('estimated_value', { precision: 12, scale: 2 }).default('0').notNull(),
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  confidenceScore: integer('confidence_score').default(80).notNull(), // 0 to 100
  reason: text('reason').notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
  nextActionAt: timestamp('next_action_at', { withTimezone: true }),
  assignedTo: uuid('assigned_to').references(() => users.id, {
    onDelete: 'set null',
  }),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionType: varchar('resolution_type', { length: 50 }),
  // 'appointment_booked' | 'treatment_accepted' | 'invoice_paid' | 'declined_by_patient' | 'unresponsive' | 'cancelled'
  recoveredRevenue: numeric('recovered_revenue', { precision: 12, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Revenue Attribution (Direct causal attribution of recovered revenue).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 16).
 * Avoid claiming revenue was recovered when attribution is uncertain.
 */
export const revenueAttributions = pgTable('revenue_attributions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id')
    .notNull()
    .references(() => revenueOpportunities.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'treatment_accepted' | 'appointment_booked' | 'invoice_paid'
  sourceEntityType: varchar('source_entity_type', { length: 50 }).notNull(), // 'procedure' | 'appointment' | 'payment' | 'invoice'
  sourceEntityId: uuid('source_entity_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Opportunity Outreach & Contact History.
 * Log of calls, messages, and staff touchpoints.
 */
export const opportunityOutreachLogs = pgTable('opportunity_outreach_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id')
    .notNull()
    .references(() => revenueOpportunities.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 30 }).notNull(), // 'phone' | 'sms' | 'email' | 'whatsapp' | 'in_person' | 'other'
  outcome: varchar('outcome', { length: 50 }).notNull(), // 'spoke_with_patient' | 'left_voicemail' | 'message_sent' | 'no_answer' | 'call_back_requested' | 'booking_made' | 'declined'
  notes: text('notes'),
  performedBy: uuid('performed_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  contactedAt: timestamp('contacted_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Recall Rules (Configurable hygiene, scaling, and periodic recall intervals).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 14).
 */
export const recallRules = pgTable('recall_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(), // e.g. "6-Month Hygiene & Exam"
  intervalDays: integer('interval_days').default(180).notNull(),
  treatmentDefinitionId: uuid('treatment_definition_id').references(
    () => treatmentDefinitions.id,
    { onDelete: 'set null' }
  ),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Patient Recalls (Periodic care tracking and automated lifecycle).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 14 & Scenario D).
 */
export const recalls = pgTable('recalls', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  ruleId: uuid('rule_id')
    .notNull()
    .references(() => recallRules.id, { onDelete: 'cascade' }),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 30 }).default('upcoming').notNull(),
  // 'upcoming' | 'due' | 'overdue' | 'contacted' | 'booked' | 'snoozed' | 'not_eligible'
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  bookedAppointmentId: uuid('booked_appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
