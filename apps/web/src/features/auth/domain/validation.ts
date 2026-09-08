import { z } from 'zod';

/**
 * Shared validation schemas for auth forms.
 * Per spec (03_IMPLEMENTATION_PLAN.md Section 5):
 * "Use shared schemas for server input validation and form validation."
 * "Validation errors should be human readable."
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required.')
    .max(100, 'First name must be 100 characters or fewer.'),
  lastName: z
    .string()
    .min(1, 'Last name is required.')
    .max(100, 'Last name must be 100 characters or fewer.'),
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be 128 characters or fewer.'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
