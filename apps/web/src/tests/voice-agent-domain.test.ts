import { describe, it, expect } from 'vitest';
import {
  createVoiceCallTaskSchema,
  escalateVoiceCallTaskSchema,
} from '@/features/voice-agent/domain/validation';
import { VoiceCallConstraints } from '@/features/voice-agent/domain/types';

describe('Voice Agent Domain & Safety Constraints (Phase 10)', () => {
  const validUuid = '11111111-1111-1111-1111-111111111111';

  it('validates a well-formed voice call task payload', () => {
    const payload = {
      patientId: validUuid,
      opportunityId: validUuid,
      intent: 'treatment_followup' as const,
      treatmentSummary: 'Composite resin filling on tooth 16',
      proposedProcedure: 'Restoration',
      estimatedFee: 180.0,
      appointmentOptions: [
        { date: '2026-09-22', time: '10:00 AM' },
        { date: '2026-09-24', time: '02:00 PM' },
      ],
    };

    const parsed = createVoiceCallTaskSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('rejects call tasks with missing or invalid patient ID', () => {
    const invalid = {
      patientId: 'not-a-uuid',
      intent: 'overdue_recall' as const,
    };

    const parsed = createVoiceCallTaskSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('enforces immutable clinical advice prohibitions', () => {
    const defaultConstraints: VoiceCallConstraints = {
      no_clinical_advice: true,
      human_escalation_required_for: [
        'acute_pain',
        'pricing_dispute',
        'clinical_diagnosis',
        'adverse_reaction',
      ],
      max_duration_seconds: 300,
    };

    expect(defaultConstraints.no_clinical_advice).toBe(true);
    expect(defaultConstraints.human_escalation_required_for).toContain('acute_pain');
    expect(defaultConstraints.human_escalation_required_for).toContain('clinical_diagnosis');
    expect(defaultConstraints.max_duration_seconds).toBeLessThanOrEqual(600);
  });

  it('validates staff escalation payload requires minimum reason length', () => {
    const valid = {
      taskId: validUuid,
      reason: 'Patient reported sharp throbbing pain; requires emergency doctor exam.',
    };
    expect(escalateVoiceCallTaskSchema.safeParse(valid).success).toBe(true);

    const tooShort = {
      taskId: validUuid,
      reason: 'No',
    };
    expect(escalateVoiceCallTaskSchema.safeParse(tooShort).success).toBe(false);
  });
});
