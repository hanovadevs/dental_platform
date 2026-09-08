import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@dental/db';
import { memberships } from '@dental/db';
import { eq } from 'drizzle-orm';
import {
  getRevenueMetrics,
  getRevenueOpportunities,
  ensureDefaultRecallRules,
} from '@/features/revenue/server/actions';
import { RevenueClientView } from './revenue-client-view';

export const metadata = {
  title: 'Revenue Opportunities | Dental OS',
  description: 'Intelligent unscheduled care discovery and revenue recovery work queue.',
};

export default async function RevenuePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!membership) {
    redirect('/onboarding');
  }

  const organizationId = membership.organizationId;

  // Ensure default recall rules exist
  await ensureDefaultRecallRules(organizationId);

  // 1. Fetch Metrics
  const metricsRes = await getRevenueMetrics(organizationId);
  const metrics = metricsRes.data || {
    totalPipelineValue: 0,
    totalRecoveredRevenue: 0,
    openOpportunitiesCount: 0,
    convertedCount: 0,
    lostCount: 0,
    overdueRecallsCount: 0,
    unacceptedTreatmentsValue: 0,
    outstandingBalancesValue: 0,
  };

  // 2. Fetch Opportunities
  const oppsRes = await getRevenueOpportunities(organizationId, { status: 'all' });
  const opportunities = oppsRes.data || [];

  return (
    <RevenueClientView
      organizationId={organizationId}
      initialMetrics={metrics}
      initialOpportunities={opportunities}
    />
  );
}
