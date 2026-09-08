'use server';

import { db } from '@dental/db';
import { subscriptions, locations, chairs, patients } from '@dental/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { resolveTenantContext, requirePermission } from '@/lib/permissions';
import { createAuditEvent, AuditActions } from '@/lib/audit';
import { formatErrorForClient } from '@/lib/errors';
import { revalidatePath } from 'next/cache';
import {
  PlanTier,
  SUBSCRIPTION_PLANS,
  canAddLocation,
  canAddChair,
  isFeatureAvailable,
} from '../domain/plans';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; fields?: Record<string, string[]> };
}

export interface SubscriptionStatusData {
  plan: PlanTier;
  status: string;
  planName: string;
  priceMonthly: number;
  maxLocations: number;
  maxChairs: number;
  currentLocations: number;
  currentChairs: number;
  totalPatients: number;
  features: string[];
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Get current organization subscription and usage quotas.
 */
export async function getOrganizationSubscription(
  organizationId: string
): Promise<ActionResult<SubscriptionStatusData>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'settings.manage');

    // 1. Fetch or initialize subscription
    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    });

    if (!sub) {
      const defaultPlan = SUBSCRIPTION_PLANS.growth;
      const [newSub] = await db
        .insert(subscriptions)
        .values({
          organizationId,
          plan: 'growth',
          status: 'active',
          maxLocations: defaultPlan.maxLocations,
          maxChairs: defaultPlan.maxChairs,
          features: defaultPlan.features.join(','),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .returning();
      sub = newSub;
    }

    // 2. Count active locations, chairs, and patients
    const [locList, chairList, patList] = await Promise.all([
      db.query.locations.findMany({
        where: and(eq(locations.organizationId, organizationId), eq(locations.active, true)),
      }),
      db.query.chairs.findMany({
        where: and(eq(chairs.organizationId, organizationId), eq(chairs.active, true)),
      }),
      db.query.patients.findMany({
        where: and(eq(patients.organizationId, organizationId), eq(patients.status, 'active')),
      }),
    ]);

    const planTier = (sub.plan as PlanTier) || 'growth';
    const planDef = SUBSCRIPTION_PLANS[planTier] || SUBSCRIPTION_PLANS.growth;

    return {
      success: true,
      data: {
        plan: planTier,
        status: sub.status,
        planName: planDef.name,
        priceMonthly: planDef.priceMonthly,
        maxLocations: sub.maxLocations,
        maxChairs: sub.maxChairs,
        currentLocations: locList.length,
        currentChairs: chairList.length,
        totalPatients: patList.length,
        features: planDef.features,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
    };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Switch organization subscription plan tier.
 */
export async function updateSubscriptionPlan(
  organizationId: string,
  newPlan: PlanTier
): Promise<ActionResult<{ plan: PlanTier }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: { message: 'Unauthorized', code: 'UNAUTHENTICATED' } };
    }

    const context = await resolveTenantContext(session.user.id, organizationId);
    requirePermission(context, 'settings.manage');

    const planDef = SUBSCRIPTION_PLANS[newPlan];
    if (!planDef) {
      return {
        success: false,
        error: { message: `Invalid plan tier: ${newPlan}`, code: 'VALIDATION_ERROR' },
      };
    }

    await db
      .insert(subscriptions)
      .values({
        organizationId,
        plan: newPlan,
        status: 'active',
        maxLocations: planDef.maxLocations,
        maxChairs: planDef.maxChairs,
        features: planDef.features.join(','),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: subscriptions.organizationId,
        set: {
          plan: newPlan,
          maxLocations: planDef.maxLocations,
          maxChairs: planDef.maxChairs,
          features: planDef.features.join(','),
          updatedAt: new Date(),
        },
      });

    await createAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      entityType: 'subscription',
      entityId: organizationId,
      action: AuditActions.SUBSCRIPTION_PLAN_CHANGED,
      changedFields: { plan: newPlan, maxLocations: planDef.maxLocations, maxChairs: planDef.maxChairs },
    });

    revalidatePath('/settings');
    revalidatePath('/settings/subscription');
    return { success: true, data: { plan: newPlan } };
  } catch (error) {
    return { success: false, error: formatErrorForClient(error) };
  }
}

/**
 * Check if the practice has reached chair capacity.
 */
export async function verifyChairQuota(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
  });
  const plan = (sub?.plan as PlanTier) || 'growth';

  const chairList = await db.query.chairs.findMany({
    where: and(eq(chairs.organizationId, organizationId), eq(chairs.active, true)),
  });

  return canAddChair(chairList.length, plan);
}

/**
 * Check if the practice has reached location capacity.
 */
export async function verifyLocationQuota(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
  });
  const plan = (sub?.plan as PlanTier) || 'growth';

  const locList = await db.query.locations.findMany({
    where: and(eq(locations.organizationId, organizationId), eq(locations.active, true)),
  });

  return canAddLocation(locList.length, plan);
}
