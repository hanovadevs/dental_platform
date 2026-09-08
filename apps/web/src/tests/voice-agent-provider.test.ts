import { describe, it, expect, beforeEach } from 'vitest';
import { MockVoiceAgentProvider } from '@/features/voice-agent/domain/provider';
import { NormalizedVoiceCallInput } from '@/features/voice-agent/domain/types';

describe('Voice Agent Provider Abstraction (Phase 10)', () => {
  let provider: MockVoiceAgentProvider;

  const mockInput: NormalizedVoiceCallInput = {
    organizationId: '11111111-1111-1111-1111-111111111111',
    patientId: '22222222-2222-2222-2222-222222222222',
    patientPhone: '+15551234567',
    intent: 'treatment_followup',
    approvedContext: {
      patientName: 'Arthur Dent',
      doctorName: 'Dr. John Watson',
      clinicName: 'Beacon Dental',
      clinicPhone: '+1 (555) 987-6543',
      treatmentSummary: 'Crown restoration on tooth 46',
      appointmentOptions: [{ date: '2026-09-25', time: '11:00 AM' }],
    },
    constraints: {
      no_clinical_advice: true,
      human_escalation_required_for: ['acute_pain', 'pricing_dispute'],
      max_duration_seconds: 300,
    },
  };

  beforeEach(() => {
    provider = new MockVoiceAgentProvider();
  });

  it('enqueues a call task and returns a queued job', async () => {
    const job = await provider.enqueueCall('task-001', mockInput);
    expect(job.jobId).toBeDefined();
    expect(job.taskId).toBe('task-001');
    expect(job.status).toBe('queued');

    const fetched = await provider.getCallStatus(job.jobId);
    expect(fetched).toBeDefined();
    expect(fetched?.jobId).toBe(job.jobId);
  });

  it('simulates a successful booking scenario', async () => {
    const job = await provider.enqueueCall('task-002', mockInput);
    const completed = await provider.simulateCallExecution(job.jobId, 'booked');

    expect(completed.status).toBe('completed');
    expect(completed.result?.outcome).toBe('booked');
    expect(completed.result?.bookedSlot?.date).toBe('2026-09-25');
    expect(completed.result?.needs_human_followup).toBe(false);
    expect(completed.result?.transcriptText).toContain('confirmed for 2026-09-25');
    expect(completed.result?.call_duration_seconds).toBeGreaterThan(0);
  });

  it('simulates a clinical escalation scenario when patient reports pain', async () => {
    const job = await provider.enqueueCall('task-003', mockInput);
    const completed = await provider.simulateCallExecution(job.jobId, 'escalate');

    expect(completed.status).toBe('escalated_to_human');
    expect(completed.result?.outcome).toBe('escalated_to_human');
    expect(completed.result?.needs_human_followup).toBe(true);
    expect(completed.result?.human_followup_reason).toContain('sharp pain');
    expect(completed.result?.transcriptText).toContain('[Call Transferred / Escalated to Human Receptionist]');
  });

  it('simulates voicemail detection without requiring human escalation', async () => {
    const job = await provider.enqueueCall('task-004', mockInput);
    const completed = await provider.simulateCallExecution(job.jobId, 'voicemail');

    expect(completed.status).toBe('completed');
    expect(completed.result?.outcome).toBe('voicemail');
    expect(completed.result?.needs_human_followup).toBe(false);
    expect(completed.result?.transcriptText).toContain('[Beep detected]');
  });
});
