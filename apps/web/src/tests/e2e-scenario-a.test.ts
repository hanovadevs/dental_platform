import { describe, it, expect } from 'vitest';
import { calculatePlanRollups, derivePlanStatus } from '@/features/treatments/domain/rollups';
import { calculateInvoiceTotals, applyPaymentToInvoice } from '@/features/billing/domain/calculations';
import { createTreatmentPlanSchema, completeTreatmentItemSchema } from '@/features/treatments/domain/validation';
import { createInvoiceSchema, recordPaymentSchema } from '@/features/billing/domain/validation';

/**
 * Scenario A: End-to-End Test from New Patient to Completed Treatment & Invoice
 * Specified in docs/09_TESTING_AND_QA.md Section 8 (Test Scenario A).
 *
 * This test exercises the business logic, valuation, status transitions,
 * procedure completions, invoicing, and partial payments across the patient journey.
 */
describe('Scenario A: Full Patient Journey from Consultation to Payment', () => {
  const organizationId = '11111111-1111-1111-1111-111111111111';
  const locationId = '22222222-2222-2222-2222-222222222222';
  const patientId = '33333333-3333-3333-3333-333333333333';
  const dentistId = '44444444-4444-4444-4444-444444444444';
  const defFill1s = '55555555-5555-5555-5555-555555555555';
  const defCrwnZir = '66666666-6666-6666-6666-666666666666';
  const planItemFill16 = '77777777-7777-7777-7777-777777777777';
  const procFill16 = '88888888-8888-8888-8888-888888888888';
  const inv1001 = '99999999-9999-9999-9999-999999999999';

  it('executes the complete Scenario A workflow successfully', () => {
    // 1. Patient Consultation: Treatment plan formulated with 2 procedures:
    // - Item 1: Tooth 16 Composite Resin ($180)
    // - Item 2: Tooth 46 Zirconia Crown ($1150)
    const planInput = {
      patientId,
      locationId,
      dentistId,
      title: 'Initial Comprehensive Treatment Plan',
      notes: 'Patient presented with localized pain and deep occlusal caries on tooth 16.',
      items: [
        {
          treatmentDefinitionId: defFill1s,
          toothCode: '16',
          surface: 'MOD',
          sequence: 1,
          priority: 'high' as const,
          price: 180.0,
          discount: 0.0,
        },
        {
          treatmentDefinitionId: defCrwnZir,
          toothCode: '46',
          surface: undefined,
          sequence: 2,
          priority: 'normal' as const,
          price: 1150.0,
          discount: 50.0, // Discounted to $1100
        },
      ],
    };

    const planParse = createTreatmentPlanSchema.safeParse(planInput);
    expect(planParse.success).toBe(true);

    // Initial plan state: draft, all items proposed
    const initialItems = [
      { price: 180.0, discount: 0.0, status: 'proposed' },
      { price: 1150.0, discount: 50.0, status: 'proposed' },
    ];

    let rollups = calculatePlanRollups(initialItems);
    expect(rollups.totalProposed).toBe(1280.0); // 180 + 1100
    expect(rollups.totalPending).toBe(1280.0);
    expect(rollups.totalAccepted).toBe(0.0);
    expect(rollups.acceptanceRate).toBe(0);
    expect(derivePlanStatus('draft', initialItems)).toBe('draft');

    // 2. Consultation & Presentation: Plan presented to patient
    // Patient accepts Item 1 (Filling on #16), while Item 2 (Crown on #46) remains pending
    const itemStatesAfterPresentation = [
      { price: 180.0, discount: 0.0, status: 'accepted' },
      { price: 1150.0, discount: 50.0, status: 'proposed' },
    ];

    rollups = calculatePlanRollups(itemStatesAfterPresentation);
    expect(rollups.totalProposed).toBe(1280.0);
    expect(rollups.totalAccepted).toBe(180.0);
    expect(rollups.totalPending).toBe(1100.0); // Feeds future revenue recovery pipeline!
    expect(rollups.acceptanceRate).toBe(14); // 180 / 1280 = 14%
    expect(derivePlanStatus('presented', itemStatesAfterPresentation)).toBe('partially_accepted');

    // 3. Clinical Execution: Dentist performs the filling on tooth 16
    const completeProcedureInput = {
      itemId: planItemFill16,
      dentistId,
      toothCode: '16',
      surface: 'MOD',
      notes: 'Caries excavated to sound dentin. Acid etched and bonded with composite resin.',
    };
    expect(completeTreatmentItemSchema.safeParse(completeProcedureInput).success).toBe(true);

    // Item status transitions to 'completed'
    const itemStatesAfterExecution = [
      { price: 180.0, discount: 0.0, status: 'completed' },
      { price: 1150.0, discount: 50.0, status: 'proposed' },
    ];
    rollups = calculatePlanRollups(itemStatesAfterExecution);
    expect(rollups.totalCompleted).toBe(180.0);
    expect(rollups.totalAccepted).toBe(180.0);

    // 4. Invoicing: Front desk generates invoice for completed procedure
    const invoiceInput = {
      patientId,
      locationId,
      items: [
        {
          description: 'Tooth 16: Composite Resin - MOD',
          quantity: 1,
          unitPrice: 180.0,
          discount: 0.0,
          procedureId: procFill16,
          treatmentPlanItemId: planItemFill16,
        },
      ],
      dueAt: '2026-10-15T00:00:00Z',
    };
    expect(createInvoiceSchema.safeParse(invoiceInput).success).toBe(true);

    const invoiceTotals = calculateInvoiceTotals(invoiceInput.items);
    expect(invoiceTotals.subtotal).toBe(180.0);
    expect(invoiceTotals.total).toBe(180.0);
    expect(invoiceTotals.amountDue).toBe(180.0);

    // 5. Payment Collection: Patient makes a partial copay of $100 via Credit Card
    const paymentInput = {
      patientId,
      invoiceId: inv1001,
      amount: 100.0,
      method: 'card' as const,
      reference: 'TXN-994821',
      notes: 'Patient paid $100 by Visa card; balance of $80 to be settled next visit.',
    };
    expect(recordPaymentSchema.safeParse(paymentInput).success).toBe(true);

    // Ledger balance calculation after partial payment
    const paymentResult = applyPaymentToInvoice(
      { total: invoiceTotals.total, amountPaid: 0.0 },
      100.0
    );
    expect(paymentResult.newAmountPaid).toBe(100.0);
    expect(paymentResult.newAmountDue).toBe(80.0);
    expect(paymentResult.status).toBe('partially_paid');

    // 6. Patient Return Visit: Remaining balance of $80 paid in cash
    const finalPayment = applyPaymentToInvoice(
      { total: invoiceTotals.total, amountPaid: paymentResult.newAmountPaid },
      80.0
    );
    expect(finalPayment.newAmountPaid).toBe(180.0);
    expect(finalPayment.newAmountDue).toBe(0.0);
    expect(finalPayment.status).toBe('paid');
  });
});
