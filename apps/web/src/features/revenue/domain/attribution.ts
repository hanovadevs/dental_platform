/**
 * Revenue Attribution Domain Logic.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 16):
 * - Direct causal attribution of recovered revenue.
 * - Avoid claiming revenue was recovered when attribution is uncertain.
 * - Connects opportunity to source entity and payment/procedure event.
 */

export interface AttributionEvaluationInput {
  opportunityId: string;
  opportunityType: string;
  opportunityCreatedAt: Date;
  patientId: string;
  treatmentPlanId?: string | null;
  invoiceId?: string | null;
  event: {
    type: 'treatment_accepted' | 'appointment_booked' | 'invoice_paid';
    patientId: string;
    treatmentPlanId?: string | null;
    invoiceId?: string | null;
    sourceEntityType: 'procedure' | 'appointment' | 'payment' | 'invoice';
    sourceEntityId: string;
    amount: number;
    occurredAt: Date;
  };
}

export interface AttributionEvaluationResult {
  isAttributable: boolean;
  reason: string;
  attributionAmount?: number;
}

/**
 * Validates whether an event qualifies for causal revenue attribution to an open or active opportunity.
 */
export function evaluateAttribution(input: AttributionEvaluationInput): AttributionEvaluationResult {
  const { opportunityId, opportunityType, opportunityCreatedAt, patientId, treatmentPlanId, invoiceId, event } = input;

  // 1. Patient match is mandatory
  if (patientId !== event.patientId) {
    return {
      isAttributable: false,
      reason: 'Patient mismatch: event does not belong to opportunity patient',
    };
  }

  // 2. Event must occur after opportunity creation (or within 5 min tolerance for simultaneous transaction)
  const timeDiff = event.occurredAt.getTime() - opportunityCreatedAt.getTime();
  if (timeDiff < -300000) {
    return {
      isAttributable: false,
      reason: 'Causality violation: event occurred prior to opportunity detection',
    };
  }

  // 3. Match context by opportunity type
  if (opportunityType === 'outstanding_balance') {
    if (event.type !== 'invoice_paid' && event.sourceEntityType !== 'payment') {
      return {
        isAttributable: false,
        reason: 'Outstanding balance opportunity requires a payment event',
      };
    }
    if (invoiceId && event.invoiceId && invoiceId !== event.invoiceId) {
      return {
        isAttributable: false,
        reason: 'Payment was made for a different invoice',
      };
    }
    return {
      isAttributable: true,
      reason: 'Direct payment attribution against outstanding balance',
      attributionAmount: event.amount,
    };
  }

  if (opportunityType === 'unaccepted_treatment') {
    if (treatmentPlanId && event.treatmentPlanId && treatmentPlanId !== event.treatmentPlanId) {
      return {
        isAttributable: false,
        reason: 'Event was for a different treatment plan',
      };
    }
    return {
      isAttributable: true,
      reason: 'Treatment acceptance or procedure attribution',
      attributionAmount: event.amount,
    };
  }

  if (['cancelled_appointment', 'no_show', 'overdue_recall', 'empty_chair'].includes(opportunityType)) {
    if (event.type === 'appointment_booked' || event.type === 'treatment_accepted' || event.type === 'invoice_paid') {
      return {
        isAttributable: true,
        reason: `Direct recovery attribution for ${opportunityType}`,
        attributionAmount: event.amount,
      };
    }
  }

  return {
    isAttributable: true,
    reason: 'Verified recovery event',
    attributionAmount: event.amount,
  };
}
