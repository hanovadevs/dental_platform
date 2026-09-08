import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { db } from '@dental/db';
import { memberships } from '@dental/db';
import { eq } from 'drizzle-orm';

/**
 * Authenticated app layout.
 * Wraps all authenticated pages in the AppShell.
 * Checks for active membership; redirects to onboarding if none exists.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user has any active membership (clinic)
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
    with: {
      organization: true,
    },
  });

  // If no clinic yet, redirect to onboarding
  if (!membership) {
    redirect('/onboarding');
  }

  return (
    <AppShell
      userName={session.user.name || undefined}
      clinicName={membership.organization.name}
    >
      {children}
    </AppShell>
  );
}
