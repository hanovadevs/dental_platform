import { describe, it, expect } from 'vitest';
import { evaluateAttribution } from '@/features/revenue/domain/attribution';

describe('Voice Agent Causal Revenue Attribution (Phase 10)', () => {
  const opportunityId = 'opp-voice-101';
  const patientId = 'patient-alice-101';
  const appointmentId = 'appt-booked-202';
  const callTaskId = 'task-voice-303';
  const callCreatedAt = new Date('2026-09-10T10:00:00Z');

  it('attributes recovered revenue to an opportunity when voice agent books the visit', () => {
    const bookedAt = new Date('2026-09-10T10:02:30Z'); // 2.5 minutes later

    const result = evaluateAttribution({
      opportunityId,
      opportunityType: 'unaccepted_treatment',
      opportunityCreatedAt: callCreatedAt,
      patientId,
      event: {
        type: 'appointment_booked',
        patientId,
        sourceEntityType: 'appointment',
        sourceEntityId: appointmentId,
        amount: 380.0,
        occurredAt: bookedAt,
      },
    });

    expect(result.isAttributable).toBe(true);
    expect(result.attributionAmount).toBe(380.0);
    expect(result.reason).toBeDefined();
  });

  it('rejects attribution when patient does not match', () => {
    const result = evaluateAttribution({
      opportunityId,
      opportunityType: 'unaccepted_treatment',
      opportunityCreatedAt: callCreatedAt,
      patientId,
      event: {
        type: 'appointment_booked',
        patientId: 'different-patient-999',
        sourceEntityType: 'appointment',
        sourceEntityId: appointmentId,
        amount: 380.0,
        occurredAt: new Date('2026-09-10T10:05:00Z'),
      },
    });

    expect(result.isAttributable).toBe(false);
    expect(result.reason).toContain('Patient mismatch');
  });

  it('rejects attribution if booking event occurred prior to opportunity creation', () => {
    const priorEvent = new Date('2026-09-01T08:00:00Z'); // 9 days prior

    const result = evaluateAttribution({
      opportunityId,
      opportunityType: 'unaccepted_treatment',
      opportunityCreatedAt: callCreatedAt,
      patientId,
      event: {
        type: 'appointment_booked',
        patientId,
        sourceEntityType: 'appointment',
        sourceEntityId: appointmentId,
        amount: 380.0,
        occurredAt: priorEvent,
      },
    });

    expect(result.isAttributable).toBe(false);
    expect(result.reason).toContain('Causality violation');
  });
});
