import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@dental/db';
import {
  memberships,
  treatmentDefinitions,
  treatmentPlans,
} from '@dental/db';
import { eq, and, asc, desc } from 'drizzle-orm';
import { ensureDefaultTreatmentCatalog } from '@/features/treatments/server/actions';
import { calculatePlanRollups } from '@/features/treatments/domain/rollups';
import { TreatmentsClientView } from './treatments-client-view';

export default async function TreatmentsPage() {
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

  // 1. Ensure default treatment catalog is populated
  await ensureDefaultTreatmentCatalog(organizationId);

  // 2. Fetch catalog
  const catalog = await db
    .select()
    .from(treatmentDefinitions)
    .where(
      and(
        eq(treatmentDefinitions.organizationId, organizationId),
        eq(treatmentDefinitions.active, true)
      )
    )
    .orderBy(asc(treatmentDefinitions.category), asc(treatmentDefinitions.name));

  // 3. Fetch recent plans
  const rawPlans = await db.query.treatmentPlans.findMany({
    where: eq(treatmentPlans.organizationId, organizationId),
    with: {
      patient: true,
      dentist: {
        with: {
          membership: {
            with: {
              user: true,
            },
          },
        },
      },
      items: {
        with: {
          treatmentDefinition: true,
        },
        orderBy: (items, { asc }) => [asc(items.sequence)],
      },
    },
    orderBy: (plans, { desc }) => [desc(plans.createdAt)],
    limit: 20,
  });

  const recentPlans = rawPlans.map((plan) => ({
    ...plan,
    rollups: calculatePlanRollups(plan.items),
  }));

  return (
    <TreatmentsClientView
      organizationId={organizationId}
      catalog={catalog}
      recentPlans={recentPlans}
    />
  );
}
