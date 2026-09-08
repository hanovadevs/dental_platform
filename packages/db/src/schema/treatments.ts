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
import { patients } from './patients';
import { staffProfiles } from './staff';
import { appointments } from './scheduling';

/**
 * Treatment Definitions (Clinic Procedure Catalog).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 9).
 */
export const treatmentDefinitions = pgTable('treatment_definitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 30 }).notNull(), // e.g. "CONS-01", "SCAL-01"
  name: varchar('name', { length: 120 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // "preventive", "restorative", "endodontics", etc.
  defaultDurationMinutes: integer('default_duration_minutes').default(30).notNull(),
  defaultPrice: numeric('default_price', { precision: 12, scale: 2 }).default('0').notNull(),
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  toothSpecific: boolean('tooth_specific').default(false).notNull(),
  surfaceSpecific: boolean('surface_specific').default(false).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('treat_defs_org_code_idx').on(table.organizationId, table.code),
]);

/**
 * Comprehensive Patient Treatment Plan.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 10, 06_UI_UX_DESIGN_SYSTEM.md Section 18).
 */
export const treatmentPlans = pgTable('treatment_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  dentistId: uuid('dentist_id')
    .notNull()
    .references(() => staffProfiles.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 150 }).default('Comprehensive Treatment Plan').notNull(),
  status: varchar('status', { length: 30 }).default('draft').notNull(),
  // 'draft' | 'presented' | 'partially_accepted' | 'accepted' | 'declined' | 'deferred' | 'in_progress' | 'completed' | 'abandoned'
  presentedAt: timestamp('presented_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('treat_plans_patient_status_idx').on(table.patientId, table.status),
  index('treat_plans_org_idx').on(table.organizationId, table.createdAt),
]);

/**
 * Individual Line Items inside a Treatment Plan.
 * Clinical status and financial value tracked separately per spec.
 */
export const treatmentPlanItems = pgTable('treatment_plan_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  treatmentPlanId: uuid('treatment_plan_id')
    .notNull()
    .references(() => treatmentPlans.id, { onDelete: 'cascade' }),
  treatmentDefinitionId: uuid('treatment_definition_id')
    .notNull()
    .references(() => treatmentDefinitions.id, { onDelete: 'restrict' }),
  toothCode: varchar('tooth_code', { length: 10 }), // e.g. "16", "21"
  surface: varchar('surface', { length: 20 }), // e.g. "MOD", "O"
  sequence: integer('sequence').default(1).notNull(),
  priority: varchar('priority', { length: 20 }).default('normal').notNull(), // 'normal' | 'high' | 'urgent'
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0').notNull(),
  status: varchar('status', { length: 30 }).default('proposed').notNull(),
  // 'proposed' | 'accepted' | 'declined' | 'deferred' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  notes: text('notes'),
}, (table) => [
  index('treat_items_plan_status_idx').on(table.treatmentPlanId, table.status),
]);

/**
 * Completed Procedures (Clinical Execution History).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 11).
 */
export const procedures = pgTable('procedures', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  treatmentPlanItemId: uuid('treatment_plan_item_id').references(() => treatmentPlanItems.id, {
    onDelete: 'set null',
  }),
  treatmentDefinitionId: uuid('treatment_definition_id')
    .notNull()
    .references(() => treatmentDefinitions.id, { onDelete: 'restrict' }),
  dentistId: uuid('dentist_id')
    .notNull()
    .references(() => staffProfiles.id, { onDelete: 'restrict' }),
  toothCode: varchar('tooth_code', { length: 10 }),
  surface: varchar('surface', { length: 20 }),
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
}, (table) => [
  index('procedures_patient_date_idx').on(table.patientId, table.performedAt),
  index('procedures_org_date_idx').on(table.organizationId, table.performedAt),
]);
