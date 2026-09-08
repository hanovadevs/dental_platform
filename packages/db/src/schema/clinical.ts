import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { patients } from './patients';
import { staffProfiles } from './staff';

/**
 * Tooth Conditions & Clinical Findings.
 * Preserves history: each tooth condition change is an immutable append-oriented entry.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 6).
 */
export const toothConditions = pgTable('tooth_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  toothCode: varchar('tooth_code', { length: 10 }).notNull(), // FDI code e.g. "16", "24"
  surface: varchar('surface', { length: 20 }), // e.g. "M", "D", "O", "B", "L", "MOD", null for whole tooth
  conditionType: varchar('condition_type', { length: 50 }).notNull(), // 'caries', 'filling', 'crown', 'root_canal', 'missing', 'implant', 'healthy', etc.
  status: varchar('status', { length: 20 }).notNull().default('diagnosed'), // 'diagnosed', 'completed', 'existing', 'watch'
  notes: text('notes'),
  recordedBy: uuid('recorded_by')
    .notNull()
    .references(() => users.id),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  supersedesId: uuid('supersedes_id'),
  active: boolean('active').notNull().default(true),
}, (table) => [
  index('tooth_conds_patient_tooth_idx').on(table.patientId, table.toothCode),
  index('tooth_conds_org_patient_idx').on(table.organizationId, table.patientId),
]);

/**
 * Clinical Progress Notes (SOAP notes).
 * Structured practitioner notes signed and timestamped.
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.2).
 */
export const clinicalNotes = pgTable('clinical_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  dentistId: uuid('dentist_id').references(() => staffProfiles.id),
  chiefComplaint: text('chief_complaint'), // S - Subjective
  diagnosis: text('diagnosis'), // O / A - Objective / Assessment
  treatmentProvided: text('treatment_provided'), // P - Treatment executed
  plan: text('plan'), // Next visit plan / instructions
  signedBy: uuid('signed_by')
    .notNull()
    .references(() => users.id),
  signedAt: timestamp('signed_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('clinical_notes_patient_created_idx').on(table.patientId, table.createdAt),
  index('clinical_notes_org_patient_idx').on(table.organizationId, table.patientId),
]);
