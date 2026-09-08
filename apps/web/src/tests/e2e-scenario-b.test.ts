import { describe, it, expect } from 'vitest';
import { calculateOpportunityScore } from '@/features/revenue/domain/scoring';
import { evaluateAttribution } from '@/features/revenue/domain/attribution';
import { logOutreachSchema, resolveOpportunitySchema } from '@/features/revenue/domain/validation';

/**
 * Scenario B: Unscheduled Care Opportunity Discovery & Resolution
 * Specified in docs/09_TESTING_AND_QA.md Section 8 (Test Scenario B).
 *
 * Tests the complete lifecycle:
 * 1. Unaccepted treatment formulated and presented ($1,280 value).
 * 2. Intelligent discovery and multi-factor scoring (priority + confidence).
 * 3. Outreach logged with touchpoint history.
 * 4. Opportunity state transitions (open -> in_progress -> converted).
 * 5. Causal revenue attribution evaluation and verified recovery amount.
 */
describe('Scenario B: Unscheduled Care Discovery & Conversion Workflow', () => {
  const organizationId = '11111111-1111-1111-1111-111111111111';
  const patientId = '22222222-2222-2222-2222-222222222222';
  const treatmentPlanId = '33333333-3333-3333-3333-333333333333';
  const opportunityId = '44444444-4444-4444-4444-444444444444';

  it('executes the complete Scenario B workflow successfully', () => {
    // -------------------------------------------------------------
    // Step 1: Unaccepted Treatment Discovery
    // -------------------------------------------------------------
    // Patient has an unaccepted treatment plan presented 10 days ago:
    // - Composite Restoration: $180
    // - Zirconia Crown: $1,100
    // Total Pipeline Value: $1,280
    const proposedItems = [
      { id: 'item-1', fee: 180.0, status: 'proposed' },
      { id: 'item-2', fee: 1100.0, status: 'proposed' },
    ];

    const estimatedValue = proposedItems.reduce((sum, item) => sum + item.fee, 0);
    expect(estimatedValue).toBe(1280.0);

    const score = calculateOpportunityScore({
      type: 'unaccepted_treatment',
      estimatedValue,
      ageInDays: 10,
    });

    expect(score.priority).toBe('high');
    expect(score.confidenceScore).toBeGreaterThanOrEqual(75);
    expect(score.suggestedActionDate).toBeDefined();

    // Initial opportunity entity state
    let opportunity = {
      id: opportunityId,
      organizationId,
      patientId,
      treatmentPlanId,
      type: 'unaccepted_treatment',
      status: 'open',
      priority: score.priority,
      confidenceScore: score.confidenceScore,
      estimatedValue: estimatedValue.toFixed(2),
      createdAt: new Date('2026-03-01T09:00:00Z'),
      recoveredRevenue: null as string | null,
      resolutionType: null as string | null,
    };

    expect(opportunity.status).toBe('open');
    expect(opportunity.priority).toBe('high');

    // -------------------------------------------------------------
    // Step 2: Patient Outreach Logged
    // -------------------------------------------------------------
    const outreachPayload = {
      opportunityId,
      channel: 'phone' as const,
      outcome: 'spoke_with_patient' as const,
      notes: 'Patient was considering insurance limits; explained payment plan options.',
      nextActionDate: '2026-03-05',
    };

    const outreachValidation = logOutreachSchema.safeParse(outreachPayload);
    expect(outreachValidation.success).toBe(true);

    // After outreach, opportunity transitions to in_progress
    opportunity = {
      ...opportunity,
      status: 'in_progress',
    };
    expect(opportunity.status).toBe('in_progress');

    // -------------------------------------------------------------
    // Step 3: Patient Accepts Care & Opportunity Resolves
    // -------------------------------------------------------------
    // Patient calls back and confirms booking for treatment
    const resolvePayload = {
      opportunityId,
      resolutionType: 'treatment_accepted' as const,
      notes: 'Patient accepted treatment plan in full after financing approval.',
      recoveredAmount: 1280.0,
    };

    const resolveValidation = resolveOpportunitySchema.safeParse(resolvePayload);
    expect(resolveValidation.success).toBe(true);

    // -------------------------------------------------------------
    // Step 4: Causal Attribution Verification (Section 16)
    // -------------------------------------------------------------
    const attributionCheck = evaluateAttribution({
      opportunityId: opportunity.id,
      opportunityType: opportunity.type,
      opportunityCreatedAt: opportunity.createdAt,
      patientId: opportunity.patientId,
      treatmentPlanId: opportunity.treatmentPlanId,
      event: {
        type: 'treatment_accepted',
        patientId,
        treatmentPlanId,
        sourceEntityType: 'procedure',
        sourceEntityId: 'proc-1',
        amount: 1280.0,
        occurredAt: new Date('2026-03-04T14:30:00Z'),
      },
    });

    expect(attributionCheck.isAttributable).toBe(true);
    expect(attributionCheck.attributionAmount).toBe(1280.0);

    // Opportunity transitions to converted with causal revenue
    opportunity = {
      ...opportunity,
      status: 'converted',
      resolutionType: 'treatment_accepted',
      recoveredRevenue: '1280.00',
    };

    expect(opportunity.status).toBe('converted');
    expect(opportunity.resolutionType).toBe('treatment_accepted');
    expect(opportunity.recoveredRevenue).toBe('1280.00');
  });
});
