import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organizations, locations } from './organizations';
import { users } from './users';
import { staffProfiles } from './staff';

/**
 * Patient status enumeration.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 4):
 * Active, Recall Due, Inactive, Archived.
 */
export const patientStatusEnum = pgEnum('patient_status', [
  'active',
  'recall_due',
  'inactive',
  'archived',
]);

/**
 * Medical alert severity enumeration.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 5).
 */
export const medicalAlertSeverityEnum = pgEnum('medical_alert_severity', [
  'low',
  'medium',
  'high',
  'critical',
]);

/**
 * Canonical Patient entity.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 4).
 */
export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  primaryLocationId: uuid('primary_location_id')
    .notNull()
    .references(() => locations.id),
  patientNumber: varchar('patient_number', { length: 50 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }),
  preferredLanguage: varchar('preferred_language', { length: 50 }).default('en'),
  preferredContactMethod: varchar('preferred_contact_method', { length: 20 }).default('phone'),
  status: patientStatusEnum('status').notNull().default('active'),
  leadSource: varchar('lead_source', { length: 100 }),
  primaryDentistId: uuid('primary_dentist_id').references(() => staffProfiles.id),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/**
 * Patient Emergency Contacts.
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.2).
 */
export const patientEmergencyContacts = pgTable('patient_emergency_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  relationship: varchar('relationship', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Medical Alerts.
 * Sensitive structured alerts (e.g. cardiac condition, premedication required, bleeding disorder).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 5).
 */
export const medicalAlerts = pgTable('medical_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 100 }).notNull(), // 'medical_condition', 'premedication', 'bleeding_disorder', 'other'
  label: varchar('label', { length: 255 }).notNull(),
  severity: medicalAlertSeverityEnum('severity').notNull().default('medium'),
  active: boolean('active').notNull().default(true),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

/**
 * Patient Allergies.
 * Known allergic reactions (e.g. Penicillin, Latex, Local Anesthetics).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 5).
 */
export const allergies = pgTable('allergies', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  substance: varchar('substance', { length: 255 }).notNull(),
  reaction: varchar('reaction', { length: 255 }),
  severity: medicalAlertSeverityEnum('severity').notNull().default('medium'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
