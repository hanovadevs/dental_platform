import { describe, it, expect } from 'vitest';
import {
  createStaffProfileSchema,
  updateDentistProfileSchema,
  staffAvailabilitySlotSchema,
  chairSchema,
} from '@/features/staff/domain/validation';

describe('Staff & Practitioner Validation', () => {
  const validUuid = '22222222-2222-2222-2222-222222222222';

  it('validates a complete staff profile payload', () => {
    const input = {
      email: 'dr.zain@clinic.com',
      firstName: 'Zain',
      lastName: 'Abbas',
      jobTitle: 'Orthodontist',
      roleId: validUuid,
      locationIds: [validUuid],
      isDentist: true,
      licenseNumber: 'PMDC-54321',
      specialty: 'Orthodontics',
      defaultAppointmentDuration: 45,
    };

    const parsed = createStaffProfileSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('requires at least one location for staff', () => {
    const input = {
      email: 'nurse@clinic.com',
      firstName: 'Fatima',
      lastName: 'Noor',
      jobTitle: 'Dental Assistant',
      roleId: validUuid,
      locationIds: [], // Empty
    };

    const parsed = createStaffProfileSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('validates dentist profile updates', () => {
    const valid = {
      specialty: 'Endodontics',
      defaultAppointmentDuration: 60,
      licenseNumber: 'LIC-999',
    };
    expect(updateDentistProfileSchema.safeParse(valid).success).toBe(true);

    const invalidDuration = {
      specialty: 'Endodontics',
      defaultAppointmentDuration: 0, // Must be >= 10
    };
    expect(updateDentistProfileSchema.safeParse(invalidDuration).success).toBe(false);
  });

  it('validates practitioner recurring availability slots', () => {
    const validSlot = {
      locationId: validUuid,
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '17:30',
      active: true,
    };
    expect(staffAvailabilitySlotSchema.safeParse(validSlot).success).toBe(true);

    const invalidDay = {
      locationId: validUuid,
      dayOfWeek: 7, // Invalid, max is 6
      startTime: '09:00',
      endTime: '17:00',
    };
    expect(staffAvailabilitySlotSchema.safeParse(invalidDay).success).toBe(false);

    const invalidTime = {
      locationId: validUuid,
      dayOfWeek: 2,
      startTime: '25:00', // Invalid hour
      endTime: '17:00',
    };
    expect(staffAvailabilitySlotSchema.safeParse(invalidTime).success).toBe(false);
  });

  it('validates operating chair payload', () => {
    const validChair = {
      locationId: validUuid,
      name: 'Operatory Chair 1',
      active: true,
    };
    expect(chairSchema.safeParse(validChair).success).toBe(true);

    const emptyName = {
      locationId: validUuid,
      name: '',
    };
    expect(chairSchema.safeParse(emptyName).success).toBe(false);
  });
});
