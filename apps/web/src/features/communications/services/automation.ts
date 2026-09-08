import { db } from '@dental/db';
import {
  appointments,
  patients,
  recalls,
  communications,
  communicationConsents,
  communicationTemplates,
  communicationRules,
  confirmationTokens,
  organizations,
} from '@dental/db';
import { eq, and, lte, gte, isNull, inArray } from 'drizzle-orm';
import { renderTemplate } from '../domain/templates';
import { canSendMessage } from '../domain/consent';
import { getCommunicationProvider } from './provider';
import { randomUUID } from 'crypto';

export interface AutomationRunResult {
  remindersSent: number;
  recallsSent: number;
  skippedOptOut: number;
}

/**
 * Evaluates active reminder and recall automation rules for an organization.
 * Strictly multi-tenant isolated via organizationId.
 */
export async function runReminderAutomation(
  organizationId: string,
  appUrl: string = 'http://localhost:3000'
): Promise<AutomationRunResult> {
  const result: AutomationRunResult = {
    remindersSent: 0,
    recallsSent: 0,
    skippedOptOut: 0,
  };

  const now = new Date();
  const provider = getCommunicationProvider();

  // Fetch organization name
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  const clinicName = org?.name || 'Dental Clinic';

  // -------------------------------------------------------------
  // 1. Appointment Reminders (24 Hours Prior)
  // -------------------------------------------------------------
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcomingAppointments = await db.query.appointments.findMany({
    where: and(
      eq(appointments.organizationId, organizationId),
      gte(appointments.startAt, now),
      lte(appointments.startAt, next24h),
      inArray(appointments.status, ['scheduled', 'confirmed'])
    ),
    with: {
      patient: {
        with: {
          communicationConsents: true,
        },
      },
      dentist: true,
      chair: true,
      communications: true,
    },
  });

  // Find 24h reminder template
  const reminderTemplate = await db.query.communicationTemplates.findFirst({
    where: and(
      eq(communicationTemplates.organizationId, organizationId),
      eq(communicationTemplates.category, 'appointment_reminder'),
      eq(communicationTemplates.active, true)
    ),
  });

  for (const appt of upcomingAppointments) {
    // Avoid double-sending if already reminded
    const alreadyReminded = appt.communications.some(
      (c) => c.status === 'sent' || c.status === 'delivered'
    );
    if (alreadyReminded) continue;

    const patient = appt.patient;
    if (!patient) continue;

    const channel = (reminderTemplate?.channel as any) || 'sms';
    const recipient = channel === 'email' ? patient.email : patient.phone;

    if (!recipient) continue;

    // Consent Check
    const consentCheck = canSendMessage({
      channel,
      category: 'operational',
      patientConsents: patient.communicationConsents,
    });

    if (!consentCheck.allowed) {
      result.skippedOptOut++;
      continue;
    }

    // Generate confirmation token
    const token = randomUUID();
    const tokenExpiry = new Date(appt.startAt); // Token valid until appointment time
    await db.insert(confirmationTokens).values({
      organizationId,
      appointmentId: appt.id,
      token,
      expiresAt: tokenExpiry,
    });

    const confirmationUrl = `${appUrl}/confirm/${token}`;
    const appointmentDateStr = new Date(appt.startAt).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const appointmentTimeStr = new Date(appt.startAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const defaultBody = `Hi ${patient.firstName}, reminder of your appointment at ${clinicName} on ${appointmentDateStr} at ${appointmentTimeStr}. Confirm: ${confirmationUrl}`;
    const templateToUse = reminderTemplate || {
      subject: `Appointment Reminder - ${clinicName}`,
      body: defaultBody,
    };

    const rendered = renderTemplate(templateToUse, {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientFirstName: patient.firstName,
      clinicName,
      appointmentDate: appointmentDateStr,
      appointmentTime: appointmentTimeStr,
      dentistName: appt.dentist?.displayName || 'Your Dentist',
      chairName: appt.chair?.name,
      confirmationUrl,
    });

    // Send via provider
    let sendResult;
    if (channel === 'email') {
      sendResult = await provider.sendEmail({
        to: recipient,
        subject: rendered.subject || `Appointment Reminder - ${clinicName}`,
        body: rendered.body,
      });
    } else {
      sendResult = await provider.sendSms({
        to: recipient,
        body: rendered.body,
      });
    }

    // Log communication
    await db.insert(communications).values({
      organizationId,
      patientId: patient.id,
      appointmentId: appt.id,
      channel,
      direction: 'outbound',
      recipient,
      subject: rendered.subject || null,
      body: rendered.body,
      templateId: reminderTemplate?.id || null,
      status: sendResult.status,
      providerReference: sendResult.providerReference,
      deliveredAt: sendResult.deliveredAt,
      failedAt: sendResult.success ? null : new Date(),
      failureReason: sendResult.failureReason || null,
    });

    result.remindersSent++;
  }

  // -------------------------------------------------------------
  // 2. Overdue Recall Follow-ups
  // -------------------------------------------------------------
  const overdueRecalls = await db.query.recalls.findMany({
    where: and(
      eq(recalls.organizationId, organizationId),
      lte(recalls.dueAt, now),
      inArray(recalls.status, ['due', 'overdue'])
    ),
    with: {
      patient: {
        with: {
          communicationConsents: true,
        },
      },
      rule: true,
    },
  });

  const recallTemplate = await db.query.communicationTemplates.findFirst({
    where: and(
      eq(communicationTemplates.organizationId, organizationId),
      eq(communicationTemplates.category, 'recall'),
      eq(communicationTemplates.active, true)
    ),
  });

  for (const recall of overdueRecalls) {
    // Only send if not contacted recently (within past 14 days)
    if (recall.lastContactAt) {
      const daysSinceContact =
        (now.getTime() - new Date(recall.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceContact < 14) continue;
    }

    const patient = recall.patient;
    if (!patient) continue;

    const channel = (recallTemplate?.channel as any) || 'sms';
    const recipient = channel === 'email' ? patient.email : patient.phone;
    if (!recipient) continue;

    // Consent Check
    const consentCheck = canSendMessage({
      channel,
      category: 'recalls',
      patientConsents: patient.communicationConsents,
    });

    if (!consentCheck.allowed) {
      result.skippedOptOut++;
      continue;
    }

    const dueDateStr = new Date(recall.dueAt).toLocaleDateString();
    const defaultRecallBody = `Hi ${patient.firstName}, you are due for your routine hygiene checkup at ${clinicName}. Book today to maintain your oral health!`;

    const rendered = renderTemplate(recallTemplate || { body: defaultRecallBody }, {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientFirstName: patient.firstName,
      clinicName,
      recallDueDate: dueDateStr,
    });

    const sendResult =
      channel === 'email'
        ? await provider.sendEmail({
            to: recipient,
            subject: rendered.subject || `Hygiene Checkup Due - ${clinicName}`,
            body: rendered.body,
          })
        : await provider.sendSms({
            to: recipient,
            body: rendered.body,
          });

    await db.insert(communications).values({
      organizationId,
      patientId: patient.id,
      recallId: recall.id,
      channel,
      direction: 'outbound',
      recipient,
      subject: rendered.subject || null,
      body: rendered.body,
      templateId: recallTemplate?.id || null,
      status: sendResult.status,
      providerReference: sendResult.providerReference,
      deliveredAt: sendResult.deliveredAt,
    });

    // Update recall status & last contact
    await db
      .update(recalls)
      .set({
        status: 'contacted',
        lastContactAt: now,
        updatedAt: now,
      })
      .where(eq(recalls.id, recall.id));

    result.recallsSent++;
  }

  return result;
}
