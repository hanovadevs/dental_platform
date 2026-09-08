import { describe, it, expect } from 'vitest';
import { calculatePlanRollups, derivePlanStatus } from '@/features/treatments/domain/rollups';
import {
  createTreatmentDefinitionSchema,
  createTreatmentPlanSchema,
  updatePlanItemStatusSchema,
  completeTreatmentItemSchema,
} from '@/features/treatments/domain/validation';

describe('Treatments Domain: Rollups & Valuation', () => {
  it('calculates financial rollups correctly for proposed, accepted, completed, and pending items', () => {
    const items = [
      { price: '100.00', discount: '0.00', status: 'proposed' },
      { price: '250.00', discount: '50.00', status: 'proposed' }, // Net 200
      { price: '500.00', discount: '0.00', status: 'accepted' },
      { price: '300.00', discount: '20.00', status: 'completed' }, // Net 280
      { price: '400.00', discount: '0.00', status: 'declined' },
      { price: '150.00', discount: '0.00', status: 'cancelled' }, // Cancelled excluded
    ];

    const rollups = calculatePlanRollups(items);

    // Total Proposed: 100 + 200 + 500 + 280 + 400 = 1480
    expect(rollups.totalProposed).toBe(1480);

    // Total Pending (proposed only): 100 + 200 = 300
    expect(rollups.totalPending).toBe(300);

    // Total Accepted (accepted + completed): 500 + 280 = 780
    expect(rollups.totalAccepted).toBe(780);

    // Total Completed: 280
    expect(rollups.totalCompleted).toBe(280);

    // Total Declined: 400
    expect(rollups.totalDeclined).toBe(400);

    // Acceptance rate: 780 / 1480 = 52.7% -> 53%
    expect(rollups.acceptanceRate).toBe(53);

    // Item counts
    expect(rollups.itemCount).toBe(5); // 5 non-cancelled
    expect(rollups.pendingCount).toBe(2);
    expect(rollups.acceptedCount).toBe(2);
    expect(rollups.completedCount).toBe(1);
  });

  it('handles empty plans and 100% acceptance correctly', () => {
    const emptyRollups = calculatePlanRollups([]);
    expect(emptyRollups.totalProposed).toBe(0);
    expect(emptyRollups.acceptanceRate).toBe(0);

    const allAccepted = [
      { price: 100, discount: 0, status: 'accepted' },
      { price: 200, discount: 0, status: 'completed' },
    ];
    const fullRollups = calculatePlanRollups(allAccepted);
    expect(fullRollups.totalProposed).toBe(300);
    expect(fullRollups.totalAccepted).toBe(300);
    expect(fullRollups.acceptanceRate).toBe(100);
  });

  it('correctly derives overall plan status based on item states', () => {
    // All items completed
    expect(
      derivePlanStatus('draft', [
        { status: 'completed' },
        { status: 'completed' },
      ])
    ).toBe('completed');

    // Any in progress or scheduled
    expect(
      derivePlanStatus('accepted', [
        { status: 'completed' },
        { status: 'scheduled' },
      ])
    ).toBe('in_progress');

    // All accepted or completed
    expect(
      derivePlanStatus('presented', [
        { status: 'accepted' },
        { status: 'completed' },
      ])
    ).toBe('accepted');

    // Partially accepted (some accepted, some proposed/declined)
    expect(
      derivePlanStatus('presented', [
        { status: 'accepted' },
        { status: 'proposed' },
      ])
    ).toBe('partially_accepted');

    // All declined
    expect(
      derivePlanStatus('presented', [
        { status: 'declined' },
        { status: 'declined' },
      ])
    ).toBe('declined');

    // Preserves abandoned status
    expect(
      derivePlanStatus('abandoned', [
        { status: 'accepted' },
      ])
    ).toBe('abandoned');
  });
});

describe('Treatments Domain: Validation Schemas', () => {
  it('validates treatment definition schema', () => {
    const valid = {
      code: 'FILL-1S',
      name: 'Composite 1 Surface',
      category: 'restorative',
      defaultDurationMinutes: 45,
      defaultPrice: 150.0,
      currency: 'USD',
      toothSpecific: true,
      surfaceSpecific: true,
    };
    expect(createTreatmentDefinitionSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      code: 'X', // too short
      category: 'invalid-cat',
      defaultPrice: -50, // negative price
    };
    expect(createTreatmentDefinitionSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates treatment plan creation schema', () => {
    const validPlan = {
      patientId: '11111111-1111-1111-1111-111111111111',
      locationId: '22222222-2222-2222-2222-222222222222',
      dentistId: '33333333-3333-3333-3333-333333333333',
      title: 'Full Restoration',
      items: [
        {
          treatmentDefinitionId: '44444444-4444-4444-4444-444444444444',
          toothCode: '16',
          surface: 'MOD',
          priority: 'high',
          price: 240,
          discount: 20,
        },
      ],
    };
    expect(createTreatmentPlanSchema.safeParse(validPlan).success).toBe(true);

    const emptyItemsPlan = {
      ...validPlan,
      items: [], // At least one item required
    };
    expect(createTreatmentPlanSchema.safeParse(emptyItemsPlan).success).toBe(false);
  });

  it('validates plan item status transition', () => {
    const valid = {
      itemId: '55555555-5555-5555-5555-555555555555',
      status: 'accepted',
      notes: 'Patient confirmed verbally',
    };
    expect(updatePlanItemStatusSchema.safeParse(valid).success).toBe(true);
  });

  it('validates complete procedure schema', () => {
    const valid = {
      itemId: '55555555-5555-5555-5555-555555555555',
      dentistId: '33333333-3333-3333-3333-333333333333',
      toothCode: '16',
      surface: 'MOD',
      notes: 'Anesthesia uneventful, restorative margins sealed',
    };
    expect(completeTreatmentItemSchema.safeParse(valid).success).toBe(true);
  });
});
