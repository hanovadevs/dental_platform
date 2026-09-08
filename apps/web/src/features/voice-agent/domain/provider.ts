/**
 * Voice Agent Provider Interface and Mock Implementation
 * Per spec (04_SYSTEM_ARCHITECTURE.md Section 11 & 02_PHASES_AND_ROADMAP.md Phase 10).
 */

import {
  NormalizedVoiceCallInput,
  VoiceCallJob,
  VoiceCallReturnPayload,
} from './types';

export interface VoiceAgentProvider {
  enqueueCall(taskId: string, input: NormalizedVoiceCallInput): Promise<VoiceCallJob>;
  getCallStatus(jobId: string): Promise<VoiceCallJob | undefined>;
  simulateCallExecution(
    jobId: string,
    scenario?: 'booked' | 'voicemail' | 'escalate' | 'declined'
  ): Promise<VoiceCallJob>;
}

export class MockVoiceAgentProvider implements VoiceAgentProvider {
  private jobs = new Map<string, { job: VoiceCallJob; input: NormalizedVoiceCallInput }>();

  async enqueueCall(taskId: string, input: NormalizedVoiceCallInput): Promise<VoiceCallJob> {
    const jobId = `job_voice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const job: VoiceCallJob = {
      jobId,
      taskId,
      status: 'queued',
      queuedAt: new Date(),
    };

    this.jobs.set(jobId, { job, input });
    return job;
  }

  async getCallStatus(jobId: string): Promise<VoiceCallJob | undefined> {
    const record = this.jobs.get(jobId);
    return record?.job;
  }

  async simulateCallExecution(
    jobId: string,
    scenario: 'booked' | 'voicemail' | 'escalate' | 'declined' = 'booked'
  ): Promise<VoiceCallJob> {
    const record = this.jobs.get(jobId);
    if (!record) {
      throw new Error(`Voice call job not found: ${jobId}`);
    }

    const { input } = record;
    const patientName = input.approvedContext.patientName || 'Patient';
    const clinicName = input.approvedContext.clinicName || 'Dental Studio';
    const selectedSlot = input.approvedContext.appointmentOptions[0] || {
      date: '2026-09-15',
      time: '10:00 AM',
    };

    let result: VoiceCallReturnPayload;

    if (scenario === 'booked') {
      result = {
        outcome: 'booked',
        bookedSlot: selectedSlot,
        needs_human_followup: false,
        summary: `Patient agreed to scheduled time on ${selectedSlot.date} at ${selectedSlot.time}. Automated booking generated.`,
        transcript_reference: `trx_${jobId}`,
        transcriptText: [
          `AI: Hello ${patientName}, this is Sarah from ${clinicName} following up on your treatment recommendation. How are you today?`,
          `Patient: Hi Sarah! I'm doing well, thank you.`,
          `AI: Wonderful! We have an opening for your visit on ${selectedSlot.date} at ${selectedSlot.time}. Would you like us to reserve that chair for you?`,
          `Patient: Yes, that time works perfectly for me. Please book it!`,
          `AI: Excellent! Your appointment is confirmed for ${selectedSlot.date} at ${selectedSlot.time}. We look forward to seeing you. Have a great day!`,
        ].join('\n'),
        call_duration_seconds: 78,
      };
    } else if (scenario === 'escalate') {
      result = {
        outcome: 'escalated_to_human',
        needs_human_followup: true,
        human_followup_reason: 'Patient reported sharp pain and requested immediate dentist consultation.',
        summary: 'Call halted per safety constraints: patient reported acute symptoms. Escalated to clinical triage desk.',
        transcript_reference: `trx_${jobId}`,
        transcriptText: [
          `AI: Hello ${patientName}, this is Sarah from ${clinicName}. I am calling regarding your recent exam with Dr. ${input.approvedContext.doctorName}.`,
          `Patient: Oh, thank goodness. My tooth has been throbbing since yesterday and it hurts to chew. Can the doctor see me right now?`,
          `AI: I understand you are experiencing tooth pain. Per our clinical safety policy, I am immediately notifying our triage team so a team member can contact you right away.`,
          `[Call Transferred / Escalated to Human Receptionist]`,
        ].join('\n'),
        call_duration_seconds: 45,
      };
    } else if (scenario === 'voicemail') {
      result = {
        outcome: 'voicemail',
        needs_human_followup: false,
        summary: `Reached answering machine. Left standard reminder message with clinic callback line ${input.approvedContext.clinicPhone}.`,
        transcript_reference: `trx_${jobId}`,
        transcriptText: [
          `AI: [Beep detected] Hello ${patientName}, this is a courtesy call from ${clinicName}. We have availability for your dental visit. Please call us back at ${input.approvedContext.clinicPhone} when convenient. Thank you!`,
        ].join('\n'),
        call_duration_seconds: 32,
      };
    } else {
      result = {
        outcome: 'declined',
        needs_human_followup: true,
        human_followup_reason: 'Patient cited travel schedule and asked for call back next month.',
        summary: 'Patient declined proposed dates due to travel. Requested snooze/callback in 30 days.',
        transcript_reference: `trx_${jobId}`,
        transcriptText: [
          `AI: Hello ${patientName}, calling from ${clinicName} regarding your routine hygiene checkup. Would you like to schedule?`,
          `Patient: I am traveling for work for the next four weeks, so I cannot book right now. Please call me back next month.`,
          `AI: Noted! We will follow up next month. Safe travels!`,
        ].join('\n'),
        call_duration_seconds: 41,
      };
    }

    record.job.status = result.outcome === 'escalated_to_human' ? 'escalated_to_human' : 'completed';
    record.job.result = result;
    record.job.completedAt = new Date();

    return record.job;
  }
}

// Global singleton instance for app runtime
export const defaultVoiceProvider: VoiceAgentProvider = new MockVoiceAgentProvider();
