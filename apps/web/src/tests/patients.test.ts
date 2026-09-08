import { describe, it, expect } from 'vitest';
import {
  createPatientSchema,
  updatePatientSchema,
  createMedicalAlertSchema,
  createAllergySchema,
} from '@/features/patients/domain/validation';

describe('Patient Domain Validation', () => {
  const validUuid = '11111111-1111-1111-1111-111111111111';

  it('validates a complete patient creation payload', () => {
    const input = {
      firstName: 'Ayesha',
      lastName: 'Malik',
      phone: '+92 300 1234567',
      email: 'ayesha@example.com',
      dateOfBirth: '1995-04-12',
      gender: 'Female',
      primaryLocationId: validUuid,
      preferredContactMethod: 'whatsapp' as const,
      preferredLanguage: 'ur',
      leadSource: 'Google Search',
      emergencyContact: {
        name: 'Tariq Malik',
        relationship: 'Father',
        phone: '+92 300 7654321',
      },
      initialMedicalAlert: {
        type: 'medical_condition',
        label: 'Mitral valve prolapse',
        severity: 'high' as const,
      },
    };

    const parsed = createPatientSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('requires first and last name and phone', () => {
    const emptyInput = {
      firstName: '',
      lastName: '',
      phone: '',
      primaryLocationId: validUuid,
    };

    const parsed = createPatientSchema.safeParse(emptyInput);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('firstName');
      expect(paths).toContain('lastName');
      expect(paths).toContain('phone');
    }
  });

  it('rejects invalid email formats when provided', () => {
    const input = {
      firstName: 'Ali',
      lastName: 'Khan',
      phone: '+92 300 0000000',
      email: 'not-an-email',
      primaryLocationId: validUuid,
    };

    const parsed = createPatientSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('allows empty string email as optional', () => {
    const input = {
      firstName: 'Ali',
      lastName: 'Khan',
      phone: '+92 300 0000000',
      email: '',
      primaryLocationId: validUuid,
    };

    const parsed = createPatientSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('validates medical alert severities', () => {
    const validAlert = {
      type: 'allergy',
      label: 'Penicillin allergy',
      severity: 'critical' as const,
    };
    expect(createMedicalAlertSchema.safeParse(validAlert).success).toBe(true);

    const invalidAlert = {
      type: 'allergy',
      label: 'Penicillin allergy',
      severity: 'extreme', // Invalid
    };
    expect(createMedicalAlertSchema.safeParse(invalidAlert).success).toBe(false);
  });

  it('validates allergy payloads', () => {
    const validAllergy = {
      substance: 'Latex',
      reaction: 'Contact dermatitis',
      severity: 'medium' as const,
    };
    expect(createAllergySchema.safeParse(validAllergy).success).toBe(true);

    const emptyAllergy = {
      substance: '',
    };
    expect(createAllergySchema.safeParse(emptyAllergy).success).toBe(false);
  });

  it('validates update patient schema with allowed statuses', () => {
    const update = {
      firstName: 'Sara',
      lastName: 'Ahmed',
      phone: '+92 300 9999999',
      status: 'recall_due' as const,
    };
    expect(updatePatientSchema.safeParse(update).success).toBe(true);

    const invalidStatus = {
      firstName: 'Sara',
      lastName: 'Ahmed',
      phone: '+92 300 9999999',
      status: 'deleted', // Invalid, must be 'archived'
    };
    expect(updatePatientSchema.safeParse(invalidStatus).success).toBe(false);
  });
});
