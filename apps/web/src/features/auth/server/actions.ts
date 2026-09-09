'use server';

import { db } from '@dental/db';
import { users } from '@dental/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { registerSchema } from '../domain/validation';
import { ConflictError, ValidationError } from '@/lib/errors';
import { formatErrorForClient } from '@/lib/errors';

import { registrationIntents } from '@dental/db';
import { registerClinicWithIntentSchema, PAYMENT_CONFIG } from '@/features/payments';

export interface RegisterResult {
  success: boolean;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

export interface RegisterClinicResult {
  success: boolean;
  intentId?: string;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Register a new user.
 * Does NOT create an organization — that happens in the onboarding flow.
 */
export async function registerUser(formData: FormData): Promise<RegisterResult> {
  try {
    const raw = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    // Validate
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field]!.push(issue.message);
      }
      return {
        success: false,
        error: {
          message: 'Please fix the errors below.',
          code: 'VALIDATION_ERROR',
          fields: fieldErrors,
        },
      };
    }

    const { firstName, lastName, email, password } = parsed.data;

    // Check duplicate
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existing) {
      return {
        success: false,
        error: {
          message: 'An account with this email already exists.',
          code: 'CONFLICT',
        },
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatErrorForClient(error),
    };
  }
}

/**
 * Register a new clinic account with an initial registration intent.
 * Creates the user record and registration_intents entry within a transaction.
 */
export async function registerClinicAccount(formData: FormData): Promise<RegisterClinicResult> {
  try {
    const raw = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      clinicName: formData.get('clinicName') as string,
      phone: formData.get('phone') as string,
    };

    const parsed = registerClinicWithIntentSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field]!.push(issue.message);
      }
      return {
        success: false,
        error: {
          message: 'Please fix the errors below.',
          code: 'VALIDATION_ERROR',
          fields: fieldErrors,
        },
      };
    }

    const { firstName, lastName, email, password, clinicName, phone } = parsed.data;

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existing) {
      return {
        success: false,
        error: {
          message: 'An account with this email already exists.',
          code: 'CONFLICT',
        },
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: email.toLowerCase().trim(),
          passwordHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        })
        .returning();

      if (!user) throw new Error('Failed to create user account');

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const [intent] = await tx
        .insert(registrationIntents)
        .values({
          userId: user.id,
          clinicName: clinicName.trim(),
          contactEmail: email.toLowerCase().trim(),
          contactPhone: phone.trim(),
          plan: 'starter',
          amount: PAYMENT_CONFIG.registrationFeePkr,
          currency: PAYMENT_CONFIG.currency,
          status: 'pending_payment',
          expiresAt,
        })
        .returning();

      if (!intent) throw new Error('Failed to create registration intent');

      return { intentId: intent.id };
    });

    return {
      success: true,
      intentId: result.intentId,
    };
  } catch (error) {
    return {
      success: false,
      error: formatErrorForClient(error),
    };
  }
}

