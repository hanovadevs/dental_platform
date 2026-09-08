import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  UnauthenticatedError,
  formatErrorForClient,
} from '@/lib/errors';

describe('Error handling', () => {
  describe('Error classes', () => {
    it('ValidationError has correct code and status', () => {
      const err = new ValidationError('Bad input', { email: ['Invalid email'] });
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.statusCode).toBe(400);
      expect(err.fields).toEqual({ email: ['Invalid email'] });
    });

    it('PermissionError has correct code and status', () => {
      const err = new PermissionError();
      expect(err.code).toBe('PERMISSION_ERROR');
      expect(err.statusCode).toBe(403);
    });

    it('NotFoundError formats entity name', () => {
      const err = new NotFoundError('Patient', '123');
      expect(err.message).toBe('Patient not found (123).');
      expect(err.statusCode).toBe(404);
    });

    it('ConflictError has correct code', () => {
      const err = new ConflictError('Duplicate record');
      expect(err.code).toBe('CONFLICT');
      expect(err.statusCode).toBe(409);
    });

    it('UnauthenticatedError has correct code', () => {
      const err = new UnauthenticatedError();
      expect(err.code).toBe('UNAUTHENTICATED');
      expect(err.statusCode).toBe(401);
    });
  });

  describe('formatErrorForClient', () => {
    it('formats AppError safely', () => {
      const err = new ValidationError('Fix errors', { name: ['Required'] });
      const result = formatErrorForClient(err);
      expect(result.message).toBe('Fix errors');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.fields).toEqual({ name: ['Required'] });
    });

    it('hides unknown error details', () => {
      const result = formatErrorForClient(new Error('SQL injection attempt'));
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.code).toBe('INTERNAL_ERROR');
    });

    it('hides non-error values', () => {
      const result = formatErrorForClient('raw string error');
      expect(result.code).toBe('INTERNAL_ERROR');
    });
  });
});
