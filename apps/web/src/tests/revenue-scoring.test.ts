import { describe, it, expect } from 'vitest';
import { calculateOpportunityScore } from '../features/revenue/domain/scoring';

describe('Revenue Opportunity Scoring Logic', () => {
  it('assigns urgent priority for very high value fresh opportunities', () => {
    const result = calculateOpportunityScore({
      type: 'unaccepted_treatment',
      estimatedValue: 2500,
      ageInDays: 5,
    });

    expect(result.priority).toBe('urgent');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('assigns urgent priority for fresh cancelled appointments', () => {
    const result = calculateOpportunityScore({
      type: 'cancelled_appointment',
      estimatedValue: 200,
      ageInDays: 2,
    });

    expect(result.priority).toBe('urgent');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('assigns high priority for moderate value unaccepted treatments within 30 days', () => {
    const result = calculateOpportunityScore({
      type: 'unaccepted_treatment',
      estimatedValue: 800,
      ageInDays: 20,
    });

    expect(result.priority).toBe('high');
  });

  it('assigns high priority for overdue recalls within 30 days', () => {
    const result = calculateOpportunityScore({
      type: 'overdue_recall',
      estimatedValue: 180,
      ageInDays: 15,
    });

    expect(result.priority).toBe('high');
  });

  it('degrades confidence score significantly for aged opportunities (>60 days)', () => {
    const freshResult = calculateOpportunityScore({
      type: 'unaccepted_treatment',
      estimatedValue: 500,
      ageInDays: 2,
    });

    const oldResult = calculateOpportunityScore({
      type: 'unaccepted_treatment',
      estimatedValue: 500,
      ageInDays: 75,
    });

    expect(oldResult.confidenceScore).toBeLessThan(freshResult.confidenceScore);
  });

  it('assigns low priority for very old opportunities with low value and failed outreach', () => {
    const result = calculateOpportunityScore({
      type: 'unaccepted_treatment',
      estimatedValue: 80,
      ageInDays: 100,
      outreachCount: 3,
    });

    expect(result.priority).toBe('low');
    expect(result.confidenceScore).toBeLessThanOrEqual(60);
  });

  it('schedules urgent actions immediately today, normal within 3 days', () => {
    const urgent = calculateOpportunityScore({
      type: 'cancelled_appointment',
      estimatedValue: 1500,
      ageInDays: 1,
    });

    const normal = calculateOpportunityScore({
      type: 'outstanding_balance',
      estimatedValue: 200,
      ageInDays: 20,
    });

    const now = new Date();
    expect(urgent.suggestedActionDate.getDate()).toBe(now.getDate());
    expect(normal.suggestedActionDate.getTime()).toBeGreaterThan(now.getTime());
  });
});
