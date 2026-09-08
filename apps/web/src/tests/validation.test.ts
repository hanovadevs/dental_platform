import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '@/features/auth/domain/validation';
import { createOrganizationSchema, createLocationSchema } from '@/features/organizations/domain/validation';

describe('Auth Validation', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({ email: '', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({ email: 'notanemail', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('accepts valid registration', () => {
      const result = registerSchema.safeParse({
        firstName: 'Ali',
        lastName: 'Ahmed',
        email: 'ali@clinic.com',
        password: 'securepass',
        confirmPassword: 'securepass',
      });
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = registerSchema.safeParse({
        firstName: 'Ali',
        lastName: 'Ahmed',
        email: 'ali@clinic.com',
        password: 'securepass',
        confirmPassword: 'different',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('confirmPassword');
      }
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        firstName: 'Ali',
        lastName: 'Ahmed',
        email: 'ali@clinic.com',
        password: 'short',
        confirmPassword: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('provides human-readable error messages', () => {
      const result = registerSchema.safeParse({
        firstName: '',
        lastName: '',
        email: 'invalid',
        password: '123',
        confirmPassword: '456',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        // Per spec: validation errors should be human readable, not "invalid_string"
        expect(messages).not.toContain('invalid_string');
        expect(messages.some((m) => m.includes('required') || m.includes('valid') || m.includes('at least'))).toBe(true);
      }
    });
  });
});

describe('Organization Validation', () => {
  describe('createOrganizationSchema', () => {
    it('accepts valid organization', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'Smile Dental',
      });
      expect(result.success).toBe(true);
    });

    it('rejects name shorter than 2 characters', () => {
      const result = createOrganizationSchema.safeParse({ name: 'A' });
      expect(result.success).toBe(false);
    });

    it('provides default currency and timezone', () => {
      const result = createOrganizationSchema.safeParse({ name: 'Test Clinic' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.defaultCurrency).toBe('PKR');
        expect(result.data.defaultTimezone).toBe('Asia/Karachi');
      }
    });
  });

  describe('createLocationSchema', () => {
    it('accepts valid location', () => {
      const result = createLocationSchema.safeParse({
        name: 'Main Branch',
        address: '123 Street',
        timezone: 'Asia/Karachi',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing name', () => {
      const result = createLocationSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });
  });
});
