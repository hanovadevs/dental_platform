import { OpportunityPriority, OpportunityType } from './types';

export interface ScoreInput {
  type: OpportunityType;
  estimatedValue: number;
  ageInDays: number;
  outreachCount?: number;
  lastContactDaysAgo?: number;
}

export interface ScoreResult {
  priority: OpportunityPriority;
  confidenceScore: number;
  suggestedActionDate: Date;
}

/**
 * Calculates deterministic priority and confidence score for a revenue opportunity.
 * Per spec: Intelligent work queue prioritized by value, age, and likelihood of conversion.
 */
export function calculateOpportunityScore(input: ScoreInput): ScoreResult {
  const { type, estimatedValue, ageInDays, outreachCount = 0, lastContactDaysAgo } = input;

  // 1. Calculate Confidence Score (Base 75)
  let confidence = 75;

  // Freshness bonus or age penalty
  if (ageInDays <= 3) {
    confidence += 15;
  } else if (ageInDays <= 14) {
    confidence += 5;
  } else if (ageInDays > 60) {
    confidence -= 25;
  } else if (ageInDays > 30) {
    confidence -= 15;
  }

  // Value-based confidence calibration
  if (estimatedValue > 2000) {
    confidence += 5;
  } else if (estimatedValue <= 0) {
    confidence -= 20;
  }

  // Outreach responsiveness calibration
  if (outreachCount >= 4 && (!lastContactDaysAgo || lastContactDaysAgo > 14)) {
    // Repeated outreach without conversion reduces conversion likelihood
    confidence -= 20;
  } else if (outreachCount === 1 && lastContactDaysAgo !== undefined && lastContactDaysAgo <= 2) {
    confidence += 5;
  }

  // Clamp confidence between 15 and 98
  confidence = Math.min(98, Math.max(15, Math.round(confidence)));

  // 2. Determine Priority
  let priority: OpportunityPriority = 'normal';

  const isHighValue = estimatedValue >= 600;
  const isVeryHighValue = estimatedValue >= 1500;
  const isImmediate = type === 'cancelled_appointment' || type === 'no_show';

  if (isVeryHighValue && ageInDays <= 14) {
    priority = 'urgent';
  } else if (isImmediate && ageInDays <= 7) {
    priority = 'urgent';
  } else if (isHighValue || (type === 'unaccepted_treatment' && ageInDays <= 30)) {
    priority = 'high';
  } else if (type === 'overdue_recall' && ageInDays <= 30) {
    priority = 'high';
  } else if (ageInDays > 90 || (estimatedValue < 100 && outreachCount >= 2)) {
    priority = 'low';
  } else {
    priority = 'normal';
  }

  // 3. Suggested Next Action Date
  const actionDate = new Date();
  if (priority === 'urgent') {
    // Action today
  } else if (priority === 'high') {
    actionDate.setDate(actionDate.getDate() + 1);
  } else if (priority === 'normal') {
    actionDate.setDate(actionDate.getDate() + 3);
  } else {
    actionDate.setDate(actionDate.getDate() + 7);
  }

  return {
    priority,
    confidenceScore: confidence,
    suggestedActionDate: actionDate,
  };
}
