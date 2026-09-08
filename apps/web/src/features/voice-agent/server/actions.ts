'use server';

import { db } from '@dental/db';
import {
  voiceCallTasks,
  patients,
  organizations,
  revenueOpportunities,
  revenueAttributions,
  appointments,
  communicationConsents,
} from '@dental/db';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { formatErrorForClient } from '@/lib/errors';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { revalidatePath } from 'next/cache';
import {
  CreateVoiceCallTaskInput,
  createVoiceCallTaskSchema,
  escalateVoiceCallTaskSchema,
} from '../domain/validation';
import {
  NormalizedVoiceCallInput,
  VoiceCallIntent,
  VoiceCallStatus,
} from '../domain/types';
import { defaultVoiceProvider } from '../domain/provider';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * 1. Create and enqueue an AI Voice Call Task.
 * Per spec (02_PHASES_AND_ROADMAP.md Phase 10 & 07_REVENUE_ENGINE.md Section 18).
 */
export async function createVoiceCallTask(
  organizationId: string,
  rawInput: CreateVoiceCallTaskInput
): Promise<ActionResult<{ taskId: string; jobId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    // 1. Rate limiting check (anti-spam / voice quota)
    const rateCheck = checkRateLimit(organizationId, 'messaging');
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: { message: rateCheck.error || 'Voice call rate limit reached.', code: 'RATE_LIMITED' },
      };
    }

    // 2. Validate input schema
    const parsed = createVoiceCallTaskSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid call task parameters.',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }
    const input = parsed.data;

    // 3. Fetch patient profile and verify existence
    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, input.patientId), eq(patients.organizationId, organizationId)),
      with: {
        primaryDentist: true,
      },
    });

    if (!patient) {
      return { success: false, error: { message: 'Patient not found.', code: 'NOT_FOUND' } };
    }

    // 4. TCPA & Operational Consent Verification
    const phoneConsent = await db.query.communicationConsents.findFirst({
      where: and(
        eq(communicationConsents.patientId, input.patientId),
        eq(communicationConsents.organizationId, organizationId),
        eq(communicationConsents.channel, 'phone')
      ),
    });

    if (phoneConsent && !phoneConsent.consented) {
      return {
        success: false,
        error: {
          message: 'Patient has opted out of telephone communications. AI call blocked per TCPA compliance.',
          code: 'CONSENT_REVOKED',
        },
      };
    }

    // 5. Fetch organization profile for clinic name and contact
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    // 6. Build normalized approved context & immutable safety constraints
    const approvedContext = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: patient.primaryDentist?.displayName || 'Dr. Smith',
      clinicName: org?.name || 'Dental OS Clinic',
      clinicPhone: org?.phone || '+1 (555) 000-DENT',
      treatmentSummary: input.treatmentSummary || 'Routine dental checkup and preventative care',
      proposedProcedure: input.proposedProcedure || 'Hygiene & Examination',
      estimatedFee: input.estimatedFee,
      appointmentOptions: input.appointmentOptions.length > 0
        ? input.appointmentOptions
        : [
            { date: 'Next Tuesday', time: '10:00 AM' },
            { date: 'Next Thursday', time: '02:30 PM' },
          ],
    };

    const constraints = {
      no_clinical_advice: true as const,
      human_escalation_required_for: [
        'acute_pain',
        'pricing_dispute',
        'clinical_diagnosis',
        'adverse_reaction',
      ],
      max_duration_seconds: 300,
    };

    // 7. Persist task to database in 'pending' state
    const [task] = await db
      .insert(voiceCallTasks)
      .values({
        organizationId,
        patientId: input.patientId,
        opportunityId: input.opportunityId || null,
        intent: input.intent as VoiceCallIntent,
        status: 'pending',
        approvedContext,
        constraints,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : new Date(),
        createdById: session.user.id,
      })
      .returning();

    // 8. Enqueue call job with VoiceAgentProvider
    const normalizedCallInput: NormalizedVoiceCallInput = {
      organizationId,
      patientId: input.patientId,
      patientPhone: patient.phone,
      opportunityId: input.opportunityId || undefined,
      intent: input.intent as VoiceCallIntent,
      approvedContext,
      constraints,
    };

    const callJob = await defaultVoiceProvider.enqueueCall(task.id, normalizedCallInput);

    // 9. Update task with provider job ID and 'queued' status
    await db
      .update(voiceCallTasks)
      .set({
        providerJobId: callJob.jobId,
        status: 'queued',
        updatedAt: new Date(),
      })
      .where(eq(voiceCallTasks.id, task.id));

    // 10. Audit event
    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'voice_call_task',
      entityId: task.id,
      action: AuditActions.VOICE_CALL_TASK_CREATED,
      changedFields: {
        patientId: input.patientId,
        intent: input.intent,
        jobId: callJob.jobId,
      },
    });

    revalidatePath('/revenue');
    revalidatePath('/communications');
    return { success: true, data: { taskId: task.id, jobId: callJob.jobId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * 2. Execute simulated call execution / process incoming provider webhook.
 * Handles transcript recording, status transition, automated booking, and causal attribution.
 */
export async function executeVoiceCallSimulation(
  organizationId: string,
  taskId: string,
  scenario: 'booked' | 'voicemail' | 'escalate' | 'declined' = 'booked'
): Promise<ActionResult<{ status: VoiceCallStatus; outcome: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    const task = await db.query.voiceCallTasks.findFirst({
      where: and(eq(voiceCallTasks.id, taskId), eq(voiceCallTasks.organizationId, organizationId)),
      with: {
        opportunity: true,
        patient: true,
      },
    });

    if (!task) {
      return { success: false, error: { message: 'Voice call task not found.', code: 'NOT_FOUND' } };
    }

    const jobId = task.providerJobId || `job_${task.id}`;

    // Execute through provider abstraction
    const updatedJob = await defaultVoiceProvider.simulateCallExecution(jobId, scenario);
    const result = updatedJob.result!;

    // Update voice call task record
    await db
      .update(voiceCallTasks)
      .set({
        status: updatedJob.status,
        outcome: result.outcome,
        needsHumanFollowup: result.needs_human_followup,
        humanFollowupReason: result.human_followup_reason || null,
        transcript: result.transcriptText,
        callDurationSeconds: result.call_duration_seconds,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(voiceCallTasks.id, taskId));

    // If call converted to an appointment booking and was linked to a revenue opportunity:
    if (result.outcome === 'booked' && task.opportunityId && task.opportunity) {
      const opp = task.opportunity;
      const recoveredAmt = opp.estimatedValue ? parseFloat(opp.estimatedValue) : 250.0;

      // 1. Resolve opportunity as converted
      await db
        .update(revenueOpportunities)
        .set({
          status: 'converted',
          resolutionType: 'appointment_booked',
          recoveredRevenue: recoveredAmt.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(revenueOpportunities.id, opp.id));

      // 2. Insert causal revenue attribution record
      await db.insert(revenueAttributions).values({
        organizationId,
        opportunityId: opp.id,
        eventType: 'appointment_booked',
        sourceEntityType: 'voice_call',
        sourceEntityId: taskId,
        amount: recoveredAmt.toFixed(2),
        occurredAt: new Date(),
      });
    }

    // Audit event
    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'voice_call_task',
      entityId: taskId,
      action:
        result.outcome === 'escalated_to_human'
          ? AuditActions.VOICE_CALL_ESCALATED
          : AuditActions.VOICE_CALL_COMPLETED,
      changedFields: {
        outcome: result.outcome,
        duration: result.call_duration_seconds,
        needsHumanFollowup: result.needs_human_followup,
      },
    });

    revalidatePath('/revenue');
    revalidatePath('/communications');
    return {
      success: true,
      data: { status: updatedJob.status, outcome: result.outcome },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * 3. Manual Staff Escalation of a Call Task.
 */
export async function escalateVoiceCallTask(
  organizationId: string,
  rawInput: { taskId: string; reason: string }
): Promise<ActionResult<{ taskId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    const parsed = escalateVoiceCallTaskSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: 'Invalid escalation parameters.', code: 'VALIDATION_ERROR' },
      };
    }

    await db
      .update(voiceCallTasks)
      .set({
        status: 'escalated_to_human',
        needsHumanFollowup: true,
        humanFollowupReason: parsed.data.reason,
        updatedAt: new Date(),
      })
      .where(and(eq(voiceCallTasks.id, parsed.data.taskId), eq(voiceCallTasks.organizationId, organizationId)));

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'voice_call_task',
      entityId: parsed.data.taskId,
      action: AuditActions.VOICE_CALL_ESCALATED,
      changedFields: { reason: parsed.data.reason },
    });

    revalidatePath('/revenue');
    revalidatePath('/communications');
    return { success: true, data: { taskId: parsed.data.taskId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * 4. Fetch Organization Voice Call Queue.
 */
export async function getVoiceCallTasks(
  organizationId: string,
  filters?: { status?: string; intent?: string }
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.read');

    const tasks = await db.query.voiceCallTasks.findMany({
      where: eq(voiceCallTasks.organizationId, organizationId),
      orderBy: [desc(voiceCallTasks.createdAt)],
      with: {
        patient: true,
        opportunity: true,
      },
    });

    const filtered = tasks.filter((t) => {
      if (filters?.status && filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters?.intent && filters.intent !== 'all' && t.intent !== filters.intent) return false;
      return true;
    });

    return { success: true, data: filtered };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
