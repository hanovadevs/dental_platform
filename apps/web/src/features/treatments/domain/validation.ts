import { z } from 'zod';

export const createTreatmentDefinitionSchema = z.object({
  code: z.string().min(2, 'Code is required').max(30).trim(),
  name: z.string().min(2, 'Name is required').max(120).trim(),
  category: z.enum([
    'preventive',
    'restorative',
    'endodontics',
    'prosthodontics',
    'periodontics',
    'oral_surgery',
    'orthodontics',
    'cosmetic',
  ]),
  defaultDurationMinutes: z.number().int().min(5).max(480).default(30),
  defaultPrice: z.number().min(0, 'Price must be positive'),
  currency: z.string().max(10).default('USD'),
  toothSpecific: z.boolean().default(false),
  surfaceSpecific: z.boolean().default(false),
});

export type CreateTreatmentDefinitionInput = z.infer<typeof createTreatmentDefinitionSchema>;

export const treatmentPlanItemInputSchema = z.object({
  treatmentDefinitionId: z.string().uuid('Treatment definition is required'),
  toothCode: z.string().max(10).optional().nullable(),
  surface: z.string().max(20).optional().nullable(),
  sequence: z.number().int().min(1).default(1),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  price: z.number().min(0, 'Price must be positive'),
  discount: z.number().min(0, 'Discount must be positive').default(0),
  notes: z.string().optional().nullable(),
});

export type TreatmentPlanItemInput = z.infer<typeof treatmentPlanItemInputSchema>;

export const createTreatmentPlanSchema = z.object({
  patientId: z.string().uuid('Patient is required'),
  locationId: z.string().uuid('Location is required'),
  dentistId: z.string().uuid('Dentist is required'),
  title: z.string().min(2, 'Title is required').max(150).default('Treatment Plan'),
  notes: z.string().optional().nullable(),
  items: z.array(treatmentPlanItemInputSchema).min(1, 'At least one treatment item is required'),
});

export type CreateTreatmentPlanInput = z.infer<typeof createTreatmentPlanSchema>;

export const updatePlanItemStatusSchema = z.object({
  itemId: z.string().uuid('Plan item ID is required'),
  status: z.enum([
    'proposed',
    'accepted',
    'declined',
    'deferred',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
  ]),
  notes: z.string().optional().nullable(),
});

export type UpdatePlanItemStatusInput = z.infer<typeof updatePlanItemStatusSchema>;

export const completeTreatmentItemSchema = z.object({
  itemId: z.string().uuid('Plan item ID is required'),
  appointmentId: z.string().uuid().optional().nullable(),
  dentistId: z.string().uuid('Dentist is required'),
  toothCode: z.string().max(10).optional().nullable(),
  surface: z.string().max(20).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CompleteTreatmentItemInput = z.infer<typeof completeTreatmentItemSchema>;
