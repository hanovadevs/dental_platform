import { TreatmentItemFinancialItem, TreatmentPlanStatus } from './types';

export interface PlanRollups {
  totalProposed: number;
  totalAccepted: number;
  totalCompleted: number;
  totalPending: number;
  totalDeclined: number;
  acceptanceRate: number; // 0 to 100
  itemCount: number;
  acceptedCount: number;
  completedCount: number;
  pendingCount: number;
}

/**
 * Pure function to calculate financial rollups and counts for a treatment plan.
 * Per spec (06_UI_UX_DESIGN_SYSTEM.md Section 18):
 * - Separate clinical status from financial valuation
 * - Track Proposed, Accepted, and Pending values
 */
export function calculatePlanRollups(items: TreatmentItemFinancialItem[]): PlanRollups {
  let totalProposed = 0;
  let totalAccepted = 0;
  let totalCompleted = 0;
  let totalPending = 0;
  let totalDeclined = 0;

  let itemCount = 0;
  let acceptedCount = 0;
  let completedCount = 0;
  let pendingCount = 0;

  for (const item of items) {
    if (item.status === 'cancelled') continue;

    itemCount++;
    const priceNum = typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price);
    const discNum = typeof item.discount === 'string' ? parseFloat(item.discount || '0') : Number(item.discount || 0);
    const netPrice = Math.max(0, Math.round((priceNum - discNum) * 100) / 100);

    totalProposed += netPrice;

    if (item.status === 'proposed') {
      totalPending += netPrice;
      pendingCount++;
    } else if (item.status === 'accepted' || item.status === 'scheduled' || item.status === 'in_progress') {
      totalAccepted += netPrice;
      acceptedCount++;
    } else if (item.status === 'completed') {
      totalAccepted += netPrice;
      totalCompleted += netPrice;
      acceptedCount++;
      completedCount++;
    } else if (item.status === 'declined') {
      totalDeclined += netPrice;
    }
  }

  const round = (val: number) => Math.round(val * 100) / 100;

  const finalProposed = round(totalProposed);
  const finalAccepted = round(totalAccepted);
  const finalCompleted = round(totalCompleted);
  const finalPending = round(totalPending);
  const finalDeclined = round(totalDeclined);

  const acceptanceRate = finalProposed > 0 ? Math.round((finalAccepted / finalProposed) * 100) : 0;

  return {
    totalProposed: finalProposed,
    totalAccepted: finalAccepted,
    totalCompleted: finalCompleted,
    totalPending: finalPending,
    totalDeclined: finalDeclined,
    acceptanceRate,
    itemCount,
    acceptedCount,
    completedCount,
    pendingCount,
  };
}

/**
 * Derives overall plan status based on constituent items and presentation status.
 */
export function derivePlanStatus(
  currentPlanStatus: TreatmentPlanStatus,
  items: { status: string }[]
): TreatmentPlanStatus {
  if (currentPlanStatus === 'abandoned') return 'abandoned';
  if (items.length === 0) return currentPlanStatus;

  const nonCancelled = items.filter((i) => i.status !== 'cancelled');
  if (nonCancelled.length === 0) return 'draft';

  const allCompleted = nonCancelled.every((i) => i.status === 'completed');
  if (allCompleted) return 'completed';

  const hasInProgress = nonCancelled.some((i) => i.status === 'in_progress' || i.status === 'scheduled');
  if (hasInProgress) return 'in_progress';

  const allDeclined = nonCancelled.every((i) => i.status === 'declined');
  if (allDeclined) return 'declined';

  const allAcceptedOrCompleted = nonCancelled.every(
    (i) => i.status === 'accepted' || i.status === 'completed'
  );
  if (allAcceptedOrCompleted) return 'accepted';

  const anyAccepted = nonCancelled.some(
    (i) => i.status === 'accepted' || i.status === 'completed'
  );
  if (anyAccepted) return 'partially_accepted';

  if (currentPlanStatus === 'presented') return 'presented';

  return 'draft';
}
