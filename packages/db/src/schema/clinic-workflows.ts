import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
} from 'drizzle-orm/pg-core';
import { organizations, locations } from './organizations';
import { patients } from './patients';
import { users } from './users';
import { appointments } from './scheduling';

// ============================================================================
// 1. INVENTORY MANAGEMENT
// ============================================================================

/**
 * Inventory Items (stock, consumables, materials, instruments).
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.16).
 */
export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  category: varchar('category', { length: 100 }).notNull().default('general'),
  // 'restorative' | 'anesthetic' | 'endodontic' | 'orthodontic' | 'ppe' | 'disposable' | 'preventive' | 'instrument' | 'general'
  unit: varchar('unit', { length: 50 }).notNull().default('pcs'),
  // 'pcs' | 'box' | 'syringe' | 'bottle' | 'vial' | 'pack' | 'roll'
  quantityOnHand: integer('quantity_on_hand').notNull().default(0),
  minQuantity: integer('min_quantity').notNull().default(5),
  costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }).notNull().default('0.00'),
  supplierName: varchar('supplier_name', { length: 255 }),
  expiryDate: timestamp('expiry_date', { withTimezone: true }),
  batchNumber: varchar('batch_number', { length: 100 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Inventory Transactions (audit log of stock movements).
 * Events: 'stock_in' | 'stock_used' | 'stock_adjusted' | 'wasted' | 'expired'
 */
export const inventoryTransactions = pgTable('inventory_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id')
    .notNull()
    .references(() => inventoryItems.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 50 }).notNull(),
  // 'stock_in' | 'stock_used' | 'stock_adjusted' | 'wasted' | 'expired'
  quantityChange: integer('quantity_change').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  reason: varchar('reason', { length: 255 }),
  performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
  referenceId: uuid('reference_id'), // optional procedureId or appointmentId
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 2. DENTAL LAB TRACKING
// ============================================================================

/**
 * Dental Lab Vendors (external labs fabricating crowns, bridges, dentures).
 */
export const labVendors = pgTable('lab_vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 150 }),
  address: varchar('address', { length: 255 }),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Dental Lab Cases.
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.17).
 */
export const labCases = pgTable('lab_cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  dentistId: uuid('dentist_id').references(() => users.id, { onDelete: 'set null' }),
  labVendorId: uuid('lab_vendor_id')
    .notNull()
    .references(() => labVendors.id, { onDelete: 'restrict' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  toothNumber: varchar('tooth_number', { length: 50 }),
  workType: varchar('work_type', { length: 100 }).notNull(),
  // 'crown' | 'bridge' | 'denture' | 'implant_abutment' | 'inlay_onlay' | 'veneer' | 'aligner' | 'night_guard' | 'orthodontic_appliance' | 'other'
  shade: varchar('shade', { length: 50 }),
  status: varchar('status', { length: 50 }).notNull().default('prepared'),
  // 'prepared' | 'sent' | 'in_production' | 'received' | 'fitted' | 'rework' | 'cancelled'
  sentDate: timestamp('sent_date', { withTimezone: true }),
  expectedDate: timestamp('expected_date', { withTimezone: true }),
  receivedDate: timestamp('received_date', { withTimezone: true }),
  fittedDate: timestamp('fitted_date', { withTimezone: true }),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull().default('0.00'),
  notes: text('notes'),
  reworkReason: text('rework_reason'),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 3. PRESCRIPTIONS & MEDICATION TEMPLATES
// ============================================================================

/**
 * Medication Templates (clinic pre-configured prescription shortcuts).
 */
export const medicationTemplates = pgTable('medication_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  medicationName: varchar('medication_name', { length: 255 }).notNull(),
  dosage: varchar('dosage', { length: 100 }).notNull(),
  form: varchar('form', { length: 50 }).notNull().default('tablet'),
  // 'tablet' | 'capsule' | 'liquid' | 'suspension' | 'rinse' | 'ointment' | 'gel'
  frequency: varchar('frequency', { length: 100 }).notNull(),
  durationDays: integer('duration_days').notNull().default(5),
  instructions: text('instructions'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Prescriptions issued to a patient.
 */
export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  dentistId: uuid('dentist_id').references(() => users.id, { onDelete: 'set null' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  // 'active' | 'completed' | 'cancelled'
  notes: text('notes'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Individual medication line items inside a prescription.
 */
export const prescriptionItems = pgTable('prescription_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  prescriptionId: uuid('prescription_id')
    .notNull()
    .references(() => prescriptions.id, { onDelete: 'cascade' }),
  medicationName: varchar('medication_name', { length: 255 }).notNull(),
  dosage: varchar('dosage', { length: 100 }).notNull(),
  form: varchar('form', { length: 50 }).notNull().default('tablet'),
  frequency: varchar('frequency', { length: 100 }).notNull(),
  durationDays: integer('duration_days').notNull().default(5),
  quantity: varchar('quantity', { length: 50 }).notNull(),
  instructions: text('instructions'),
});

// ============================================================================
// 4. CLINICAL DOCUMENTS & DIGITAL CONSENT
// ============================================================================

/**
 * Consent Templates (e.g. Surgical Extraction, Endodontic, Implants).
 */
export const consentTemplates = pgTable('consent_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull().default('general'),
  // 'general' | 'endodontic' | 'surgical' | 'prosthodontic' | 'cosmetic' | 'anesthesia'
  body: text('body').notNull(),
  version: integer('version').notNull().default(1),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Patient Documents & Signed Records.
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.14).
 */
export const patientDocuments = pgTable('patient_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => consentTemplates.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('consent_form'),
  // 'consent_form' | 'medical_history' | 'treatment_plan' | 'invoice' | 'prescription' | 'external_upload'
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  // 'draft' | 'pending_signature' | 'signed' | 'archived'
  content: text('content'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  signerName: varchar('signer_name', { length: 255 }),
  signatureData: text('signature_data'), // digital signature capture or hash
  witnessName: varchar('witness_name', { length: 255 }),
  fileUrl: varchar('file_url', { length: 500 }),
  fileHash: varchar('file_hash', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
