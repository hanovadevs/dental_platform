import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@dental/db';
import {
  memberships,
  staffProfiles,
  chairs,
  locations,
  roles,
  staffAvailability,
} from '@dental/db';
import { eq, and } from 'drizzle-orm';
import styles from './operations.module.css';
import { Badge } from '@/components/ui';
import {
  AddStaffDialog,
  AddChairDialog,
  AvailabilityDialog,
} from './operations-dialogs';

export default async function OperationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userMembership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!userMembership) {
    redirect('/onboarding');
  }

  const organizationId = userMembership.organizationId;

  // 1. Fetch staff profiles with dentist details and roles
  const staffList = await db.query.staffProfiles.findMany({
    where: eq(staffProfiles.organizationId, organizationId),
    with: {
      dentistProfile: true,
      membership: {
        with: {
          role: true,
        },
      },
      availability: {
        with: {
          location: true,
        },
      },
    },
  });

  // 2. Fetch chairs
  const chairsList = await db.query.chairs.findMany({
    where: eq(chairs.organizationId, organizationId),
    with: {
      location: true,
    },
  });

  // 3. Fetch roles and locations
  const orgRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.organizationId, organizationId));

  const orgLocations = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(and(eq(locations.organizationId, organizationId), eq(locations.active, true)));

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Practice Operations</h1>
          <p className={styles.subtitle}>
            Manage clinical staff, practitioner availability, and operating chairs.
          </p>
        </div>
        <AddStaffDialog
          organizationId={organizationId}
          roles={orgRoles}
          locations={orgLocations}
        />
      </header>

      {/* Staff & Practitioners */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Staff & Practitioners</h2>
            <p className={styles.subtitle}>
              Dentists, dental hygienists, front-desk staff, and assistants.
            </p>
          </div>
        </div>

        {staffList.length === 0 ? (
          <p className={styles.subtitle}>
            No additional staff members added yet. Click &quot;Add Staff Member&quot; to invite practitioners.
          </p>
        ) : (
          <div className={styles.grid}>
            {staffList.map((staff) => (
              <div key={staff.id} className={styles.card}>
                <div>
                  <div className={styles.cardTitle}>
                    <span>{staff.displayName}</span>
                    <Badge variant={staff.active ? 'success' : 'neutral'}>
                      {staff.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className={styles.cardSubtitle}>
                    {staff.jobTitle} • {staff.membership?.role?.name || 'Staff'}
                  </div>
                </div>

                {staff.dentistProfile && (
                  <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8125rem' }}>
                    <div>
                      <strong>Specialty:</strong> {staff.dentistProfile.specialty}
                    </div>
                    {staff.dentistProfile.licenseNumber && (
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        Lic: {staff.dentistProfile.licenseNumber}
                      </div>
                    )}
                  </div>
                )}

                {staff.phone && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    Phone: {staff.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Operating Chairs */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Operating Chairs / Rooms</h2>
            <p className={styles.subtitle}>
              Physical dental operatories and chairs for appointment scheduling.
            </p>
          </div>
          <AddChairDialog organizationId={organizationId} locations={orgLocations} />
        </div>

        {chairsList.length === 0 ? (
          <p className={styles.subtitle}>No operating chairs configured. Add chairs to begin scheduling.</p>
        ) : (
          <div className={styles.grid}>
            {chairsList.map((chair) => (
              <div key={chair.id} className={styles.chairCard}>
                <div>
                  <div style={{ fontWeight: 600 }}>{chair.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {chair.location?.name || 'Clinic'}
                  </div>
                </div>
                <Badge variant={chair.active ? 'success' : 'neutral'}>
                  {chair.active ? 'Available' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Practitioner Weekly Availability */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Practitioner Availability Schedules</h2>
            <p className={styles.subtitle}>
              Working shifts and chair availability by practitioner.
            </p>
          </div>
          <AvailabilityDialog
            organizationId={organizationId}
            staffList={staffList.map((s) => ({ id: s.id, displayName: s.displayName }))}
            locations={orgLocations}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {staffList.filter((s) => s.availability && s.availability.length > 0).length === 0 ? (
            <p className={styles.subtitle}>No practitioner hours configured yet.</p>
          ) : (
            staffList
              .filter((s) => s.availability && s.availability.length > 0)
              .map((s) => (
                <div key={`avail-${s.id}`} style={{ padding: 'var(--space-3)', background: 'var(--color-canvas)', borderRadius: 'var(--radius-input)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>{s.displayName}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {s.availability.map((slot) => (
                      <span
                        key={slot.id}
                        style={{
                          fontSize: '0.8125rem',
                          padding: '4px var(--space-3)',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {dayNames[slot.dayOfWeek]}: {slot.startTime} – {slot.endTime} ({slot.location?.name})
                      </span>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </section>
    </div>
  );
}
