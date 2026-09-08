import { z } from 'zod';

export const createEmergencyContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required.').max(255).trim(),
  relationship: z.string().min(1, 'Relationship is required.').max(100).trim(),
  phone: z.string().min(1, 'Contact phone is required.').max(50).trim(),
});

export const medicalAlertSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const createMedicalAlertSchema = z.object({
  type: z.string().min(1, 'Alert type is required.').max(100).trim(),
  label: z.string().min(1, 'Alert description/label is required.').max(255).trim(),
  severity: medicalAlertSeveritySchema.default('medium'),
});

export const createAllergySchema = z.object({
  substance: z.string().min(1, 'Allergen / substance is required.').max(255).trim(),
  reaction: z.string().max(255).trim().optional(),
  severity: medicalAlertSeveritySchema.default('medium'),
});

export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required.').max(100).trim(),
  phone: z.string().min(1, 'Phone number is required.').max(50).trim(),
  email: z.string().email('Please enter a valid email address.').trim().toLowerCase().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.string().max(20).trim().optional(),
  primaryLocationId: z.string().uuid('Please select a primary clinic location.'),
  primaryDentistId: z.string().uuid().optional().or(z.literal('')),
  preferredLanguage: z.string().max(50).default('en'),
  preferredContactMethod: z.enum(['phone', 'sms', 'email', 'whatsapp']).default('phone'),
  leadSource: z.string().max(100).trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  // Optional embedded emergency contact on signup
  emergencyContact: createEmergencyContactSchema.optional(),
  // Optional initial medical alert on signup
  initialMedicalAlert: createMedicalAlertSchema.optional(),
});

export const updatePatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required.').max(100).trim(),
  phone: z.string().min(1, 'Phone number is required.').max(50).trim(),
  email: z.string().email('Please enter a valid email address.').trim().toLowerCase().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.string().max(20).trim().optional(),
  primaryLocationId: z.string().uuid('Please select a primary clinic location.').optional(),
  primaryDentistId: z.string().uuid().optional().or(z.literal('')),
  preferredLanguage: z.string().max(50).optional(),
  preferredContactMethod: z.enum(['phone', 'sms', 'email', 'whatsapp']).optional(),
  leadSource: z.string().max(100).trim().optional(),
  status: z.enum(['active', 'recall_due', 'inactive', 'archived']).optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type CreateEmergencyContactInput = z.infer<typeof createEmergencyContactSchema>;
export type CreateMedicalAlertInput = z.infer<typeof createMedicalAlertSchema>;
export type CreateAllergyInput = z.infer<typeof createAllergySchema>;
