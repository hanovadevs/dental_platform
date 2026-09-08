import { z } from 'zod';
import {
  OPPORTUNITY_TYPES,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_PRIORITIES,
  OUTREACH_CHANNELS,
  OUTREACH_OUTCOMES,
  RESOLUTION_TYPES,
} from './types';

export const logOutreachSchema = z.object({
  opportunityId: z.string().uuid(),
  channel: z.enum(OUTREACH_CHANNELS),
  outcome: z.enum(OUTREACH_OUTCOMES),
  notes: z.string().max(1000).optional(),
  nextActionDate: z.string().optional(),
});

export type LogOutreachInput = z.infer<typeof logOutreachSchema>;

export const resolveOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  resolutionType: z.enum(RESOLUTION_TYPES),
  notes: z.string().max(1000).optional(),
  recoveredAmount: z.number().min(0).optional(),
});

export type ResolveOpportunityInput = z.infer<typeof resolveOpportunitySchema>;

export const snoozeOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  snoozedUntil: z.string(), // ISO date
  notes: z.string().max(1000).optional(),
});

export type SnoozeOpportunityInput = z.infer<typeof snoozeOpportunitySchema>;

export const createRecallSchema = z.object({
  patientId: z.string().uuid(),
  ruleId: z.string().uuid(),
  dueAt: z.string(), // ISO date string
  notes: z.string().max(1000).optional(),
});

export type CreateRecallInput = z.infer<typeof createRecallSchema>;

export const createRecallRuleSchema = z.object({
  name: z.string().min(2).max(100),
  intervalDays: z.number().int().min(1).max(3650),
  treatmentDefinitionId: z.string().uuid().optional().nullable(),
});

export type CreateRecallRuleInput = z.infer<typeof createRecallRuleSchema>;
