import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@dental/db';
import {
  memberships,
  patients,
  locations,
  staffProfiles,
  medicalAlerts,
} from '@dental/db';
import { eq, and, or, ilike, desc } from 'drizzle-orm';
import styles from './patients.module.css';
import { Badge, EmptyState, Input } from '@/components/ui';
import { NewPatientDialog } from './new-patient-dialog';

interface PatientsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
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
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const query = params.q?.trim() || '';

  // 1. Fetch practice locations and dentists for New Patient dialog
  const orgLocations = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(and(eq(locations.organizationId, organizationId), eq(locations.active, true)));

  const orgDentists = await db
    .select({ id: staffProfiles.id, displayName: staffProfiles.displayName })
    .from(staffProfiles)
    .where(and(eq(staffProfiles.organizationId, organizationId), eq(staffProfiles.active, true)));

  // 2. Build where conditions
  const conditions = [eq(patients.organizationId, organizationId)];

  if (statusFilter !== 'all') {
    conditions.push(eq(patients.status, statusFilter as any));
  }

  if (query) {
    conditions.push(
      or(
        ilike(patients.firstName, `%${query}%`),
        ilike(patients.lastName, `%${query}%`),
        ilike(patients.phone, `%${query}%`),
        ilike(patients.patientNumber, `%${query}%`)
      )!
    );
  }

  // 3. Fetch patients with relations
  const patientList = await db.query.patients.findMany({
    where: and(...conditions),
    orderBy: [desc(patients.createdAt)],
    with: {
      primaryLocation: true,
      primaryDentist: true,
      medicalAlerts: {
        where: eq(medicalAlerts.active, true),
      },
    },
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'recall_due':
        return 'warning';
      case 'inactive':
        return 'neutral';
      case 'archived':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Patients</h1>
          <p className={styles.subtitle}>
            {patientList.length} patient record{patientList.length === 1 ? '' : 's'} in practice
          </p>
        </div>
        <div className={styles.topActions}>
          <NewPatientDialog
            organizationId={organizationId}
            locations={orgLocations}
            dentists={orgDentists}
          />
        </div>
      </header>

      {/* Layer 2 Navigation: Filter pills */}
      <nav className={styles.subnav} aria-label="Filter patients by status">
        <Link
          href="/patients"
          className={[
            styles.subnavLink,
            statusFilter === 'all' ? styles.subnavLinkActive : '',
          ].join(' ')}
        >
          All Patients
        </Link>
        <Link
          href="/patients?status=active"
          className={[
            styles.subnavLink,
            statusFilter === 'active' ? styles.subnavLinkActive : '',
          ].join(' ')}
        >
          Active
        </Link>
        <Link
          href="/patients?status=recall_due"
          className={[
            styles.subnavLink,
            statusFilter === 'recall_due' ? styles.subnavLinkActive : '',
          ].join(' ')}
        >
          Recall Due
        </Link>
        <Link
          href="/patients?status=inactive"
          className={[
            styles.subnavLink,
            statusFilter === 'inactive' ? styles.subnavLinkActive : '',
          ].join(' ')}
        >
          Inactive
        </Link>
        <Link
          href="/patients?status=archived"
          className={[
            styles.subnavLink,
            statusFilter === 'archived' ? styles.subnavLinkActive : '',
          ].join(' ')}
        >
          Archived
        </Link>
      </nav>

      {/* Search Input */}
      <form method="GET" className={styles.searchBar}>
        <input
          type="hidden"
          name="status"
          value={statusFilter !== 'all' ? statusFilter : ''}
        />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by patient name, phone, or P-ID..."
          aria-label="Search patients"
        />
      </form>

      {/* Patients Table */}
      {patientList.length === 0 ? (
        <EmptyState
          title="No patients found"
          description={
            query
              ? `No patient matched "${query}". Try adjusting your search.`
              : 'Get started by creating your clinic’s first patient record.'
          }
          action={
            <NewPatientDialog
              organizationId={organizationId}
              locations={orgLocations}
              dentists={orgDentists}
            />
          }
        />
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Primary Branch</th>
                <th>Primary Dentist</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patientList.map((p) => {
                const activeAlertsCount = p.medicalAlerts?.length || 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className={styles.patientNumber}>{p.patientNumber}</span>
                    </td>
                    <td>
                      <Link href={`/patients/${p.id}`} className={styles.patientLink}>
                        {p.firstName} {p.lastName}
                      </Link>
                      {activeAlertsCount > 0 && (
                        <span className={styles.alertTag} title={`${activeAlertsCount} active medical alert(s)`}>
                          ⚠️ {activeAlertsCount} Alert{activeAlertsCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      <div>{p.phone}</div>
                      {p.email && <div className={styles.metaText}>{p.email}</div>}
                    </td>
                    <td>{p.primaryLocation?.name || '—'}</td>
                    <td>{p.primaryDentist?.displayName || 'Unassigned'}</td>
                    <td>
                      <Badge variant={getStatusVariant(p.status)}>
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
