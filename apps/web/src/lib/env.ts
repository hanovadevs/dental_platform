import { z } from 'zod';

/**
 * Environment variable validation.
 * Fails fast at startup if required variables are missing.
 * Per spec (10_DEPLOYMENT_OBSERVABILITY_AND_OPERATIONS.md Section 3).
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Dental Revenue OS'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('Environment validation failed:');
    console.error(JSON.stringify(formatted, null, 2));
    throw new Error(
      'Invalid environment variables. Check .env.local against .env.example.',
    );
  }

  return result.data;
}

export const env = validateEnv();
