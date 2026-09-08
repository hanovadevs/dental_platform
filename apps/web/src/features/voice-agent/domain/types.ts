/**
 * AI Voice Calling Agent Normalized Domain Types
 * Per spec (02_PHASES_AND_ROADMAP.md Phase 10 & 07_REVENUE_ENGINE.md Section 18).
 *
 * The AI agent is a downstream executor of clinic-approved workflows,
 * NOT an unrestricted clinical decision-maker.
 */

export type VoiceCallIntent =
  | 'treatment_followup'
  | 'overdue_recall'
  | 'appointment_confirmation'
  | 'unscheduled_care'
  | 'reactivation'
  | 'custom';

export type VoiceCallStatus =
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'escalated_to_human'
  | 'cancelled';

export type VoiceCallOutcome =
  | 'booked'
  | 'declined'
  | 'voicemail'
  | 'callback_requested'
  | 'escalated_to_human'
  | 'unreachable';

export interface ApprovedContext {
  patientName: string;
  doctorName: string;
  clinicName: string;
  clinicPhone: string;
  treatmentSummary?: string;
  proposedProcedure?: string;
  estimatedFee?: number;
  appointmentOptions: Array<{
    date: string;
    time: string;
    chairId?: string;
    dentistId?: string;
  }>;
}

export interface VoiceCallConstraints {
  no_clinical_advice: true;
  human_escalation_required_for: string[];
  max_duration_seconds: number;
}

export interface NormalizedVoiceCallInput {
  organizationId: string;
  patientId: string;
  patientPhone: string;
  opportunityId?: string;
  intent: VoiceCallIntent;
  approvedContext: ApprovedContext;
  constraints: VoiceCallConstraints;
}

export interface VoiceCallReturnPayload {
  outcome: VoiceCallOutcome;
  appointmentId?: string;
  bookedSlot?: {
    date: string;
    time: string;
    chairId?: string;
    dentistId?: string;
  };
  needs_human_followup: boolean;
  human_followup_reason?: string;
  summary: string;
  transcript_reference: string;
  transcriptText: string;
  call_duration_seconds: number;
}

export interface VoiceCallJob {
  jobId: string;
  taskId: string;
  status: VoiceCallStatus;
  result?: VoiceCallReturnPayload;
  queuedAt: Date;
  completedAt?: Date;
}
