import { z } from 'zod';
import {
  COMMUNICATION_CHANNELS,
  TEMPLATE_CATEGORIES,
  CONSENT_CATEGORIES,
  TRIGGER_EVENTS,
} from './types';

export const sendMessageSchema = z.object({
  patientId: z.string().uuid().optional().nullable(),
  appointmentId: z.string().uuid().optional().nullable(),
  opportunityId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  recallId: z.string().uuid().optional().nullable(),
  channel: z.enum(COMMUNICATION_CHANNELS),
  category: z.enum(CONSENT_CATEGORIES).default('operational'),
  recipient: z.string().min(1).max(255),
  templateId: z.string().uuid().optional().nullable(),
  subject: z.string().max(255).optional().nullable(),
  body: z.string().min(1),
  variables: z.record(z.string()).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const createTemplateSchema = z.object({
  name: z.string().min(2).max(150),
  category: z.enum(TEMPLATE_CATEGORIES),
  channel: z.enum(COMMUNICATION_CHANNELS),
  subject: z.string().max(255).optional().nullable(),
  body: z.string().min(1),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(2).max(150).optional(),
  category: z.enum(TEMPLATE_CATEGORIES).optional(),
  channel: z.enum(COMMUNICATION_CHANNELS).optional(),
  subject: z.string().max(255).optional().nullable(),
  body: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const createRuleSchema = z.object({
  name: z.string().min(2).max(150),
  triggerEvent: z.enum(TRIGGER_EVENTS),
  templateId: z.string().uuid().optional().nullable(),
  channel: z.enum(COMMUNICATION_CHANNELS),
  offsetHours: z.number().int().default(0),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateConsentSchema = z.object({
  patientId: z.string().uuid(),
  channel: z.enum(COMMUNICATION_CHANNELS),
  category: z.enum(CONSENT_CATEGORIES),
  consented: z.boolean(),
  source: z.string().max(100).optional(),
});

export type UpdateConsentInput = z.infer<typeof updateConsentSchema>;
