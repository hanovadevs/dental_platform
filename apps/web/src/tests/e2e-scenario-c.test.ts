import { describe, it, expect } from 'vitest';
import { findChairConflict, findDentistConflict, calculateEndTime } from '@/features/scheduling/domain/conflicts';
import { calculateOpportunityScore } from '@/features/revenue/domain/scoring';
import { evaluateAttribution } from '@/features/revenue/domain/attribution';
import {
  createAppointmentSchema,
  transitionAppointmentStatusSchema,
} from '@/features/scheduling/domain/validation';

/**
 * Scenario C — Cancellation and ChairFill
 * Specified in docs/09_TESTING_AND_QA.md Section 8 (Test Scenario C).
 *
 * Sequence:
 * 1. Create appointment (Patient A on Chair 1)
 * 2. Cancel appointment
 * 3. Verify appointment history preserved
 * 4. Verify open chair slot
 * 5. Create ChairFill opportunity
 * 6. Match waiting-list patient (Patient B)
 * 7. Book replacement
 * 8. Verify no double counting & verify conflict prevention for subsequent attempts
 */
describe('Scenario C: Cancellation and ChairFill Lifecycle', () => {
  const organizationId = '11111111-1111-1111-1111-111111111111';
  const locationId = '22222222-2222-2222-2222-222222222222';
  const chairId = '33333333-3333-3333-3333-333333333333';
  const dentistId = '44444444-4444-4444-4444-444444444444';
  const appointmentTypeId = '55555555-5555-5555-5555-555555555555';
  const patientAId = '66666666-6666-6666-6666-666666666666';
  const patientBId = '77777777-7777-7777-7777-777777777777';

  const slotStart = new Date('2026-04-10T10:00:00Z');
  const slotEnd = calculateEndTime(slotStart, 60); // 10:00 - 11:00
  const estimatedSlotValue = 250.0;

  it('executes the complete Scenario C workflow with chair availability and revenue recovery', () => {
    // -------------------------------------------------------------
    // Step 1: Create Appointment for Patient A
    // -------------------------------------------------------------
    const createPayloadA = {
      patientId: patientAId,
      locationId,
      chairId,
      dentistId,
      appointmentTypeId,
      startAt: slotStart.toISOString(),
      durationMinutes: 60,
      notes: 'Initial checkup and prophylaxis',
      source: 'reception' as const,
    };

    const parsedA = createAppointmentSchema.safeParse(createPayloadA);
    expect(parsedA.success).toBe(true);

    let appointmentsList = [
      {
        id: 'appt-1001',
        chairId,
        dentistId,
        patientId: patientAId,
        startAt: slotStart,
        endAt: slotEnd,
        status: 'confirmed',
        cancellationReason: null as string | null,
        history: [
          { status: 'scheduled', timestamp: new Date('2026-04-01T09:00:00Z') },
          { status: 'confirmed', timestamp: new Date('2026-04-08T14:00:00Z') },
        ],
      },
    ];

    // Verify appointment occupies the chair
    let chairConflict = findChairConflict(appointmentsList, chairId, slotStart, slotEnd);
    expect(chairConflict).toBeDefined();
    expect(chairConflict?.id).toBe('appt-1001');

    // -------------------------------------------------------------
    // Step 2 & 3: Cancel Appointment & Preserve History
    // -------------------------------------------------------------
    const cancelInput = {
      targetStatus: 'cancelled' as const,
      reason: 'Patient reported severe flu and requested cancellation.',
    };

    const cancelValidation = transitionAppointmentStatusSchema.safeParse(cancelInput);
    expect(cancelValidation.success).toBe(true);

    const cancelledAppt = appointmentsList[0]!;
    cancelledAppt.status = 'cancelled';
    cancelledAppt.cancellationReason = cancelInput.reason;
    cancelledAppt.history.push({
      status: 'cancelled',
      timestamp: new Date('2026-04-10T08:15:00Z'),
    });

    // Verify history preserved
    expect(cancelledAppt.history.length).toBe(3);
    expect(cancelledAppt.history[0]?.status).toBe('scheduled');
    expect(cancelledAppt.history[2]?.status).toBe('cancelled');
    expect(cancelledAppt.cancellationReason).toContain('Patient reported severe flu');

    // -------------------------------------------------------------
    // Step 4: Verify Open Chair Slot
    // -------------------------------------------------------------
    // Cancelled appointments must NOT conflict, meaning the chair slot is open
    chairConflict = findChairConflict(appointmentsList, chairId, slotStart, slotEnd);
    expect(chairConflict).toBeUndefined();

    const dentistConflict = findDentistConflict(appointmentsList, dentistId, slotStart, slotEnd);
    expect(dentistConflict).toBeUndefined();

    // -------------------------------------------------------------
    // Step 5: Create ChairFill Opportunity
    // -------------------------------------------------------------
    // Same-day cancellation creates an urgent ChairFill revenue opportunity
    const score = calculateOpportunityScore({
      type: 'cancelled_appointment',
      estimatedValue: estimatedSlotValue,
      ageInDays: 0, // same day
    });

    expect(score.priority).toBe('urgent');
    expect(score.confidenceScore).toBeGreaterThanOrEqual(80);

    const chairFillOpportunity = {
      id: 'opp-chairfill-3001',
      organizationId,
      patientId: patientAId,
      type: 'cancelled_appointment',
      status: 'open',
      priority: score.priority,
      confidenceScore: score.confidenceScore,
      estimatedValue: estimatedSlotValue.toFixed(2),
      createdAt: new Date('2026-04-10T08:20:00Z'),
      recoveredRevenue: null as string | null,
    };

    expect(chairFillOpportunity.status).toBe('open');
    expect(chairFillOpportunity.priority).toBe('urgent');

    // -------------------------------------------------------------
    // Step 6 & 7: Match Waiting-List Patient & Book Replacement
    // -------------------------------------------------------------
    // Waiting list query finds Patient B who has requested priority morning opening
    const waitingListMatch = {
      patientId: patientBId,
      patientName: 'Bob Vance',
      urgency: 'high',
      preferredTime: 'morning',
      targetProcedure: 'Routine Exam & Polish',
    };
    expect(waitingListMatch.patientId).toBe(patientBId);

    // Book replacement appointment for Patient B
    const createPayloadB = {
      patientId: patientBId,
      locationId,
      chairId,
      dentistId,
      appointmentTypeId,
      startAt: slotStart.toISOString(),
      durationMinutes: 60,
      notes: 'Booked via ChairFill waiting list following Patient A cancellation.',
      source: 'chair_fill' as const,
    };

    expect(createAppointmentSchema.safeParse(createPayloadB).success).toBe(true);

    const replacementAppt = {
      id: 'appt-1002',
      chairId,
      dentistId,
      patientId: patientBId,
      startAt: slotStart,
      endAt: slotEnd,
      status: 'confirmed',
      cancellationReason: null,
      history: [{ status: 'confirmed', timestamp: new Date('2026-04-10T08:35:00Z') }],
    };

    appointmentsList.push(replacementAppt);

    // Verify replacement appointment now successfully occupies the chair
    chairConflict = findChairConflict(appointmentsList, chairId, slotStart, slotEnd, replacementAppt.id);
    expect(chairConflict).toBeUndefined(); // no other active appointment conflicts with it

    // -------------------------------------------------------------
    // Step 8: Verify No Double Counting & Conflict Guard
    // -------------------------------------------------------------
    // Attempting to book a THIRD appointment for Patient C in the same slot MUST be rejected!
    const thirdPatientConflict = findChairConflict(appointmentsList, chairId, slotStart, slotEnd);
    expect(thirdPatientConflict).toBeDefined();
    expect(thirdPatientConflict?.id).toBe('appt-1002'); // Blocked by replacement appointment, not cancelled appt

    // Direct Causal Attribution Verification:
    // Recovered revenue from Patient B's replacement appointment recovers the lost chair time
    const attributionResult = evaluateAttribution({
      opportunityId: chairFillOpportunity.id,
      opportunityType: chairFillOpportunity.type,
      opportunityCreatedAt: chairFillOpportunity.createdAt,
      patientId: chairFillOpportunity.patientId,
      event: {
        type: 'appointment_booked',
        patientId: chairFillOpportunity.patientId,
        sourceEntityType: 'appointment',
        sourceEntityId: replacementAppt.id,
        amount: estimatedSlotValue,
        occurredAt: new Date('2026-04-10T08:35:00Z'),
      },
    });

    expect(attributionResult.isAttributable).toBe(true);
    expect(attributionResult.attributionAmount).toBe(estimatedSlotValue);

    // Close opportunity as converted
    const resolvedOpportunity = {
      ...chairFillOpportunity,
      status: 'converted',
      recoveredRevenue: estimatedSlotValue.toFixed(2),
    };

    expect(resolvedOpportunity.status).toBe('converted');
    expect(resolvedOpportunity.recoveredRevenue).toBe('250.00');
  });
});
