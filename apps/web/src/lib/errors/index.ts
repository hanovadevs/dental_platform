/**
 * Typed application error classes.
 * Per spec (03_IMPLEMENTATION_PLAN.md Section 15).
 *
 * Distinguish: validation, permission, conflict, not found, provider, internal.
 * Never expose raw stack traces or database errors to users.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNAUTHENTICATED';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    isOperational = true,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400);
    this.fields = fields;
  }
}

export class PermissionError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'PERMISSION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    const msg = id ? `${entity} not found (${id}).` : `${entity} not found.`;
    super(msg, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'You must be signed in to perform this action.') {
    super(message, 'UNAUTHENTICATED', 401);
  }
}

export class ProviderError extends AppError {
  public readonly provider: string;

  constructor(provider: string, message: string) {
    super(`${provider}: ${message}`, 'PROVIDER_ERROR', 502);
    this.provider = provider;
  }
}

/**
 * Format an error for client-side consumption.
 * Strips internal details; only returns safe, user-facing information.
 */
export function formatErrorForClient(error: unknown): {
  message: string;
  code: ErrorCode;
  fields?: Record<string, string[]>;
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      fields: error instanceof ValidationError ? error.fields : undefined,
    };
  }

  // Unknown errors — never expose internals
  console.error('Unhandled error:', error);
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
  };
}
