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
import { users } from './users';

// ============================================================================
// 1. SUBSCRIPTIONS & COMMERCIAL TIERS
// ============================================================================

/**
 * Organization Subscriptions & Commercial Plan Limits.
 * Per spec (02_PHASES_AND_ROADMAP.md Phase 9 & 08_SECURITY_PRIVACY_AND_AUDIT.md).
 */
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 50 }).notNull().default('starter'), // 'starter' | 'growth' | 'enterprise'
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'trial' | 'active' | 'past_due' | 'cancelled'
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true })
    .defaultNow()
    .notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  maxLocations: integer('max_locations').notNull().default(1),
  maxChairs: integer('max_chairs').notNull().default(3),
  features: text('features'), // Comma-delimited enabled feature flags
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 2. BULK PATIENT IMPORT AUDIT
// ============================================================================

/**
 * Bulk Patient Import History & Error Diagnostics.
 * Per spec (09_TESTING_AND_QA.md Section 7).
 */
export const patientImports = pgTable('patient_imports', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  totalRows: integer('total_rows').notNull().default(0),
  importedRows: integer('imported_rows').notNull().default(0),
  failedRows: integer('failed_rows').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('completed'), // 'processing' | 'completed' | 'failed'
  errorReport: text('error_report'), // JSON serialized errors by row index
  importedBy: uuid('imported_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
