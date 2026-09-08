'use server';

import { db } from '@dental/db';
import {
  revenueOpportunities,
  revenueAttributions,
  opportunityOutreachLogs,
  recallRules,
  recalls,
  patients,
  users,
  locations,
  treatmentPlans,
  appointments,
  invoices,
} from '@dental/db';
import { eq, and, desc, asc, sql, inArray, gte, lte } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { formatErrorForClient } from '@/lib/errors';
import {
  logOutreachSchema,
  resolveOpportunitySchema,
  snoozeOpportunitySchema,
  createRecallSchema,
  createRecallRuleSchema,
  LogOutreachInput,
  ResolveOpportunityInput,
  SnoozeOpportunityInput,
  CreateRecallInput,
  CreateRecallRuleInput,
} from '../domain/validation';
import { runOpportunityDetection } from '../domain/detection';
import { evaluateAttribution } from '../domain/attribution';
import { DEFAULT_RECALL_RULES, RevenueMetrics } from '../domain/types';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

/**
 * Get aggregate revenue pipeline and recovery metrics for an organization.
 */
export async function getRevenueMetrics(
  organizationId: string,
  locationId?: string
): Promise<ActionResult<RevenueMetrics>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.read');

    const opps = await db.query.revenueOpportunities.findMany({
      where: and(
        eq(revenueOpportunities.organizationId, organizationId),
        locationId ? eq(revenueOpportunities.locationId, locationId) : undefined
      ),
    });

    let totalPipelineValue = 0;
    let totalRecoveredRevenue = 0;
    let openOpportunitiesCount = 0;
    let convertedCount = 0;
    let lostCount = 0;
    let unacceptedTreatmentsValue = 0;
    let outstandingBalancesValue = 0;

    for (const opp of opps) {
      const est = parseFloat(opp.estimatedValue || '0');
      const rec = parseFloat(opp.recoveredRevenue || '0');

      if (opp.status === 'open' || opp.status === 'in_progress' || opp.status === 'snoozed') {
        totalPipelineValue += est;
        openOpportunitiesCount++;

        if (opp.type === 'unaccepted_treatment') {
          unacceptedTreatmentsValue += est;
        } else if (opp.type === 'outstanding_balance') {
          outstandingBalancesValue += est;
        }
      } else if (opp.status === 'converted') {
        convertedCount++;
        totalRecoveredRevenue += rec;
      } else if (opp.status === 'lost') {
        lostCount++;
      }
    }

    // Count overdue recalls
    const now = new Date();
    const overdueRecalls = await db.query.recalls.findMany({
      where: and(
        eq(recalls.organizationId, organizationId),
        lte(recalls.dueAt, now),
        inArray(recalls.status, ['upcoming', 'due', 'overdue', 'contacted'])
      ),
    });

    const metrics: RevenueMetrics = {
      totalPipelineValue,
      totalRecoveredRevenue,
      openOpportunitiesCount,
      convertedCount,
      lostCount,
      overdueRecallsCount: overdueRecalls.length,
      unacceptedTreatmentsValue,
      outstandingBalancesValue,
    };

    return { success: true, data: metrics };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

export interface OpportunityFilter {
  status?: string;
  type?: string;
  priority?: string;
  patientId?: string;
  locationId?: string;
}

/**
 * Fetch prioritized work queue of revenue opportunities.
 */
