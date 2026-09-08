import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

/**
 * Dashboard / Home page.
 * Per spec (06_UI_UX_DESIGN_SYSTEM.md Section 13):
 * - Asymmetric layout, not a grid of equal cards
 * - Shows: today's clinic state, revenue opportunities, required actions, monthly trend
 * - "Good morning, Dr. Ahmed" style greeting
 *
 * Phase 0: Shows greeting and clinic pulse placeholder.
 * Full dashboard built in later phases when real data exists.
 */
export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const firstName = (session.user as { firstName?: string }).firstName || session.user.name?.split(' ')[0] || 'there';
  const now = new Date();
  const greeting = getGreeting(now);
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={styles.dashboard}>
      <header className={styles.greeting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <h1 className={styles.greetingText}>
            {greeting}, {firstName}
          </h1>
          <p className={styles.date}>{dateString}</p>
        </div>
        <img
          src="/logo.png"
          alt="Dental OS Logo"
          style={{
            width: '88px',
            height: '88px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 6px 20px rgba(2, 132, 199, 0.2))',
          }}
        />
      </header>

      <section className={styles.pulse}>
        <h2 className={styles.sectionTitle}>Today&apos;s clinic pulse</h2>
        <p className={styles.emptyNote}>
          No appointments or activity yet. Start by adding patients and scheduling appointments.
        </p>
      </section>
    </div>
  );
}

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
