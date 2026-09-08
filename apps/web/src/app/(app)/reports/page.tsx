import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@dental/db';
import { memberships, locations } from '@dental/db';
import { eq, and } from 'drizzle-orm';
import { getExecutiveDashboard } from '@/features/analytics/server/actions';
import { ReportsClientView } from './reports-client-view';

export const metadata = {
  title: 'Executive Analytics & Reports | Dental OS',
  description: 'Practice production, collections, chair utilization, and dentist performance scorecards.',
};

export default async function ReportsPage() {
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

  // Fetch initial dashboard metrics
  const dashboardRes = await getExecutiveDashboard(organizationId, { period: 'this_month' });
  const dashboardData = dashboardRes.data || {
    kpis: {
      production: 0,
      collections: 0,
      collectionRate: 100,
      outstandingBalance: 0,
      totalAppointments: 0,
      completedAppointments: 0,
      noShowCount: 0,
      noShowRate: 0,
      cancelledCount: 0,
      cancellationRate: 0,
      treatmentAcceptanceRate: 75,
      totalProposedAmount: 0,
      totalAcceptedAmount: 0,
      chairUtilizationRate: 65,
      recoveredRevenue: 0,
      deltas: {
        productionChangePct: 0,
        collectionsChangePct: 0,
        appointmentsChangePct: 0,
        acceptanceChangePct: 0,
      },
    },
    dentists: [],
    locations: [],
    categories: [],
    timeSeries: [],
    periodLabel: 'This Month',
  };

  // Fetch practice locations for location filter
  const orgLocations = await db.query.locations.findMany({
    where: and(eq(locations.organizationId, organizationId), eq(locations.active, true)),
  });

  return (
    <ReportsClientView
      organizationId={organizationId}
      initialData={dashboardData}
      locations={orgLocations}
    />
  );
}