export async function getRevenueOpportunities(
  organizationId: string,
  filter?: OpportunityFilter
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.read');

    const whereConditions = [eq(revenueOpportunities.organizationId, organizationId)];

    if (filter?.status && filter.status !== 'all') {
      whereConditions.push(eq(revenueOpportunities.status, filter.status));
    } else if (!filter?.status) {
      // Default: active work queue (open, in_progress, snoozed)
      whereConditions.push(
        inArray(revenueOpportunities.status, ['open', 'in_progress', 'snoozed'])
      );
    }

    if (filter?.type && filter.type !== 'all') {
      whereConditions.push(eq(revenueOpportunities.type, filter.type));
    }
    if (filter?.priority && filter.priority !== 'all') {
      whereConditions.push(eq(revenueOpportunities.priority, filter.priority));
    }
    if (filter?.patientId) {
      whereConditions.push(eq(revenueOpportunities.patientId, filter.patientId));
    }
    if (filter?.locationId) {
      whereConditions.push(eq(revenueOpportunities.locationId, filter.locationId));
    }

    const list = await db.query.revenueOpportunities.findMany({
      where: and(...whereConditions),
      with: {
        patient: true,
        location: true,
        assignee: true,
        outreachLogs: {
          orderBy: desc(opportunityOutreachLogs.contactedAt),
          with: {
            actor: true,
          },
        },
        attributions: true,
        treatmentPlan: true,
        appointment: {
          with: {
            appointmentType: true,
          },
        },
        invoice: true,
      },
      orderBy: [
        // Priority ordering: urgent (1), high (2), normal (3), low (4)
        sql`CASE 
          WHEN ${revenueOpportunities.priority} = 'urgent' THEN 1 
          WHEN ${revenueOpportunities.priority} = 'high' THEN 2 
          WHEN ${revenueOpportunities.priority} = 'normal' THEN 3 
          ELSE 4 
        END ASC`,
        asc(revenueOpportunities.nextActionAt),
        desc(revenueOpportunities.estimatedValue),
      ],
    });

    return { success: true, data: list };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Trigger real-time detection scan across unscheduled care sources.
 */
export async function runOpportunityScan(
  organizationId: string
): Promise<ActionResult<{ message: string; result: any }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.write');

    const scanResult = await runOpportunityDetection(organizationId);

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'revenue_opportunity',
      entityId: organizationId,
      action: AuditActions.REVENUE_OPPORTUNITY_CREATED,
      changedFields: scanResult as any,
      reason: 'Automated/manual scan for recoverable revenue opportunities',
    });

    revalidatePath('/revenue');
    revalidatePath('/patients');

    return {
      success: true,
      data: {
        message: `Scan complete: ${scanResult.newOpportunitiesCreated} new opportunities discovered`,
        result: scanResult,
      },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Log outreach interaction for an opportunity (phone call, SMS, email, etc.)
 */
export async function logOpportunityOutreach(
  organizationId: string,
  rawInput: LogOutreachInput
): Promise<ActionResult<{ outreachId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.write');

    const parsed = logOutreachSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid outreach data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { opportunityId, channel, outcome, notes, nextActionDate } = parsed.data;

    const opp = await db.query.revenueOpportunities.findFirst({
      where: and(
        eq(revenueOpportunities.id, opportunityId),
        eq(revenueOpportunities.organizationId, organizationId)
      ),
    });

    if (!opp) {
      return { success: false, error: { message: 'Opportunity not found', code: 'NOT_FOUND' } };
    }

    // Insert outreach log
    const [log] = await db
      .insert(opportunityOutreachLogs)
      .values({
        organizationId,
        opportunityId,
        patientId: opp.patientId!,
        channel,
        outcome,
        notes: notes || null,
        performedBy: session.user.id,
      })
      .returning();

    // Update opportunity status to in_progress and update next action date
    const updatePayload: Record<string, any> = {
      status: opp.status === 'open' ? 'in_progress' : opp.status,
      updatedAt: new Date(),
    };

    if (nextActionDate) {
      updatePayload.nextActionAt = new Date(nextActionDate);
    }

    await db
      .update(revenueOpportunities)
      .set(updatePayload)
      .where(eq(revenueOpportunities.id, opportunityId));

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'revenue_opportunity',
      entityId: opportunityId,
      action: AuditActions.OUTREACH_LOGGED,
      changedFields: { channel, outcome, notes, nextActionDate },
      reason: `Outreach logged via ${channel}: ${outcome}`,
    });

    revalidatePath('/revenue');
    return { success: true, data: { outreachId: log.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Resolve an opportunity (Converted or Lost) with causal attribution.
 */
export async function resolveOpportunity(
  organizationId: string,
  rawInput: ResolveOpportunityInput
): Promise<ActionResult<{ opportunityId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.write');

    const parsed = resolveOpportunitySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid resolution data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { opportunityId, resolutionType, notes, recoveredAmount } = parsed.data;

    const opp = await db.query.revenueOpportunities.findFirst({
      where: and(
        eq(revenueOpportunities.id, opportunityId),
        eq(revenueOpportunities.organizationId, organizationId)
      ),
    });

    if (!opp) {
      return { success: false, error: { message: 'Opportunity not found', code: 'NOT_FOUND' } };
    }

    const isConverted = [
      'appointment_booked',
      'treatment_accepted',
      'invoice_paid',
    ].includes(resolutionType);

    const now = new Date();
    const finalStatus = isConverted ? 'converted' : 'lost';
    const amountRecovered = isConverted ? (recoveredAmount ?? parseFloat(opp.estimatedValue || '0')) : 0;

    // Strict Causal Attribution check per Section 16
    if (isConverted && amountRecovered > 0) {
      const attributionCheck = evaluateAttribution({
        opportunityId: opp.id,
        opportunityType: opp.type,
        opportunityCreatedAt: opp.createdAt,
        patientId: opp.patientId!,
        treatmentPlanId: opp.treatmentPlanId,
        invoiceId: opp.invoiceId,
        event: {
          type: resolutionType as any,
          patientId: opp.patientId!,
          treatmentPlanId: opp.treatmentPlanId,
          invoiceId: opp.invoiceId,
          sourceEntityType: opp.invoiceId
            ? 'payment'
            : opp.treatmentPlanId
            ? 'procedure'
            : 'appointment',
          sourceEntityId: opp.invoiceId || opp.treatmentPlanId || opp.appointmentId || opp.id,
          amount: amountRecovered,
          occurredAt: now,
        },
      });

      if (!attributionCheck.isAttributable) {
        return {
          success: false,
          error: {
            message: `Attribution rejected: ${attributionCheck.reason}`,
            code: 'ATTRIBUTION_ERROR',
          },
        };
      }

      // Record causal attribution
      await db.insert(revenueAttributions).values({
        organizationId,
        opportunityId: opp.id,
        eventType: resolutionType,
        sourceEntityType: opp.invoiceId
          ? 'payment'
          : opp.treatmentPlanId
          ? 'procedure'
          : 'appointment',
        sourceEntityId: opp.invoiceId || opp.treatmentPlanId || opp.appointmentId || opp.id,
        amount: amountRecovered.toFixed(2),
        currency: opp.currency || 'USD',
        occurredAt: now,
      });
    }

    await db
      .update(revenueOpportunities)
      .set({
        status: finalStatus,
        resolutionType,
        recoveredRevenue: isConverted ? amountRecovered.toFixed(2) : null,
        resolvedAt: now,
        notes: notes ? (opp.notes ? `${opp.notes}\n${notes}` : notes) : opp.notes,
        updatedAt: now,
      })
      .where(eq(revenueOpportunities.id, opportunityId));

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'revenue_opportunity',
      entityId: opportunityId,
      action: AuditActions.REVENUE_OPPORTUNITY_RESOLVED,
      changedFields: { status: finalStatus, resolutionType, amountRecovered, notes },
      reason: `Opportunity resolved as ${finalStatus} (${resolutionType})`,
    });

    revalidatePath('/revenue');
    return { success: true, data: { opportunityId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Snooze an opportunity until a specified date.
 */
export async function snoozeOpportunity(
  organizationId: string,
  rawInput: SnoozeOpportunityInput
): Promise<ActionResult<{ opportunityId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.write');

    const parsed = snoozeOpportunitySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid snooze data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { opportunityId, snoozedUntil, notes } = parsed.data;
    const snoozeDate = new Date(snoozedUntil);

    const opp = await db.query.revenueOpportunities.findFirst({
      where: and(
        eq(revenueOpportunities.id, opportunityId),
        eq(revenueOpportunities.organizationId, organizationId)
      ),
    });

    if (!opp) {
      return { success: false, error: { message: 'Opportunity not found', code: 'NOT_FOUND' } };
    }

    await db
      .update(revenueOpportunities)
      .set({
        status: 'snoozed',
        snoozedUntil: snoozeDate,
        nextActionAt: snoozeDate,
        notes: notes ? (opp.notes ? `${opp.notes}\n[Snooze Note]: ${notes}` : `[Snooze Note]: ${notes}`) : opp.notes,
        updatedAt: new Date(),
      })
      .where(eq(revenueOpportunities.id, opportunityId));

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'revenue_opportunity',
      entityId: opportunityId,
      action: AuditActions.REVENUE_OPPORTUNITY_SNOOZED,
      changedFields: { snoozedUntil, notes },
      reason: `Opportunity snoozed until ${snoozedUntil}`,
    });

    revalidatePath('/revenue');
    return { success: true, data: { opportunityId } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Ensure default recall rules exist for an organization.
 */
export async function ensureDefaultRecallRules(
  organizationId: string
): Promise<ActionResult<{ createdCount: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.write');

    let createdCount = 0;

    for (const rule of DEFAULT_RECALL_RULES) {
      const existing = await db.query.recallRules.findFirst({
        where: and(
          eq(recallRules.organizationId, organizationId),
          eq(recallRules.name, rule.name)
        ),
      });

      if (!existing) {
        await db.insert(recallRules).values({
          organizationId,
          name: rule.name,
          intervalDays: rule.intervalDays,
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
 * Get configured recall rules.
 */
export async function getRecallRules(
  organizationId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.read');

    const rules = await db.query.recallRules.findMany({
      where: eq(recallRules.organizationId, organizationId),
      with: {
        treatmentDefinition: true,
      },
      orderBy: asc(recallRules.name),
    });

    return { success: true, data: rules };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Create a new recall rule.
 */
export async function createRecallRule(
  organizationId: string,
  rawInput: CreateRecallRuleInput
): Promise<ActionResult<{ ruleId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.write');

    const parsed = createRecallRuleSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid recall rule data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const [rule] = await db
      .insert(recallRules)
      .values({
        organizationId,
        name: parsed.data.name,
        intervalDays: parsed.data.intervalDays,
        treatmentDefinitionId: parsed.data.treatmentDefinitionId || null,
        active: true,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'recall_rule',
      entityId: rule.id,
      action: AuditActions.RECALL_RULE_CREATED,
      changedFields: parsed.data as any,
    });

    return { success: true, data: { ruleId: rule.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Get recalls for a specific patient.
 */
export async function getPatientRecalls(
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

    const patientRecalls = await db.query.recalls.findMany({
      where: and(
        eq(recalls.organizationId, organizationId),
        eq(recalls.patientId, patientId)
      ),
      with: {
        rule: {
          with: {
            treatmentDefinition: true,
          },
        },
        bookedAppointment: true,
      },
      orderBy: desc(recalls.dueAt),
    });

    return { success: true, data: patientRecalls };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Create a new recall entry for a patient (e.g. after procedure completion or periodic check).
 */
export async function createRecall(
  organizationId: string,
  rawInput: CreateRecallInput
): Promise<ActionResult<{ recallId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'revenue.write');

    const parsed = createRecallSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Invalid recall data',
          code: 'VALIDATION_ERROR',
          fields: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { patientId, ruleId, dueAt, notes } = parsed.data;

    const [recall] = await db
      .insert(recalls)
      .values({
        organizationId,
        patientId,
        ruleId,
        dueAt: new Date(dueAt),
        status: new Date(dueAt) < new Date() ? 'overdue' : 'upcoming',
        notes: notes || null,
      })
      .returning();

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'recall',
      entityId: recall.id,
      action: AuditActions.RECALL_CREATED,
      changedFields: { patientId, ruleId, dueAt, notes },
    });

    revalidatePath(`/patients/${patientId}`);
    revalidatePath('/revenue');

    return { success: true, data: { recallId: recall.id } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}
