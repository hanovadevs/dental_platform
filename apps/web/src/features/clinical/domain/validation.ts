import { z } from 'zod';

export const allowedConditions = [
  'healthy',
  'caries',
  'filling',
  'crown',
  'root_canal',
  'missing',
  'implant',
  'bridge_abutment',
  'fracture',
  'extraction_recommended',
  'watch',
] as const;

export const allowedStatuses = [
  'diagnosed',
  'completed',
  'existing',
  'watch',
] as const;

export const recordToothConditionSchema = z.object({
  toothCode: z.string().min(1, 'Tooth identifier is required.').max(10).trim(),
  surface: z.string().max(20).trim().optional(),
  conditionType: z.enum(allowedConditions, {
    errorMap: () => ({ message: 'Please select a valid condition type.' }),
  }),
  status: z.enum(allowedStatuses).default('diagnosed'),
  notes: z.string().trim().optional(),
  supersedesId: z.string().uuid().optional().or(z.literal('')),
});

export const createClinicalNoteSchema = z.object({
  dentistId: z.string().uuid().optional().or(z.literal('')),
  chiefComplaint: z.string().trim().optional(),
  diagnosis: z.string().trim().optional(),
  treatmentProvided: z.string().min(1, 'Treatment provided details are required.').trim(),
  plan: z.string().trim().optional(),
});

export type RecordToothConditionInput = z.infer<typeof recordToothConditionSchema>;
export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>;
