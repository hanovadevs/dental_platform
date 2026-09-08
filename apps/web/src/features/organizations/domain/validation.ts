import { z } from 'zod';

/**
 * Validation schemas for organization and location.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Sections 2-3).
 */
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Clinic name must be at least 2 characters.')
    .max(255, 'Clinic name must be 255 characters or fewer.'),
  phone: z
    .string()
    .max(50, 'Phone must be 50 characters or fewer.')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Enter a valid email address.')
    .optional()
    .or(z.literal('')),
  defaultCurrency: z
    .string()
    .length(3, 'Currency code must be exactly 3 characters.')
    .default('PKR'),
  defaultTimezone: z
    .string()
    .min(1, 'Timezone is required.')
    .default('Asia/Karachi'),
});

export const createLocationSchema = z.object({
  name: z
    .string()
    .min(1, 'Location name is required.')
    .max(255, 'Location name must be 255 characters or fewer.'),
  address: z
    .string()
    .max(1000, 'Address must be 1000 characters or fewer.')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(50, 'Phone must be 50 characters or fewer.')
    .optional()
    .or(z.literal('')),
  timezone: z
    .string()
    .min(1, 'Timezone is required.')
    .default('Asia/Karachi'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
