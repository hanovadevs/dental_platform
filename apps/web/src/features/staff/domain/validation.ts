import { z } from 'zod';

export const createStaffProfileSchema = z.object({
  email: z.string().email('Please enter a valid email address.').trim().toLowerCase(),
  firstName: z.string().min(1, 'First name is required.').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required.').max(100).trim(),
  phone: z.string().max(50).trim().optional(),
  jobTitle: z.string().min(1, 'Job title is required.').max(100).trim(),
  roleId: z.string().uuid('Please select a valid role.'),
  locationIds: z.array(z.string().uuid()).min(1, 'Select at least one clinic location.'),
  // Optional dentist details if role is clinical/dentist
  isDentist: z.boolean().default(false),
  licenseNumber: z.string().max(100).trim().optional(),
  specialty: z.string().max(100).trim().default('General Dentistry'),
  defaultAppointmentDuration: z.coerce.number().int().positive().default(30),
});

export const updateStaffProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.').max(255).trim(),
  phone: z.string().max(50).trim().optional(),
  jobTitle: z.string().min(1, 'Job title is required.').max(100).trim(),
  active: z.boolean().optional(),
});

export const updateDentistProfileSchema = z.object({
  licenseNumber: z.string().max(100).trim().optional(),
  specialty: z.string().min(1, 'Specialty is required.').max(100).trim(),
  defaultAppointmentDuration: z.coerce.number().int().min(10).max(480),
});

export const staffAvailabilitySlotSchema = z.object({
  locationId: z.string().uuid('Please select a valid location.'),
  dayOfWeek: z.coerce.number().int().min(0).max(6), // 0=Sunday, 6=Saturday
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Format must be HH:MM'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Format must be HH:MM'),
  active: z.boolean().default(true),
});

export const chairSchema = z.object({
  locationId: z.string().uuid('Please select a valid location.'),
  name: z.string().min(1, 'Chair name is required.').max(100).trim(),
  active: z.boolean().default(true),
});

export type CreateStaffProfileInput = z.infer<typeof createStaffProfileSchema>;
export type UpdateStaffProfileInput = z.infer<typeof updateStaffProfileSchema>;
export type UpdateDentistProfileInput = z.infer<typeof updateDentistProfileSchema>;
export type StaffAvailabilitySlotInput = z.infer<typeof staffAvailabilitySlotSchema>;
export type ChairInput = z.infer<typeof chairSchema>;
