import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@dental/db';
import { memberships, locations, organizations, subscriptions } from '@dental/db';
import { eq } from 'drizzle-orm';
import styles from './settings.module.css';
import { AddLocationForm } from './add-location-form';
import { SignOutButton } from './sign-out-button';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch user's membership with organization, role, and role permissions
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
    with: {
      organization: true,
      role: {
        with: {
          rolePermissions: {
            with: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    redirect('/onboarding');
  }

  const org = membership.organization;

  // Fetch all locations for this organization
  const [orgLocations, currentSubscription] = await Promise.all([
    db.select().from(locations).where(eq(locations.organizationId, org.id)),
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, org.id),
    }),
  ]);

  const rolePermissionsList = membership.role?.rolePermissions.map(
    (rp) => rp.permission
  ) || [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Clinic Settings</h1>
        <p className={styles.subtitle}>
          Manage organization details, physical locations, commercial subscription, and security permissions.
        </p>
      </header>

      {/* Subscription & Commercial Licensing */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Subscription & Licensing</h2>
            <p className={styles.subtitle}>
              Manage commercial tier, chair quotas, multi-location licensing, and invoices.
            </p>
          </div>
          <Link href="/settings/subscription" className={styles.manageButton}>
            Manage Plan & Billing →
          </Link>
        </div>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Current Plan</span>
            <span className={styles.fieldValue} style={{ textTransform: 'capitalize' }}>
              {currentSubscription?.plan || 'Growth'} Tier
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Subscription Status</span>
            <div>
              <span className={styles.badge}>
                {currentSubscription?.status || 'Active'}
              </span>
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Physical Locations</span>
            <span className={styles.fieldValue}>
              {orgLocations.length} registered (Max: {currentSubscription?.maxLocations === -1 ? 'Unlimited' : (currentSubscription?.maxLocations || 3)})
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Compliance & Data Privacy</span>
            <span className={styles.fieldValue} style={{ color: 'var(--color-primary)' }}>
              GDPR & HIPAA Portability
            </span>
          </div>
        </div>
      </section>

      {/* Organization Information */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Organization Overview</h2>
          <span className={styles.badge}>{org.status}</span>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Practice Name</span>
            <span className={styles.fieldValue}>{org.name}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Organization Slug</span>
            <span className={styles.fieldValue}>{org.slug}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Default Currency</span>
            <span className={styles.fieldValue}>{org.defaultCurrency}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Clinic Timezone</span>
            <span className={styles.fieldValue}>{org.defaultTimezone}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Contact Email</span>
            <span className={styles.fieldValue}>{org.email || 'Not configured'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Contact Phone</span>
            <span className={styles.fieldValue}>{org.phone || 'Not configured'}</span>
          </div>
        </div>
      </section>

      {/* Practice Locations */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Practice Locations</h2>
            <p className={styles.subtitle}>
              Physical clinics, branches, and surgical centers.
            </p>
          </div>
          <AddLocationForm organizationId={org.id} />
        </div>

        <div className={styles.locationList}>
          {orgLocations.length === 0 ? (
            <p className={styles.subtitle}>No locations registered yet.</p>
          ) : (
            orgLocations.map((loc) => (
              <div key={loc.id} className={styles.locationCard}>
                <div>
                  <div className={styles.locationName}>{loc.name}</div>
                  <div className={styles.locationDetails}>
                    {[loc.address, loc.phone, loc.timezone]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                </div>
                <span className={styles.badge}>
                  {loc.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Role & Permissions */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Your Role & Access</h2>
            <p className={styles.subtitle}>
              Current role assigned: <strong>{membership.role?.name || 'Member'}</strong>
            </p>
          </div>
        </div>

        {membership.role?.description && (
          <p className={styles.subtitle} style={{ marginBottom: 'var(--space-3)' }}>
            {membership.role.description}
          </p>
        )}

        <div className={styles.permissionList}>
          {rolePermissionsList.map((perm) => (
            <span key={perm.id} className={styles.permissionTag}>
              {perm.name}
            </span>
          ))}
        </div>
      </section>

      {/* Account & Session */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Account Session</h2>
          <SignOutButton />
        </div>
        <p className={styles.subtitle}>
          Signed in as <strong>{session.user.email}</strong>
        </p>
      </section>
    </div>
  );
}
