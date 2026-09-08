import { z } from 'zod';

export const invoiceLineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200).trim(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  discount: z.number().min(0, 'Discount must be non-negative').default(0),
  procedureId: z.string().uuid().optional().nullable(),
  treatmentPlanItemId: z.string().uuid().optional().nullable(),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemInputSchema>;

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid('Patient is required'),
  locationId: z.string().uuid('Location is required'),
  items: z.array(invoiceLineItemInputSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(), // ISO string date
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const recordPaymentSchema = z.object({
  patientId: z.string().uuid('Patient is required'),
  invoiceId: z.string().uuid().optional().nullable(),
  amount: z.number().positive('Payment amount must be greater than 0'),
  method: z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'other']),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
