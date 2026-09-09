import { z } from 'zod';

export const registerClinicWithIntentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  clinicName: z.string().min(2, 'Clinic name must be at least 2 characters').max(200),
  phone: z.string().min(7, 'Please provide a valid phone number').max(30),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const payfastCallbackPayloadSchema = z.object({
  basket_id: z.string().optional(),
  BASKET_ID: z.string().optional(),
  err_code: z.string().optional(),
  ERR_CODE: z.string().optional(),
  err_msg: z.string().optional(),
  ERR_MSG: z.string().optional(),
  transaction_id: z.string().optional(),
  TRANSACTION_ID: z.string().optional(),
  validation_hash: z.string().optional(),
  VALIDATION_HASH: z.string().optional(),
});
