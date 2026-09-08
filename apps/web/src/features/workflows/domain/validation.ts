import { z } from 'zod';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  INVENTORY_TRANSACTION_TYPES,
  LAB_WORK_TYPES,
  LAB_CASE_STATUSES,
  MEDICATION_FORMS,
  DOCUMENT_TYPES,
} from './types';

// ============================================================================
// 1. INVENTORY VALIDATION SCHEMAS
// ============================================================================

export const createInventoryItemSchema = z.object({
  name: z.string().min(2, 'Item name must be at least 2 characters').max(255),
  sku: z.string().max(100).optional().nullable(),
  category: z.enum(INVENTORY_CATEGORIES).default('general'),
  unit: z.enum(INVENTORY_UNITS).default('pcs'),
  quantityOnHand: z.coerce.number().int().min(0, 'Initial quantity must be non-negative').default(0),
  minQuantity: z.coerce.number().int().min(0, 'Minimum threshold must be non-negative').default(5),
  costPerUnit: z.coerce.number().min(0, 'Cost per unit must be non-negative').default(0),
  supplierName: z.string().max(255).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  batchNumber: z.string().max(100).optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({
  active: z.boolean().optional(),
});

export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

export const recordStockAdjustmentSchema = z.object({
  itemId: z.string().uuid('Valid item ID is required'),
  type: z.enum(INVENTORY_TRANSACTION_TYPES),
  quantityChange: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, { message: 'Quantity change cannot be zero' }),
  reason: z.string().min(2, 'Reason for adjustment is required').max(255),
  locationId: z.string().uuid().optional().nullable(),
  referenceId: z.string().uuid().optional().nullable(),
});

export type RecordStockAdjustmentInput = z.infer<typeof recordStockAdjustmentSchema>;

// ============================================================================
// 2. DENTAL LAB VALIDATION SCHEMAS
// ============================================================================

export const createLabVendorSchema = z.object({
  name: z.string().min(2, 'Vendor name is required').max(255),
  contactName: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateLabVendorInput = z.infer<typeof createLabVendorSchema>;

export const createLabCaseSchema = z.object({
  patientId: z.string().uuid('Valid patient is required'),
  dentistId: z.string().uuid().optional().nullable(),
  labVendorId: z.string().uuid('Valid lab vendor is required'),
  appointmentId: z.string().uuid().optional().nullable(),
  toothNumber: z.string().max(50).optional().nullable(),
  workType: z.enum(LAB_WORK_TYPES),
  shade: z.string().max(50).optional().nullable(),
  sentDate: z.string().optional().nullable(),
  expectedDate: z.string().optional().nullable(),
  cost: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  trackingNumber: z.string().max(100).optional().nullable(),
});

export type CreateLabCaseInput = z.infer<typeof createLabCaseSchema>;

export const updateLabCaseStatusSchema = z.object({
  labCaseId: z.string().uuid('Valid lab case ID is required'),
  status: z.enum(LAB_CASE_STATUSES),
  receivedDate: z.string().optional().nullable(),
  fittedDate: z.string().optional().nullable(),
  reworkReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type UpdateLabCaseStatusInput = z.infer<typeof updateLabCaseStatusSchema>;

// ============================================================================
// 3. PRESCRIPTION VALIDATION SCHEMAS
// ============================================================================

export const prescriptionItemSchema = z.object({
  medicationName: z.string().min(2, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  form: z.enum(MEDICATION_FORMS).default('tablet'),
  frequency: z.string().min(1, 'Frequency is required'),
  durationDays: z.coerce.number().int().min(1, 'Duration must be at least 1 day').default(5),
  quantity: z.string().min(1, 'Quantity is required'),
  instructions: z.string().optional().nullable(),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid('Valid patient ID is required'),
  dentistId: z.string().uuid().optional().nullable(),
  appointmentId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(prescriptionItemSchema).min(1, 'At least one medication item is required'),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const createMedicationTemplateSchema = z.object({
  name: z.string().min(2, 'Template name is required'),
  medicationName: z.string().min(2, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  form: z.enum(MEDICATION_FORMS).default('tablet'),
  frequency: z.string().min(1, 'Frequency is required'),
  durationDays: z.coerce.number().int().min(1).default(5),
  instructions: z.string().optional().nullable(),
});

export type CreateMedicationTemplateInput = z.infer<typeof createMedicationTemplateSchema>;

// ============================================================================
// 4. DIGITAL CONSENT & DOCUMENT VALIDATION SCHEMAS
// ============================================================================

export const createConsentTemplateSchema = z.object({
  title: z.string().min(2, 'Consent title is required').max(255),
  category: z.string().default('general'),
  body: z.string().min(10, 'Consent body must be informative'),
});

export type CreateConsentTemplateInput = z.infer<typeof createConsentTemplateSchema>;

export const signDocumentSchema = z.object({
  patientId: z.string().uuid('Valid patient ID is required'),
  templateId: z.string().uuid().optional().nullable(),
  title: z.string().min(2, 'Document title is required'),
  type: z.enum(DOCUMENT_TYPES).default('consent_form'),
  content: z.string().optional().nullable(),
  signerName: z.string().min(2, 'Signer name is required'),
  signatureData: z.string().min(5, 'Digital signature confirmation is required'),
  witnessName: z.string().optional().nullable(),
});

export type SignDocumentInput = z.infer<typeof signDocumentSchema>;
