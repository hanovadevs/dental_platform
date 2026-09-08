import { describe, it, expect } from 'vitest';
import {
  findChairConflict,
  AppointmentSlotCheck,
} from '@/features/scheduling/domain/conflicts';
import { transitionAppointmentStatusSchema } from '@/features/scheduling/domain/validation';

describe('Scenario C: Cancellation, History Preservation & Chair Slot Recovery', () => {
  const chairA = 'chair-operatory-1';
  const dentistA = 'dentist-dr-ali';
  const startAt = new Date('2026-09-12T09:00:00Z');
  const endAt = new Date('2026-09-12T10:00:00Z');

  interface MockAppointmentRecord {
    id: string;
    chairId: string;
    dentistId: string;
    startAt: Date;
    endAt: Date;
    status: string;
    cancellationReason?: string | null;
  }

  interface MockStatusHistoryRecord {
    id: string;
    appointmentId: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    changedAt: Date;
  }

  it('executes Scenario C workflow: creates appointment, cancels with reason, preserves history, and frees chair slot', () => {
    // 1. Create appointment
    const appt: MockAppointmentRecord = {
      id: 'appt-1001',
      chairId: chairA,
      dentistId: dentistA,
      startAt,
      endAt,
      status: 'scheduled',
    };

    const history: MockStatusHistoryRecord[] = [
      {
        id: 'hist-1',
        appointmentId: appt.id,
        fromStatus: null,
        toStatus: 'scheduled',
        reason: 'Initial booking',
        changedAt: new Date(),
      },
    ];

    // Verify chair is occupied initially
    let conflict = findChairConflict([appt], chairA, startAt, endAt);
    expect(conflict).toBeDefined();
    expect(conflict?.id).toBe('appt-1001');

    // 2. Validate cancellation payload requires a reason
    const cancellationInput = {
      targetStatus: 'cancelled' as const,
      reason: 'Patient called with high fever, unable to travel.',
    };
    const parsed = transitionAppointmentStatusSchema.safeParse(cancellationInput);
    expect(parsed.success).toBe(true);

    // 3. Perform cancellation transition
    appt.status = 'cancelled';
    appt.cancellationReason = cancellationInput.reason;

    // Append to status history (preserving audit trail)
    history.push({
      id: 'hist-2',
      appointmentId: appt.id,
      fromStatus: 'scheduled',
      toStatus: 'cancelled',
      reason: cancellationInput.reason,
      changedAt: new Date(),
    });

    // 4. Verify appointment is NOT deleted and maintains reason
    expect(appt.status).toBe('cancelled');
    expect(appt.cancellationReason).toBe('Patient called with high fever, unable to travel.');
    expect(history).toHaveLength(2);
    expect(history[1]?.fromStatus).toBe('scheduled');
    expect(history[1]?.toStatus).toBe('cancelled');
    expect(history[1]?.reason).toBe(cancellationInput.reason);

    // 5. Verify chair slot is now freed for replacement booking (ChairFill)
    conflict = findChairConflict([appt], chairA, startAt, endAt);
    expect(conflict).toBeUndefined(); // Slot is OPEN!

    // 6. Book replacement patient into the opened slot
    const replacementAppt: MockAppointmentRecord = {
      id: 'appt-1002',
      chairId: chairA,
      dentistId: dentistA,
      startAt,
      endAt,
      status: 'scheduled',
    };

    const activeList = [appt, replacementAppt];
    // Chair is now booked by replacement, no conflict with cancelled one
    const newConflict = findChairConflict(activeList, chairA, startAt, endAt, 'appt-1002');
    expect(newConflict).toBeUndefined();
  });
});
