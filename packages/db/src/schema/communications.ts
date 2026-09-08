import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { patients } from './patients';
import { users } from './users';
import { appointments } from './scheduling';
import { revenueOpportunities, recalls } from './revenue';
import { invoices } from './billing';

/**
 * Communication Templates.
 * Practice message templates supporting variable interpolation.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 17).
 */
export const communicationTemplates = pgTable('communication_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  // 'appointment_reminder' | 'appointment_confirmation' | 'recall' | 'payment_reminder' | 'treatment_followup' | 'custom'
  channel: varchar('channel', { length: 30 }).notNull(),
  // 'email' | 'sms' | 'whatsapp'
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Communication Rules / Reminder Automation Rules.
 * Configurable triggers for reminders, overdue recalls, and follow-ups.
 */
export const communicationRules = pgTable('communication_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  triggerEvent: varchar('trigger_event', { length: 50 }).notNull(),
  // 'appointment_scheduled' | 'appointment_reminder_24h' | 'recall_due' | 'recall_overdue' | 'invoice_due' | 'opportunity_detected'
  templateId: uuid('template_id').references(() => communicationTemplates.id, {
    onDelete: 'set null',
  }),
  channel: varchar('channel', { length: 30 }).notNull(),
  // 'email' | 'sms' | 'whatsapp'
  offsetHours: integer('offset_hours').default(0).notNull(),
  // e.g. -24 (24 hours before event), 0 (at event), +48 (48 hours after event)
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Patient Communication Consent & Opt-Out Tracking.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 17, 08_SECURITY_PRIVACY_AND_AUDIT.md Section 13):
 * "Do not treat operational notifications and marketing consent as automatically equivalent."
 */
export const communicationConsents = pgTable('communication_consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 30 }).notNull(),
  // 'email' | 'sms' | 'whatsapp' | 'phone'
  category: varchar('category', { length: 30 }).notNull(),
  // 'operational' | 'marketing' | 'recalls' | 'billing'
  consented: boolean('consented').default(true).notNull(),
  optedOutAt: timestamp('opted_out_at', { withTimezone: true }),
  source: varchar('source', { length: 100 }).default('staff_entry').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Core Communication Record & Audit Log.
 * Stores every sent/received communication independent of provider.
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.13, 05_DATA_MODEL_AND_DOMAIN.md Section 17).
 */
export const communications = pgTable('communications', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').references(() => patients.id, {
    onDelete: 'set null',
  }),
  leadId: uuid('lead_id'),
  appointmentId: uuid('appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  opportunityId: uuid('opportunity_id').references(() => revenueOpportunities.id, {
    onDelete: 'set null',
  }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, {
    onDelete: 'set null',
  }),
  recallId: uuid('recall_id').references(() => recalls.id, {
    onDelete: 'set null',
  }),
  channel: varchar('channel', { length: 30 }).notNull(),
  // 'email' | 'sms' | 'whatsapp' | 'phone' | 'internal_note'
  direction: varchar('direction', { length: 20 }).default('outbound').notNull(),
  // 'outbound' | 'inbound'
  recipient: varchar('recipient', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  templateId: uuid('template_id').references(() => communicationTemplates.id, {
    onDelete: 'set null',
  }),
  status: varchar('status', { length: 30 }).default('sent').notNull(),
  // 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  providerReference: varchar('provider_reference', { length: 255 }),
  sentBy: uuid('sent_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Appointment Confirmation Links & Tokens.
 * Secure, tokenized links for one-click patient appointment confirmation.
 */
export const confirmationTokens = pgTable('confirmation_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 100 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
