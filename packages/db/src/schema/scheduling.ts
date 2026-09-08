import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { organizations, locations } from './organizations';
import { users } from './users';
import { patients } from './patients';
import { staffProfiles, chairs } from './staff';

/**
 * Appointment types / categories configured by the clinic.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 7).
 */
export const appointmentTypes = pgTable('appointment_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').default(30).notNull(),
  color: varchar('color', { length: 30 }).default('#0284c7').notNull(),
  defaultPrice: numeric('default_price', { precision: 12, scale: 2 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Core Appointment entity.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 7).
 * High-reliability scheduling with concurrency guards against double booking.
 */
export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'restrict' }),
  dentistId: uuid('dentist_id')
    .notNull()
    .references(() => staffProfiles.id, { onDelete: 'restrict' }),
  chairId: uuid('chair_id')
    .notNull()
    .references(() => chairs.id, { onDelete: 'restrict' }),
  appointmentTypeId: uuid('appointment_type_id')
    .notNull()
    .references(() => appointmentTypes.id, { onDelete: 'restrict' }),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 30 }).default('scheduled').notNull(),
  // 'scheduled' | 'confirmed' | 'checked_in' | 'in_chair' | 'completed' | 'cancelled' | 'no_show'
  confirmationStatus: varchar('confirmation_status', { length: 30 })
    .default('unconfirmed')
    .notNull(),
  // 'unconfirmed' | 'confirmed_patient' | 'confirmed_clinic' | 'reminder_sent'
  source: varchar('source', { length: 30 }).default('reception').notNull(),
  // 'reception' | 'online' | 'call' | 'recall' | 'chair_fill'
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('appts_org_time_idx').on(table.organizationId, table.startAt, table.endAt),
  index('appts_dentist_time_idx').on(table.dentistId, table.startAt, table.endAt),
  index('appts_chair_time_idx').on(table.chairId, table.startAt, table.endAt),
  index('appts_patient_time_idx').on(table.patientId, table.startAt),
  index('appts_org_status_idx').on(table.organizationId, table.status),
]);

/**
 * Appointment Status Transition History (Immutable Audit Log).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 7, 09_TESTING_AND_QA.md Scenario C).
 * Preserves every status movement and cancellation reason.
 */
export const appointmentStatusHistory = pgTable('appointment_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  fromStatus: varchar('from_status', { length: 30 }),
  toStatus: varchar('to_status', { length: 30 }).notNull(),
  reason: text('reason'),
  changedBy: uuid('changed_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('appt_history_appt_idx').on(table.appointmentId, table.changedAt),
]);

/**
 * Waiting List entries for filling cancelled or open chair slots (ChairFill).
 * Per spec (02_PHASES_AND_ROADMAP.md Phase 3, 07_REVENUE_ENGINE.md Section 6).
 */
export const waitingListEntries = pgTable('waiting_list_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  preferredDentistId: uuid('preferred_dentist_id').references(() => staffProfiles.id, {
    onDelete: 'set null',
  }),
  appointmentTypeId: uuid('appointment_type_id').references(() => appointmentTypes.id, {
    onDelete: 'set null',
  }),
  priority: varchar('priority', { length: 20 }).default('normal').notNull(), // 'normal' | 'high' | 'urgent'
  status: varchar('status', { length: 20 }).default('waiting').notNull(), // 'waiting' | 'scheduled' | 'cancelled'
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('waiting_list_org_status_idx').on(table.organizationId, table.status),
]);
