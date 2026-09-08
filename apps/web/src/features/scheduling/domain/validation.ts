import { z } from 'zod';

export const appointmentStatusEnum = z.enum([
  'scheduled',
  'confirmed',
  'checked_in',
  'in_chair',
  'completed',
  'cancelled',
  'no_show',
]);

export const confirmationStatusEnum = z.enum([
  'unconfirmed',
  'confirmed_patient',
  'confirmed_clinic',
  'reminder_sent',
]);

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Valid patient selection is required.'),
  locationId: z.string().uuid('Valid clinic location is required.'),
  chairId: z.string().uuid('Valid dental chair is required.'),
  dentistId: z.string().uuid('Valid treating practitioner is required.'),
  appointmentTypeId: z.string().uuid('Valid appointment type is required.'),
  startAt: z.string().min(1, 'Appointment start time is required.'),
  durationMinutes: z.coerce.number().min(10, 'Duration must be at least 10 minutes.').max(360, 'Duration cannot exceed 6 hours.').default(30),
  notes: z.string().trim().optional(),
  source: z.enum(['reception', 'online', 'call', 'recall', 'chair_fill']).default('reception'),
});

export const rescheduleAppointmentSchema = z.object({
  startAt: z.string().min(1, 'New appointment start time is required.'),
  durationMinutes: z.coerce.number().min(10).max(360).default(30),
  chairId: z.string().uuid().optional(),
  dentistId: z.string().uuid().optional(),
  reason: z.string().trim().optional(),
});

export const transitionAppointmentStatusSchema = z
  .object({
    targetStatus: appointmentStatusEnum,
    reason: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      // Cancellation requires a reason per Scenario C / audit compliance
      if (data.targetStatus === 'cancelled') {
        return !!data.reason && data.reason.trim().length > 0;
      }
      return true;
    },
    {
      message: 'A cancellation reason is required when cancelling an appointment.',
      path: ['reason'],
    }
  );

export const createWaitingListEntrySchema = z.object({
  patientId: z.string().uuid('Valid patient is required.'),
  locationId: z.string().uuid('Valid location is required.'),
  preferredDentistId: z.string().uuid().optional().or(z.literal('')),
  appointmentTypeId: z.string().uuid().optional().or(z.literal('')),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  notes: z.string().trim().optional(),
});

export const createAppointmentTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(100).trim(),
  durationMinutes: z.coerce.number().min(5).max(360).default(30),
  color: z.string().min(4).max(30).default('#0284c7'),
  defaultPrice: z.coerce.number().min(0).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type TransitionAppointmentStatusInput = z.infer<typeof transitionAppointmentStatusSchema>;
export type CreateWaitingListEntryInput = z.infer<typeof createWaitingListEntrySchema>;
export type CreateAppointmentTypeInput = z.infer<typeof createAppointmentTypeSchema>;
