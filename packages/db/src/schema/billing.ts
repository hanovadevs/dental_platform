import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';
import { organizations, locations } from './organizations';
import { patients } from './patients';
import { users } from './users';
import { procedures, treatmentPlanItems } from './treatments';

/**
 * Invoices (Patient Financial Records).
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 12).
 */
export const invoices = pgTable('invoices', {
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
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(), // e.g. "INV-1001"
  status: varchar('status', { length: 30 }).default('issued').notNull(),
  // 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void' | 'refunded'
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  discountTotal: numeric('discount_total', { precision: 12, scale: 2 }).default('0').notNull(),
  taxTotal: numeric('tax_total', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).default('0').notNull(),
  amountDue: numeric('amount_due', { precision: 12, scale: 2 }).default('0').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Line items within an Invoice.
 * Connects directly to completed clinical procedures or treatment items.
 */
export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  procedureId: uuid('procedure_id').references(() => procedures.id, {
    onDelete: 'set null',
  }),
  treatmentPlanItemId: uuid('treatment_plan_item_id').references(() => treatmentPlanItems.id, {
    onDelete: 'set null',
  }),
  description: varchar('description', { length: 200 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
});

/**
 * Payments & Financial Receipts.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 12).
 * Append-only financial ledger: refunds and reversals use status='reversed'.
 */
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, {
    onDelete: 'set null',
  }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull(), // e.g. "REC-1001"
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  method: varchar('method', { length: 30 }).notNull(), // 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other'
  reference: varchar('reference', { length: 100 }), // Card auth code, transaction ID, cheque number
  paidAt: timestamp('paid_at', { withTimezone: true }).defaultNow().notNull(),
  recordedBy: uuid('recorded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 20 }).default('completed').notNull(), // 'completed' | 'reversed'
  notes: text('notes'),
});
