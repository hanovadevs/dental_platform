import { describe, it, expect } from 'vitest';
import {
  hasTimeOverlap,
  findChairConflict,
  findDentistConflict,
  calculateEndTime,
  generateTimeSlots,
  AppointmentSlotCheck,
} from '@/features/scheduling/domain/conflicts';
import {
  createAppointmentSchema,
  transitionAppointmentStatusSchema,
  rescheduleAppointmentSchema,
} from '@/features/scheduling/domain/validation';

describe('Scheduling Domain: Intervals & Conflicts', () => {
  const baseTime = new Date('2026-09-10T10:00:00Z');
  const plus30m = new Date('2026-09-10T10:30:00Z');
  const plus60m = new Date('2026-09-10T11:00:00Z');
  const plus90m = new Date('2026-09-10T11:30:00Z');

  describe('hasTimeOverlap', () => {
    it('detects overlapping intervals', () => {
      // Slot 1: 10:00 - 11:00, Slot 2: 10:30 - 11:30
      expect(hasTimeOverlap(baseTime, plus60m, plus30m, plus90m)).toBe(true);
    });

    it('identifies adjacent non-overlapping intervals (back-to-back appointments)', () => {
      // Slot 1: 10:00 - 10:30, Slot 2: 10:30 - 11:00
      expect(hasTimeOverlap(baseTime, plus30m, plus30m, plus60m)).toBe(false);
    });

    it('identifies completely disjoint intervals', () => {
      // Slot 1: 10:00 - 10:30, Slot 2: 11:00 - 11:30
      expect(hasTimeOverlap(baseTime, plus30m, plus60m, plus90m)).toBe(false);
    });
  });

  describe('Chair & Dentist Conflict Detection', () => {
    const existing: AppointmentSlotCheck[] = [
      {
        id: 'appt-1',
        chairId: 'chair-1',
        dentistId: 'dentist-1',
        startAt: baseTime,
        endAt: plus60m,
        status: 'scheduled',
      },
      {
        id: 'appt-2',
        chairId: 'chair-2',
        dentistId: 'dentist-2',
        startAt: baseTime,
        endAt: plus30m,
        status: 'cancelled', // Cancelled! Slot is open
      },
    ];

    it('flags conflict when chair is already booked', () => {
      // Propose chair-1 at 10:15 - 10:45
      const conflict = findChairConflict(
        existing,
        'chair-1',
        new Date('2026-09-10T10:15:00Z'),
        new Date('2026-09-10T10:45:00Z')
      );
      expect(conflict).toBeDefined();
      expect(conflict?.id).toBe('appt-1');
    });

    it('allows booking on a different available chair at the same time', () => {
      // Propose chair-3 with dentist-3 at 10:00 - 10:30
      const conflict = findChairConflict(
        existing,
        'chair-3',
        baseTime,
        plus30m
      );
      expect(conflict).toBeUndefined();
    });

    it('allows booking on a chair where previous appointment was cancelled', () => {
      // chair-2 had a cancelled appointment at 10:00 - 10:30
      const conflict = findChairConflict(
        existing,
        'chair-2',
        baseTime,
        plus30m
      );
      expect(conflict).toBeUndefined();
    });

    it('flags dentist conflict even if chairs are different', () => {
      // dentist-1 is in chair-1 at 10:00 - 11:00. Trying to book dentist-1 in chair-3:
      const conflict = findDentistConflict(
        existing,
        'dentist-1',
        plus30m,
        plus60m
      );
      expect(conflict).toBeDefined();
      expect(conflict?.id).toBe('appt-1');
    });

    it('ignores self when checking conflicts during rescheduling', () => {
      const conflict = findChairConflict(
        existing,
        'chair-1',
        baseTime,
        plus60m,
        'appt-1' // Self excluded
      );
      expect(conflict).toBeUndefined();
    });
  });

  describe('Time Slots & Calculation', () => {
    it('calculates end time accurately given duration in minutes', () => {
      const end = calculateEndTime(baseTime, 45);
      expect(end.getTime() - baseTime.getTime()).toBe(45 * 60 * 1000);
    });

    it('generates clinical time slots from 08:00 to 20:00 in 30-min intervals', () => {
      const slots = generateTimeSlots(8, 20, 30);
      expect(slots[0]).toBe('08:00');
      expect(slots[1]).toBe('08:30');
      expect(slots[slots.length - 1]).toBe('19:30');
      expect(slots).toHaveLength(24);
    });
  });
});

describe('Scheduling Zod Validation', () => {
  const validUuid = '11111111-1111-1111-1111-111111111111';

  it('validates a correct appointment booking payload', () => {
    const input = {
      patientId: validUuid,
      locationId: validUuid,
      chairId: validUuid,
      dentistId: validUuid,
      appointmentTypeId: validUuid,
      startAt: '2026-09-10T09:00:00Z',
      durationMinutes: 45,
      notes: 'Scaling and general checkup',
    };

    const parsed = createAppointmentSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('rejects appointments with durations less than 10 minutes', () => {
    const input = {
      patientId: validUuid,
      locationId: validUuid,
      chairId: validUuid,
      dentistId: validUuid,
      appointmentTypeId: validUuid,
      startAt: '2026-09-10T09:00:00Z',
      durationMinutes: 5, // Too short
    };

    const parsed = createAppointmentSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('mandates a cancellation reason when cancelling an appointment', () => {
    // Valid cancellation with reason
    const validCancel = {
      targetStatus: 'cancelled' as const,
      reason: 'Patient had a family emergency',
    };
    expect(transitionAppointmentStatusSchema.safeParse(validCancel).success).toBe(true);

    // Invalid cancellation without reason
    const invalidCancel = {
      targetStatus: 'cancelled' as const,
      reason: '', // Empty reason
    };
    expect(transitionAppointmentStatusSchema.safeParse(invalidCancel).success).toBe(false);
  });

  it('allows standard status transitions without requiring a reason', () => {
    const checkIn = {
      targetStatus: 'checked_in' as const,
    };
    expect(transitionAppointmentStatusSchema.safeParse(checkIn).success).toBe(true);
  });
});
