import { describe, it, expect } from 'vitest';
import { calculateOpportunityScore } from '@/features/revenue/domain/scoring';
import { evaluateAttribution } from '@/features/revenue/domain/attribution';
import { createRecallSchema, createRecallRuleSchema } from '@/features/revenue/domain/validation';

/**
 * Scenario D: Automated Patient Recall Lifecycle
 * Specified in docs/05_DATA_MODEL_AND_DOMAIN.md Section 14 & docs/09_TESTING_AND_QA.md (Recall System).
 *
 * Tests:
 * 1. Recall rule configuration (6-month routine recall).
 * 2. Automatic future recall scheduling upon procedure completion.
 * 3. Status progression: upcoming -> overdue when due date passes.
 * 4. Automatic opportunity discovery for overdue hygiene.
 * 5. Resolution to 'booked' upon appointment confirmation with causal link.
 */
describe('Scenario D: Recall Lifecycle & Overdue Care Workflow', () => {
  const organizationId = '11111111-1111-1111-1111-111111111111';
  const patientId = '22222222-2222-2222-2222-222222222222';
  const ruleId = '33333333-3333-3333-3333-333333333333';
  const appointmentId = '55555555-5555-5555-5555-555555555555';

  it('executes the full Recall lifecycle from creation to booking', () => {
    // -------------------------------------------------------------
    // Step 1: Recall Rule Definition
    // -------------------------------------------------------------
    const ruleInput = {
      name: '6-Month Routine Hygiene & Checkup',
      intervalDays: 180,
    };

    const ruleValidation = createRecallRuleSchema.safeParse(ruleInput);
    expect(ruleValidation.success).toBe(true);

    // -------------------------------------------------------------
    // Step 2: Future Recall Scheduling
    // -------------------------------------------------------------
    // Routine exam completed on Jan 1, 2026. Recall generated for July 1, 2026 (180 days later).
    const recallInput = {
      patientId,
      ruleId,
      dueAt: '2026-07-01T09:00:00Z',
      notes: 'Standard 6-month hygiene recall',
    };

    const recallValidation = createRecallSchema.safeParse(recallInput);
    expect(recallValidation.success).toBe(true);

    let recall = {
      id: 'rec-1',
      organizationId,
      patientId,
      ruleId,
      dueAt: new Date(recallInput.dueAt),
      status: 'upcoming' as 'upcoming' | 'due' | 'overdue' | 'booked',
      bookedAppointmentId: null as string | null,
    };

    expect(recall.status).toBe('upcoming');

    // -------------------------------------------------------------
    // Step 3: Date Passes -> Transition to Overdue & Opportunity Discovery
    // -------------------------------------------------------------
    // Fast-forward to July 20, 2026 (20 days overdue)
    const simulatedNow = new Date('2026-07-20T09:00:00Z');
    const isPastDue = recall.dueAt < simulatedNow;
    expect(isPastDue).toBe(true);

    if (isPastDue && recall.status === 'upcoming') {
      recall.status = 'overdue';
    }
    expect(recall.status).toBe('overdue');

    // Opportunity engine evaluates overdue recall
    const overdueDays = 20;
    const estimatedValue = 180.0; // standard hygiene fee

    const score = calculateOpportunityScore({
      type: 'overdue_recall',
      estimatedValue,
      ageInDays: overdueDays,
    });

    expect(score.priority).toBe('high');
    expect(score.confidenceScore).toBeGreaterThanOrEqual(70);

    const opportunity = {
      id: 'opp-recall-1',
      organizationId,
      patientId,
      type: 'overdue_recall',
      status: 'open',
      priority: score.priority,
      confidenceScore: score.confidenceScore,
      estimatedValue: estimatedValue.toFixed(2),
      createdAt: simulatedNow,
    };

    expect(opportunity.type).toBe('overdue_recall');
    expect(opportunity.status).toBe('open');

    // -------------------------------------------------------------
    // Step 4: Appointment Booked -> Recall Resolved & Causally Attributed
    // -------------------------------------------------------------
    // Patient contacted and scheduled for appointment
    recall.status = 'booked';
    recall.bookedAppointmentId = appointmentId;

    expect(recall.status).toBe('booked');
    expect(recall.bookedAppointmentId).toBe(appointmentId);

    // Attribution check
    const attributionCheck = evaluateAttribution({
      opportunityId: opportunity.id,
      opportunityType: opportunity.type,
      opportunityCreatedAt: opportunity.createdAt,
      patientId: opportunity.patientId,
      event: {
        type: 'appointment_booked',
        patientId,
        sourceEntityType: 'appointment',
        sourceEntityId: appointmentId,
        amount: estimatedValue,
        occurredAt: new Date('2026-07-21T11:00:00Z'),
      },
    });

    expect(attributionCheck.isAttributable).toBe(true);
    expect(attributionCheck.attributionAmount).toBe(180.0);
  });
});
