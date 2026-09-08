import { describe, it, expect } from 'vitest';
import { evaluateAttribution } from '../features/revenue/domain/attribution';

describe('Revenue Attribution Logic (Section 16)', () => {
  const patientId = 'patient-123';
  const oppCreatedAt = new Date('2026-03-01T10:00:00Z');

  it('rejects attribution when patient ID does not match', () => {
    const result = evaluateAttribution({
      opportunityId: 'opp-1',
      opportunityType: 'unaccepted_treatment',
      opportunityCreatedAt: oppCreatedAt,
      patientId: patientId,
      treatmentPlanId: 'plan-1',
      event: {
        type: 'treatment_accepted',
        patientId: 'different-patient-456',
        treatmentPlanId: 'plan-1',
        sourceEntityType: 'procedure',
        sourceEntityId: 'proc-1',
        amount: 500,
        occurredAt: new Date('2026-03-02T10:00:00Z'),
      },
    });

    expect(result.isAttributable).toBe(false);
    expect(result.reason).toContain('Patient mismatch');
  });

  it('rejects attribution when event occurred prior to opportunity detection (causality check)', () => {
    const result = evaluateAttribution({
      opportunityId: 'opp-1',
      opportunityType: 'unaccepted_treatment',
      opportunityCreatedAt: oppCreatedAt,
      patientId: patientId,
      treatmentPlanId: 'plan-1',
      event: {
        type: 'treatment_accepted',
        patientId: patientId,
        treatmentPlanId: 'plan-1',
        sourceEntityType: 'procedure',
        sourceEntityId: 'proc-1',
        amount: 500,
        occurredAt: new Date('2026-02-15T10:00:00Z'), // prior to March 1
      },
    });

    expect(result.isAttributable).toBe(false);
    expect(result.reason).toContain('Causality violation');
  });

  it('rejects outstanding balance attribution if event is not payment', () => {
    const result = evaluateAttribution({
      opportunityId: 'opp-2',
      opportunityType: 'outstanding_balance',
      opportunityCreatedAt: oppCreatedAt,
      patientId: patientId,
      invoiceId: 'inv-1',
      event: {
        type: 'appointment_booked',
        patientId: patientId,
        sourceEntityType: 'appointment',
        sourceEntityId: 'appt-1',
        amount: 200,
        occurredAt: new Date('2026-03-02T10:00:00Z'),
      },
    });

    expect(result.isAttributable).toBe(false);
    expect(result.reason).toContain('Outstanding balance opportunity requires a payment event');
  });

  it('accepts causal attribution for matching payment on outstanding balance', () => {
    const result = evaluateAttribution({
      opportunityId: 'opp-2',
      opportunityType: 'outstanding_balance',
      opportunityCreatedAt: oppCreatedAt,
      patientId: patientId,
      invoiceId: 'inv-1',
      event: {
        type: 'invoice_paid',
        patientId: patientId,
        invoiceId: 'inv-1',
        sourceEntityType: 'payment',
        sourceEntityId: 'pay-1',
        amount: 350,
        occurredAt: new Date('2026-03-02T10:00:00Z'),
      },
    });

    expect(result.isAttributable).toBe(true);
    expect(result.attributionAmount).toBe(350);
  });

  it('accepts causal attribution for accepted treatment plan', () => {
    const result = evaluateAttribution({
      opportunityId: 'opp-3',
      opportunityType: 'unaccepted_treatment',
      opportunityCreatedAt: oppCreatedAt,
      patientId: patientId,
      treatmentPlanId: 'plan-1',
      event: {
        type: 'treatment_accepted',
        patientId: patientId,
        treatmentPlanId: 'plan-1',
        sourceEntityType: 'procedure',
        sourceEntityId: 'proc-1',
        amount: 1200,
        occurredAt: new Date('2026-03-02T10:00:00Z'),
      },
    });

    expect(result.isAttributable).toBe(true);
    expect(result.attributionAmount).toBe(1200);
  });

  it('accepts causal attribution when appointment booked for overdue recall', () => {
    const result = evaluateAttribution({
      opportunityId: 'opp-4',
      opportunityType: 'overdue_recall',
      opportunityCreatedAt: oppCreatedAt,
      patientId: patientId,
      event: {
        type: 'appointment_booked',
        patientId: patientId,
        sourceEntityType: 'appointment',
        sourceEntityId: 'appt-99',
        amount: 180,
        occurredAt: new Date('2026-03-02T10:00:00Z'),
      },
    });

    expect(result.isAttributable).toBe(true);
    expect(result.attributionAmount).toBe(180);
  });
});
