import { z } from 'zod';

export const createVoiceCallTaskSchema = z.object({
  patientId: z.string().uuid('Valid patient ID is required.'),
  opportunityId: z.string().uuid().optional().or(z.literal('')),
  intent: z.enum([
    'treatment_followup',
    'overdue_recall',
    'appointment_confirmation',
    'unscheduled_care',
    'reactivation',
    'custom',
  ]).default('treatment_followup'),
  treatmentSummary: z.string().max(1000).optional(),
  proposedProcedure: z.string().max(250).optional(),
  estimatedFee: z.coerce.number().min(0).optional(),
  appointmentOptions: z
    .array(
      z.object({
        date: z.string().min(1, 'Date is required'),
        time: z.string().min(1, 'Time is required'),
        chairId: z.string().uuid().optional(),
        dentistId: z.string().uuid().optional(),
      })
    )
    .default([]),
  scheduledFor: z.string().optional(),
});

export const escalateVoiceCallTaskSchema = z.object({
  taskId: z.string().uuid('Valid task ID is required.'),
  reason: z.string().min(3, 'Escalation reason must be at least 3 characters.').max(1000),
});

export type CreateVoiceCallTaskInput = z.infer<typeof createVoiceCallTaskSchema>;
export type EscalateVoiceCallTaskInput = z.infer<typeof escalateVoiceCallTaskSchema>;
