import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { organizations } from './organizations';

// ============================================================================
// 1. REGISTRATION INTENTS
// ============================================================================

/**
 * Temporary Registration Intent created during clinic sign-up.
 * Represents an unactivated clinic awaiting payment verification.
 * Only activated/created as an organization after successful payment.
 */
export const registrationIntents = pgTable('registration_intents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'set null' }),
  clinicName: varchar('clinic_name', { length: 255 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 50 }).notNull(),
  plan: varchar('plan', { length: 50 }).default('starter').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('PKR').notNull(),
  status: varchar('status', { length: 30 }).default('pending_payment').notNull(),
  // 'pending_payment' | 'processing' | 'paid' | 'completed' | 'expired' | 'cancelled'
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('registration_intents_user_idx').on(table.userId),
  index('registration_intents_status_idx').on(table.status),
  index('registration_intents_org_idx').on(table.organizationId),
]);

// ============================================================================
// 2. PAYMENT RECORDS (GATEWAY TRANSACTIONS)
// ============================================================================

/**
 * Audit ledger for gateway transactions (Premier PayFast).
 * Never stores raw card numbers, CVVs, OTPs, or PINs.
 */
export const paymentRecords = pgTable('payment_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  registrationIntentId: uuid('registration_intent_id')
    .references(() => registrationIntents.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'set null' }),
  provider: varchar('provider', { length: 50 }).default('payfast').notNull(),
  providerTransactionId: varchar('provider_transaction_id', { length: 100 }),
  providerReference: varchar('provider_reference', { length: 100 }), // Basket ID / Order Reference
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('PKR').notNull(),
  status: varchar('status', { length: 30 }).default('pending').notNull(),
  // 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded'
  verificationStatus: varchar('verification_status', { length: 30 }).default('unverified').notNull(),
  // 'unverified' | 'verified' | 'failed'
  idempotencyKey: varchar('idempotency_key', { length: 150 }).notNull().unique(),
  providerMetadata: jsonb('provider_metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
}, (table) => [
  index('payment_records_user_idx').on(table.userId),
  index('payment_records_intent_idx').on(table.registrationIntentId),
  index('payment_records_ref_idx').on(table.providerReference),
  index('payment_records_status_idx').on(table.status),
]);

export type RegistrationIntent = typeof registrationIntents.$inferSelect;
export type NewRegistrationIntent = typeof registrationIntents.$inferInsert;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type NewPaymentRecord = typeof paymentRecords.$inferInsert;
