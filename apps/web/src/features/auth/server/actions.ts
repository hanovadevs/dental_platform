'use server';

import { db } from '@dental/db';
import { users } from '@dental/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { registerSchema } from '../domain/validation';
import { ConflictError, ValidationError } from '@/lib/errors';
import { formatErrorForClient } from '@/lib/errors';

export interface RegisterResult {
  success: boolean;
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
