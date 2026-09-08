import { db } from '@dental/db';
import {
  revenueOpportunities,
  recalls,
  recallRules,
  treatmentPlans,
  treatmentPlanItems,
  appointments,
  invoices,
  patients,
} from '@dental/db';
import { eq, and, inArray, lt, gt, gte, isNull, sql } from 'drizzle-orm';
import { calculateOpportunityScore } from './scoring';
import { OpportunityPriority, OpportunityType } from './types';

export interface ScanResult {
  unacceptedTreatmentsFound: number;
  overdueRecallsFound: number;
  cancellationsFound: number;
  outstandingBalancesFound: number;
  newOpportunitiesCreated: number;
}

/**
 * Executes a full scan for unscheduled care and recoverable revenue opportunities.
 * Strictly multi-tenant isolated via organizationId.
 */
export async function runOpportunityDetection(organizationId: string): Promise<ScanResult> {
  const result: ScanResult = {
    unacceptedTreatmentsFound: 0,
    overdueRecallsFound: 0,
    cancellationsFound: 0,
    outstandingBalancesFound: 0,
    newOpportunitiesCreated: 0,
  };

  const now = new Date();

  // -------------------------------------------------------------
  // 1. Unaccepted Treatment Plans
  // -------------------------------------------------------------
  const unacceptedPlans = await db.query.treatmentPlans.findMany({
    where: and(
      eq(treatmentPlans.organizationId, organizationId),
      inArray(treatmentPlans.status, ['draft', 'presented', 'partially_accepted'])
    ),
    with: {
      items: true,
      patient: true,
      revenueOpportunities: {
        where: inArray(revenueOpportunities.status, ['open', 'in_progress', 'snoozed']),
      },
    },
  });

  for (const plan of unacceptedPlans) {
    // If an active opportunity already exists for this plan, skip creating a duplicate
    if (plan.revenueOpportunities.length > 0) {
      continue;
    }

    const proposedItems = plan.items.filter((item) => item.status === 'proposed');
    if (proposedItems.length === 0) continue;

    const estimatedValue = proposedItems.reduce(
      (sum, item) =>
        sum +
        (parseFloat(item.price?.toString() || '0') -
          parseFloat(item.discount?.toString() || '0')),
      0
    );

    if (estimatedValue <= 0) continue;

    result.unacceptedTreatmentsFound++;

    const ageInDays = Math.max(
      0,
      Math.floor((now.getTime() - new Date(plan.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );

    const score = calculateOpportunityScore({
      type: 'unaccepted_treatment',
      estimatedValue,
      ageInDays,
    });

    await db.insert(revenueOpportunities).values({
      organizationId,
      locationId: plan.locationId,
      patientId: plan.patientId,
      treatmentPlanId: plan.id,
      type: 'unaccepted_treatment',
      status: 'open',
      priority: score.priority,
      confidenceScore: score.confidenceScore,
      estimatedValue: estimatedValue.toFixed(2),
      currency: 'USD',
      reason: `Unaccepted treatment plan: "${plan.title}" (${proposedItems.length} proposed procedure${proposedItems.length > 1 ? 's' : ''})`,
      nextActionAt: score.suggestedActionDate,
      detectedAt: now,
    });

    result.newOpportunitiesCreated++;
  }

  // -------------------------------------------------------------
  // 2. Overdue Recalls
  // -------------------------------------------------------------
  const overdueRecalls = await db.query.recalls.findMany({
    where: and(
      eq(recalls.organizationId, organizationId),
      lt(recalls.dueAt, now),
      inArray(recalls.status, ['upcoming', 'due', 'overdue', 'contacted'])
    ),
    with: {
      rule: {
        with: {
          treatmentDefinition: true,
        },
      },
      patient: true,
    },
  });

  for (const recall of overdueRecalls) {
    // Check if status should be updated to 'overdue'
    if (recall.status !== 'overdue' && recall.status !== 'contacted') {
      await db
        .update(recalls)
        .set({ status: 'overdue', updatedAt: now })
        .where(eq(recalls.id, recall.id));
    }

    // Check if open opportunity already exists for this patient & overdue_recall
    const existingOpp = await db.query.revenueOpportunities.findFirst({
      where: and(
        eq(revenueOpportunities.organizationId, organizationId),
        eq(revenueOpportunities.patientId, recall.patientId),
        eq(revenueOpportunities.type, 'overdue_recall'),
        inArray(revenueOpportunities.status, ['open', 'in_progress', 'snoozed'])
      ),
    });

    if (existingOpp) continue;

    result.overdueRecallsFound++;

    const rulePrice = recall.rule.treatmentDefinition?.defaultPrice
      ? parseFloat(recall.rule.treatmentDefinition.defaultPrice.toString())
      : 180; // Standard hygiene default

    const overdueDays = Math.max(
      0,
      Math.floor((now.getTime() - new Date(recall.dueAt).getTime()) / (1000 * 60 * 60 * 24))
    );

    const score = calculateOpportunityScore({
      type: 'overdue_recall',
      estimatedValue: rulePrice,
      ageInDays: overdueDays,
    });

    await db.insert(revenueOpportunities).values({
      organizationId,
      locationId: recall.patient?.primaryLocationId ?? null,
      patientId: recall.patientId,
      type: 'overdue_recall',
      status: 'open',
      priority: score.priority,
      confidenceScore: score.confidenceScore,
      estimatedValue: rulePrice.toFixed(2),
      currency: 'USD',
      reason: `Overdue recall: ${recall.rule.name} (${overdueDays} days past due)`,
      nextActionAt: score.suggestedActionDate,
      detectedAt: now,
    });

    result.newOpportunitiesCreated++;
  }

  // -------------------------------------------------------------
  // 3. Cancelled Appointments / No Shows without Future Booking
  // -------------------------------------------------------------
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const cancelledAppointments = await db.query.appointments.findMany({
    where: and(
      eq(appointments.organizationId, organizationId),
      inArray(appointments.status, ['cancelled', 'no_show']),
      gte(appointments.startAt, thirtyDaysAgo)
    ),
    with: {
      patient: true,
      appointmentType: true,
      revenueOpportunities: {
        where: inArray(revenueOpportunities.status, ['open', 'in_progress', 'snoozed']),
      },
    },
  });

  for (const appt of cancelledAppointments) {
    if (appt.revenueOpportunities.length > 0) {
      continue;
    }

    // Check if the patient has any upcoming active appointments
    const futureAppointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.organizationId, organizationId),
        eq(appointments.patientId, appt.patientId),
        gte(appointments.startAt, now),
        inArray(appointments.status, ['scheduled', 'confirmed', 'checked_in', 'in_chair'])
      ),
    });

    if (futureAppointment) {
      // Patient is already re-booked, so not an unscheduled care risk
      continue;
    }

    result.cancellationsFound++;

    const estValue = 160; // Estimated lost chair booking value
    const oppType: OpportunityType =
      appt.status === 'no_show' ? 'no_show' : 'cancelled_appointment';

    const ageInDays = Math.max(
      0,
      Math.floor((now.getTime() - new Date(appt.startAt).getTime()) / (1000 * 60 * 60 * 24))
    );

    const score = calculateOpportunityScore({
      type: oppType,
      estimatedValue: estValue,
      ageInDays,
    });

    await db.insert(revenueOpportunities).values({
      organizationId,
      locationId: appt.locationId,
      patientId: appt.patientId,
      appointmentId: appt.id,
      type: oppType,
      status: 'open',
      priority: score.priority,
      confidenceScore: score.confidenceScore,
      estimatedValue: estValue.toFixed(2),
      currency: 'USD',
      reason: `${appt.status === 'no_show' ? 'No-show' : 'Cancelled'} appointment (${appt.appointmentType?.name ?? 'Dental Visit'}) without rebooking`,
      nextActionAt: score.suggestedActionDate,
      detectedAt: now,
    });

    result.newOpportunitiesCreated++;
  }

  // -------------------------------------------------------------
  // 4. Outstanding Balances
  // -------------------------------------------------------------
  const unpaidInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.organizationId, organizationId),
      inArray(invoices.status, ['issued', 'partially_paid']),
      gt(invoices.amountDue, '0')
    ),
    with: {
      patient: true,
      revenueOpportunities: {
        where: inArray(revenueOpportunities.status, ['open', 'in_progress', 'snoozed']),
      },
    },
  });

  for (const inv of unpaidInvoices) {
    if (inv.revenueOpportunities.length > 0) {
      continue;
    }

    const balance = parseFloat(inv.amountDue.toString());
    if (balance <= 0) continue;

    result.outstandingBalancesFound++;

    const ageInDays = Math.max(
      0,
      Math.floor((now.getTime() - new Date(inv.issuedAt).getTime()) / (1000 * 60 * 60 * 24))
    );

    const score = calculateOpportunityScore({
      type: 'outstanding_balance',
      estimatedValue: balance,
      ageInDays,
    });

    await db.insert(revenueOpportunities).values({
      organizationId,
      locationId: inv.locationId,
      patientId: inv.patientId,
      invoiceId: inv.id,
      type: 'outstanding_balance',
      status: 'open',
      priority: score.priority,
      confidenceScore: score.confidenceScore,
      estimatedValue: balance.toFixed(2),
      currency: inv.currency || 'USD',
      reason: `Outstanding invoice ${inv.invoiceNumber}: balance of $${balance.toFixed(2)} due`,
      nextActionAt: score.suggestedActionDate,
      detectedAt: now,
    });

    result.newOpportunitiesCreated++;
  }

  return result;
}
