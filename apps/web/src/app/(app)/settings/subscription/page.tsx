import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@dental/db';
import { memberships } from '@dental/db';
import { eq } from 'drizzle-orm';
import { getOrganizationSubscription } from '@/features/subscriptions/server/actions';
import { SubscriptionClientView } from './subscription-client-view';
import styles from './subscription.module.css';

export default async function SubscriptionSettingsPage() {
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

  const res = await getOrganizationSubscription(membership.organizationId);
  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <Link href="/settings" className={styles.backLink}>
        ← Back to Clinic Settings
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Commercial Subscription & Capacity</h1>
        <p className={styles.subtitle}>
          Manage your practice subscription plan, location & operatory chair limits, export full archives, and verify platform health.
        </p>
      </header>

      <SubscriptionClientView
        organizationId={membership.organizationId}
        initialSubscription={res.data}
      />
    </div>
  );
}
