'use server';

import { db } from '@dental/db';
import {
  communications,
  communicationConsents,
  communicationTemplates,
  communicationRules,
  confirmationTokens,
  patients,
  appointments,
  users,
  organizations,
  revenueOpportunities,
  opportunityOutreachLogs,
} from '@dental/db';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { formatErrorForClient } from '@/lib/errors';
import {
  sendMessageSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createRuleSchema,
  updateConsentSchema,
  SendMessageInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateRuleInput,
  UpdateConsentInput,
} from '../domain/validation';
import { renderTemplate } from '../domain/templates';
import { canSendMessage } from '../domain/consent';
import { getCommunicationProvider } from '../services/provider';
import { runReminderAutomation } from '../services/automation';
import {
  DEFAULT_COMMUNICATION_TEMPLATES,
  CommunicationChannel,
  ConsentCategory,
} from '../domain/types';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Send an outbound message (SMS, Email, WhatsApp) to a patient or lead.
 * Enforces consent & opt-out rules, dispatches through provider abstraction,
 * and logs to communication history.
 */
export async function sendMessage(
  organizationId: string,
  rawInput: SendMessageInput
): Promise<ActionResult<{ communicationId: string; providerReference: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    const parsed = sendMessageSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid message parameters',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;

    // 1. If sending to a patient, check consent and opt-out preferences
    if (data.patientId) {
      const patientConsents = await db.query.communicationConsents.findMany({
        where: and(
          eq(communicationConsents.organizationId, organizationId),
          eq(communicationConsents.patientId, data.patientId)
        ),
      });

      const consentCheck = canSendMessage({
        channel: data.channel as CommunicationChannel,
        category: data.category as ConsentCategory,
        patientConsents,
      });

      if (!consentCheck.allowed) {
        return {
          success: false,
          error: {
            message: `Cannot send message: ${consentCheck.reason}`,
            code: 'CONSENT_OPT_OUT',
          },
        };
      }
    }

    // 2. Render content (apply variables if template or variables provided)
    let finalSubject = data.subject || undefined;
    let finalBody = data.body;

    if (data.variables) {
      const rendered = renderTemplate(
        { subject: data.subject, body: data.body },
        data.variables
      );
      finalSubject = rendered.subject;
      finalBody = rendered.body;
    }

    // 3. Dispatch via provider abstraction
    const provider = getCommunicationProvider();
    let sendResult;

    if (data.channel === 'email') {
      sendResult = await provider.sendEmail({
        to: data.recipient,
        subject: finalSubject || 'Message from Dental Clinic',
        body: finalBody,
      });
    } else if (data.channel === 'whatsapp') {
      sendResult = await provider.sendWhatsApp({
        to: data.recipient,
        body: finalBody,
      });
    } else {
      // Default to SMS
      sendResult = await provider.sendSms({
        to: data.recipient,
        body: finalBody,
      });
    }

    // 4. Log communication record
    const [record] = await db
      .insert(communications)
      .values({
        organizationId,
        patientId: data.patientId || null,
        appointmentId: data.appointmentId || null,
        opportunityId: data.opportunityId || null,
        invoiceId: data.invoiceId || null,
        recallId: data.recallId || null,
        channel: data.channel,
        direction: 'outbound',
        recipient: data.recipient,
        subject: finalSubject || null,
        body: finalBody,
        templateId: data.templateId || null,
        status: sendResult.status,
        providerReference: sendResult.providerReference,
        sentBy: session.user.id,
        deliveredAt: sendResult.deliveredAt,
        failedAt: sendResult.success ? null : new Date(),
        failureReason: sendResult.failureReason || null,
      })
      .returning();

    // 5. Audit log
    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'communication',
      entityId: record.id,
      action: sendResult.success
        ? AuditActions.COMMUNICATION_SENT
        : AuditActions.COMMUNICATION_FAILED,
      changedFields: {
        channel: data.channel,
        recipient: data.recipient,
        status: sendResult.status,
      },
    });

    revalidatePath('/communications');
    if (data.patientId) revalidatePath(`/patients/${data.patientId}`);

    return {
      success: true,
      data: {
        communicationId: record.id,
        providerReference: sendResult.providerReference,
      },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Fetch communication history logs for an organization or specific patient.
 */
export async function getCommunicationLogs(
  organizationId: string,
  filter?: { patientId?: string; channel?: string; status?: string }
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.read');

    const whereConditions = [eq(communications.organizationId, organizationId)];

    if (filter?.patientId) {
      whereConditions.push(eq(communications.patientId, filter.patientId));
    }
    if (filter?.channel && filter.channel !== 'all') {
      whereConditions.push(eq(communications.channel, filter.channel));
    }
    if (filter?.status && filter.status !== 'all') {
      whereConditions.push(eq(communications.status, filter.status));
    }

    const logs = await db.query.communications.findMany({
      where: and(...whereConditions),
      with: {
        patient: true,
        sender: true,
        template: true,
      },
      orderBy: [desc(communications.createdAt)],
      limit: 100,
    });

    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Ensure default communication templates are seeded for the organization.
 */
export async function ensureDefaultTemplates(
  organizationId: string
): Promise<ActionResult<{ createdCount: number }>> {
  try {
    let createdCount = 0;

    for (const tpl of DEFAULT_COMMUNICATION_TEMPLATES) {
      const existing = await db.query.communicationTemplates.findFirst({
        where: and(
          eq(communicationTemplates.organizationId, organizationId),
          eq(communicationTemplates.name, tpl.name)
        ),
      });

      if (!existing) {
        await db.insert(communicationTemplates).values({
          organizationId,
          name: tpl.name,
          category: tpl.category,
          channel: tpl.channel,
          subject: tpl.subject || null,
          body: tpl.body,
          active: true,
        });
        createdCount++;
      }
    }

    return { success: true, data: { createdCount } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Get message templates for an organization.
 */
export async function getTemplates(
  organizationId: string,
  category?: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.read');

    const whereConditions = [eq(communicationTemplates.organizationId, organizationId)];
    if (category && category !== 'all') {
      whereConditions.push(eq(communicationTemplates.category, category));
    }

    const templates = await db.query.communicationTemplates.findMany({
      where: and(...whereConditions),
      orderBy: [asc(communicationTemplates.name)],
    });

    return { success: true, data: templates };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Create a new message template.
 */
export async function createTemplate(
  organizationId: string,
  rawInput: CreateTemplateInput
): Promise<ActionResult<{ templateId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    const parsed = createTemplateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid template data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const [created] = await db
      .insert(communicationTemplates)
      .values({
        organizationId,
        name: parsed.data.name,
        category: parsed.data.category,
        channel: parsed.data.channel,
        subject: parsed.data.subject || null,
        body: parsed.data.body,
        active: true,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'communication_template',
      entityId: created.id,
      action: AuditActions.COMMUNICATION_TEMPLATE_CREATED,
      changedFields: parsed.data as any,
    });

    revalidatePath('/communications');
    return { success: true, data: { templateId: created.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Update an existing message template.
 */
export async function updateTemplate(
  organizationId: string,
  rawInput: UpdateTemplateInput
): Promise<ActionResult<{ templateId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    const parsed = updateTemplateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid template data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { templateId, ...updates } = parsed.data;

    await db
      .update(communicationTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(communicationTemplates.id, templateId),
          eq(communicationTemplates.organizationId, organizationId)
        )
      );

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'communication_template',
      entityId: templateId,
      action: AuditActions.COMMUNICATION_TEMPLATE_UPDATED,
      changedFields: updates as any,
    });

    revalidatePath('/communications');
    return { success: true, data: { templateId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Get automated communication & reminder rules.
 */
export async function getCommunicationRules(
  organizationId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.read');

    const rules = await db.query.communicationRules.findMany({
      where: eq(communicationRules.organizationId, organizationId),
      with: {
        template: true,
      },
      orderBy: [asc(communicationRules.name)],
    });

    return { success: true, data: rules };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Create a new communication automation rule.
 */
export async function createCommunicationRule(
  organizationId: string,
  rawInput: CreateRuleInput
): Promise<ActionResult<{ ruleId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    const parsed = createRuleSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid rule data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const [rule] = await db
      .insert(communicationRules)
      .values({
        organizationId,
        name: parsed.data.name,
        triggerEvent: parsed.data.triggerEvent,
        templateId: parsed.data.templateId || null,
        channel: parsed.data.channel,
        offsetHours: parsed.data.offsetHours,
        active: true,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'communication_rule',
      entityId: rule.id,
      action: AuditActions.COMMUNICATION_RULE_CREATED,
      changedFields: parsed.data as any,
    });

    revalidatePath('/communications');
    return { success: true, data: { ruleId: rule.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Toggle active status of a communication rule.
 */
export async function toggleCommunicationRule(
  organizationId: string,
  ruleId: string,
  active: boolean
): Promise<ActionResult<{ ruleId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    await db
      .update(communicationRules)
      .set({ active, updatedAt: new Date() })
      .where(
        and(
          eq(communicationRules.id, ruleId),
          eq(communicationRules.organizationId, organizationId)
        )
      );

    revalidatePath('/communications');
    return { success: true, data: { ruleId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Get patient communication consent and opt-out preferences.
 */
export async function getPatientConsents(
  organizationId: string,
  patientId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'patient.read');

    const consents = await db.query.communicationConsents.findMany({
      where: and(
        eq(communicationConsents.organizationId, organizationId),
        eq(communicationConsents.patientId, patientId)
      ),
    });

    return { success: true, data: consents };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Update patient communication consent / opt-out status.
 */
export async function updatePatientConsent(
  organizationId: string,
  rawInput: UpdateConsentInput
): Promise<ActionResult<{ consentId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'patient.write');

    const parsed = updateConsentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid consent data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { patientId, channel, category, consented, source = 'staff_entry' } = parsed.data;

    // Check existing consent record
    const existing = await db.query.communicationConsents.findFirst({
      where: and(
        eq(communicationConsents.organizationId, organizationId),
        eq(communicationConsents.patientId, patientId),
        eq(communicationConsents.channel, channel),
        eq(communicationConsents.category, category)
      ),
    });

    let consentId: string;
    const now = new Date();

    if (existing) {
      await db
        .update(communicationConsents)
        .set({
          consented,
          optedOutAt: consented ? null : now,
          source,
          updatedAt: now,
        })
        .where(eq(communicationConsents.id, existing.id));
      consentId = existing.id;
    } else {
      const [created] = await db
        .insert(communicationConsents)
        .values({
          organizationId,
          patientId,
          channel,
          category,
          consented,
          optedOutAt: consented ? null : now,
          source,
        })
        .returning();
      consentId = created.id;
    }

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'patient',
      entityId: patientId,
      action: consented ? 'consent.granted' : AuditActions.COMMUNICATION_OPT_OUT,
      changedFields: { channel, category, consented, source },
    });

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: { consentId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Generate a secure confirmation link token for an appointment.
 */
export async function generateConfirmationToken(
  organizationId: string,
  appointmentId: string
): Promise<ActionResult<{ token: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

    await db.insert(confirmationTokens).values({
      organizationId,
      appointmentId,
      token,
      expiresAt,
    });

    return { success: true, data: { token } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Public action: Patient clicks confirmation link to confirm their appointment.
 * Does NOT require authentication because it uses a cryptographically random token.
 */
export async function confirmAppointmentByToken(
  token: string
): Promise<ActionResult<{ appointmentId: string; appointmentTime: string; clinicName: string }>> {
  try {
    if (!token) {
      return { success: false, error: { message: 'Invalid token', code: 'INVALID_TOKEN' } };
    }

    const tokenRecord = await db.query.confirmationTokens.findFirst({
      where: eq(confirmationTokens.token, token),
      with: {
        appointment: {
          with: {
            organization: true,
            dentist: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      return { success: false, error: { message: 'Confirmation link not found', code: 'NOT_FOUND' } };
    }

    const now = new Date();
    if (tokenRecord.expiresAt < now) {
      return { success: false, error: { message: 'Confirmation link has expired', code: 'EXPIRED' } };
    }

    // Mark appointment confirmed if scheduled
    if (tokenRecord.appointment && tokenRecord.appointment.status === 'scheduled') {
      await db
        .update(appointments)
        .set({ status: 'confirmed' })
        .where(eq(appointments.id, tokenRecord.appointmentId));
    }

    // Mark token used
    await db
      .update(confirmationTokens)
      .set({ confirmedAt: now })
      .where(eq(confirmationTokens.id, tokenRecord.id));

    return {
      success: true,
      data: {
        appointmentId: tokenRecord.appointmentId,
        appointmentTime: tokenRecord.appointment?.startAt?.toISOString() || '',
        clinicName: tokenRecord.appointment?.organization?.name || 'Dental Clinic',
      },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Dispatch automated outreach message for an opportunity directly from the work queue.
 * Automatically ties the sent message to the opportunity touchpoint history!
 */
export async function dispatchOpportunityOutreachMessage(
  organizationId: string,
  opportunityId: string,
  templateId: string,
  channel: CommunicationChannel
): Promise<ActionResult<{ messageId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    const opp = await db.query.revenueOpportunities.findFirst({
      where: and(
        eq(revenueOpportunities.id, opportunityId),
        eq(revenueOpportunities.organizationId, organizationId)
      ),
      with: {
        patient: true,
        treatmentPlan: true,
      },
    });

    if (!opp || !opp.patient) {
      return { success: false, error: { message: 'Opportunity or patient not found', code: 'NOT_FOUND' } };
    }

    const template = await db.query.communicationTemplates.findFirst({
      where: and(
        eq(communicationTemplates.id, templateId),
        eq(communicationTemplates.organizationId, organizationId)
      ),
    });

    if (!template) {
      return { success: false, error: { message: 'Template not found', code: 'NOT_FOUND' } };
    }

    const recipient = channel === 'email' ? opp.patient.email : opp.patient.phone;
    if (!recipient) {
      return {
        success: false,
        error: {
          message: `Patient has no ${channel} on file`,
          code: 'MISSING_CONTACT_INFO',
        },
      };
    }

    // Render template
    const rendered = renderTemplate(template, {
      patientName: `${opp.patient.firstName} ${opp.patient.lastName}`,
      patientFirstName: opp.patient.firstName,
      clinicName: 'Dental Clinic',
      treatmentPlanTitle: opp.treatmentPlan?.title || 'Proposed Care',
      balanceDue: `$${parseFloat(opp.estimatedValue || '0').toFixed(2)}`,
    });

    // Send via sendMessage
    const sendRes = await sendMessage(organizationId, {
      patientId: opp.patient.id,
      opportunityId: opp.id,
      channel,
      category: 'operational',
      recipient,
      templateId: template.id,
      subject: rendered.subject,
      body: rendered.body,
    });

    if (!sendRes.success || !sendRes.data) {
      return { success: false, error: sendRes.error };
    }

    // Automatically record an outreach log for the revenue opportunity
    await db.insert(opportunityOutreachLogs).values({
      organizationId,
      opportunityId: opp.id,
      patientId: opp.patient.id,
      channel,
      outcome: 'message_sent',
      notes: `Automated ${channel.toUpperCase()} sent using template "${template.name}"`,
      performedBy: session.user.id,
    });

    // Update opportunity status to in_progress
    if (opp.status === 'open') {
      await db
        .update(revenueOpportunities)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(revenueOpportunities.id, opp.id));
    }

    revalidatePath('/revenue');
    return { success: true, data: { messageId: sendRes.data.communicationId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Trigger background/scheduled reminder automation.
 */
export async function triggerAutomationRun(
  organizationId: string
): Promise<ActionResult<any>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'communications.write');

    const res = await runReminderAutomation(organizationId);

    revalidatePath('/communications');
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
