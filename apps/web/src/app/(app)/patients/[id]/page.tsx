import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@dental/db';
import {
  memberships,
  patients,
  locations,
  staffProfiles,
  medicalAlerts,
  allergies,
  patientEmergencyContacts,
  toothConditions,
  clinicalNotes,
} from '@dental/db';
import { eq, and, desc } from 'drizzle-orm';
import styles from './patient-profile.module.css';
import { Badge, MedicalAlertBanner } from '@/components/ui';
import { PatientActions, ResolveAlertButton, RemoveAllergyButton } from './patient-actions';
import { DentalChart } from '@/features/clinical/components/dental-chart';
import { ClinicalNotesView } from '@/features/clinical/components/clinical-notes';
import { PatientTimelineView } from '@/features/clinical/components/timeline';
import { getPatientTimeline } from '@/features/clinical/server/actions';

interface PatientProfilePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function PatientProfilePage({
  params,
  searchParams,
}: PatientProfilePageProps) {
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
  const { id: patientId } = await params;
  const { tab = 'overview' } = await searchParams;

  // 1. Fetch patient with relations
  const patient = await db.query.patients.findFirst({
    where: and(
      eq(patients.id, patientId),
      eq(patients.organizationId, organizationId)
    ),
    with: {
      primaryLocation: true,
      primaryDentist: true,
      emergencyContacts: true,
      medicalAlerts: {
        where: eq(medicalAlerts.active, true),
      },
      allergies: {
        where: eq(allergies.active, true),
      },
    },
  });

  if (!patient) {
    notFound();
  }

  // 2. Fetch locations and dentists
  const orgLocations = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(and(eq(locations.organizationId, organizationId), eq(locations.active, true)));

  const orgDentists = await db
    .select({ id: staffProfiles.id, displayName: staffProfiles.displayName })
    .from(staffProfiles)
    .where(and(eq(staffProfiles.organizationId, organizationId), eq(staffProfiles.active, true)));

  // 3. Tab specific data fetching
  let conditionsData: any[] = [];
  let notesData: any[] = [];
  let timelineEvents: any[] = [];

  if (tab === 'chart') {
    const rawConditions = await db.query.toothConditions.findMany({
      where: and(
        eq(toothConditions.patientId, patientId),
        eq(toothConditions.organizationId, organizationId)
      ),
      with: {
        recorder: true,
      },
      orderBy: [desc(toothConditions.recordedAt)],
    });

    conditionsData = rawConditions.map((c) => ({
      id: c.id,
      toothCode: c.toothCode,
      surface: c.surface,
      conditionType: c.conditionType,
      status: c.status,
      notes: c.notes,
      recordedAt: c.recordedAt,
      recordedByName: c.recorder ? `${c.recorder.firstName} ${c.recorder.lastName}` : undefined,
      active: c.active,
      supersedesId: c.supersedesId,
    }));
  } else if (tab === 'notes') {
    const rawNotes = await db.query.clinicalNotes.findMany({
      where: and(
        eq(clinicalNotes.patientId, patientId),
        eq(clinicalNotes.organizationId, organizationId)
      ),
      with: {
        author: true,
        dentist: true,
      },
      orderBy: [desc(clinicalNotes.signedAt)],
    });

    notesData = rawNotes.map((n) => ({
      id: n.id,
      chiefComplaint: n.chiefComplaint,
      diagnosis: n.diagnosis,
      treatmentProvided: n.treatmentProvided,
      plan: n.plan,
      signedAt: n.signedAt,
      authorName: n.author ? `${n.author.firstName} ${n.author.lastName}` : undefined,
      dentistName: n.dentist?.displayName,
    }));
  } else if (tab === 'timeline') {
    timelineEvents = await getPatientTimeline(organizationId, patientId);
  }

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

  const activeAlertsCount = (patient.medicalAlerts?.length || 0) + (patient.allergies?.length || 0);

  return (
    <div className={styles.container}>
      <Link href="/patients" className={styles.backLink}>
        ← Back to Patients
      </Link>

      {/* Prominent Clinical Medical Alert Banner */}
      <MedicalAlertBanner
        alerts={patient.medicalAlerts}
        allergies={patient.allergies}
      />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>
              {patient.firstName} {patient.lastName}
            </h1>
            <span className={styles.patientNumber}>{patient.patientNumber}</span>
            <Badge variant={getStatusVariant(patient.status)}>
              {patient.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className={styles.quickDetails}>
            {[
              patient.phone,
              patient.email,
              patient.primaryLocation?.name,
              patient.gender,
            ]
              .filter(Boolean)
              .join(' • ')}
          </div>
        </div>

        <div className={styles.headerActions}>
          <PatientActions
            organizationId={organizationId}
            patient={patient}
            locations={orgLocations}
            dentists={orgDentists}
          />
        </div>
      </header>

      {/* Layer 3: Object Context Tabs */}
      <nav className={styles.tabs} aria-label="Patient contextual sections">
        <Link
          href={`/patients/${patientId}?tab=overview`}
          className={[styles.tab, tab === 'overview' ? styles.tabActive : ''].join(' ')}
        >
          Overview
        </Link>
        <Link
          href={`/patients/${patientId}?tab=alerts`}
          className={[styles.tab, tab === 'alerts' ? styles.tabActive : ''].join(' ')}
        >
          Medical Alerts & Allergies
          {activeAlertsCount > 0 && (
            <span className={styles.tabBadge}>{activeAlertsCount}</span>
          )}
        </Link>
        <Link
          href={`/patients/${patientId}?tab=chart`}
          className={[styles.tab, tab === 'chart' ? styles.tabActive : ''].join(' ')}
        >
          Dental Chart
        </Link>
        <Link
          href={`/patients/${patientId}?tab=notes`}
          className={[styles.tab, tab === 'notes' ? styles.tabActive : ''].join(' ')}
        >
          Clinical Notes
        </Link>
        <Link
          href={`/patients/${patientId}?tab=timeline`}
          className={[styles.tab, tab === 'timeline' ? styles.tabActive : ''].join(' ')}
        >
          Timeline
        </Link>
        <button type="button" className={styles.tab} disabled title="Appointments arriving in Phase 3">
          Appointments <span style={{ opacity: 0.5, fontSize: '0.6875rem' }}>(Phase 3)</span>
        </button>
        <button type="button" className={styles.tab} disabled title="Treatment plans arriving in Phase 4">
          Treatments <span style={{ opacity: 0.5, fontSize: '0.6875rem' }}>(Phase 4)</span>
        </button>
        <button type="button" className={styles.tab} disabled title="Billing arriving in Phase 5">
          Billing <span style={{ opacity: 0.5, fontSize: '0.6875rem' }}>(Phase 5)</span>
        </button>
      </nav>

      {/* Tab Content: Alerts View */}
      {tab === 'alerts' && (
        <div>
          {/* Medical Alerts */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Active Medical Alerts</h2>
            </div>
            {patient.medicalAlerts.length === 0 ? (
              <p className={styles.listItemMeta}>No active medical alerts recorded for this patient.</p>
            ) : (
              <div className={styles.listGroup}>
                {patient.medicalAlerts.map((alert) => (
                  <div key={alert.id} className={styles.listItem}>
                    <div>
                      <div className={styles.listItemText}>{alert.label}</div>
                      <div className={styles.listItemMeta}>
                        Type: {alert.type.replace('_', ' ')} • Severity:{' '}
                        <strong>{alert.severity}</strong> • Recorded{' '}
                        {alert.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <ResolveAlertButton organizationId={organizationId} alertId={alert.id} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Allergies */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Known Allergies</h2>
            </div>
            {patient.allergies.length === 0 ? (
              <p className={styles.listItemMeta}>No known allergies recorded.</p>
            ) : (
              <div className={styles.listGroup}>
                {patient.allergies.map((allergy) => (
                  <div key={allergy.id} className={styles.listItem}>
                    <div>
                      <div className={styles.listItemText}>{allergy.substance}</div>
                      <div className={styles.listItemMeta}>
                        Reaction: {allergy.reaction || 'Unspecified'} • Severity:{' '}
                        <strong>{allergy.severity}</strong>
                      </div>
                    </div>
                    <RemoveAllergyButton organizationId={organizationId} allergyId={allergy.id} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab Content: Overview View */}
      {tab === 'overview' && (
        <div className={styles.layout}>
          <div>
            {/* Demographic Information */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Demographic Information</h2>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Phone</span>
                  <span className={styles.fieldValue}>{patient.phone}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Email</span>
                  <span className={styles.fieldValue}>{patient.email || '—'}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Date of Birth</span>
                  <span className={styles.fieldValue}>{patient.dateOfBirth || '—'}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Gender</span>
                  <span className={styles.fieldValue}>{patient.gender || '—'}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Preferred Contact</span>
                  <span className={styles.fieldValue}>{patient.preferredContactMethod}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Preferred Language</span>
                  <span className={styles.fieldValue}>{patient.preferredLanguage}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Lead / Acquisition Source</span>
                  <span className={styles.fieldValue}>{patient.leadSource || '—'}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Registered Since</span>
                  <span className={styles.fieldValue}>{patient.createdAt.toLocaleDateString()}</span>
                </div>
              </div>

              {patient.address && (
                <div className={styles.field} style={{ marginTop: 'var(--space-4)' }}>
                  <span className={styles.fieldLabel}>Residential Address</span>
                  <span className={styles.fieldValue}>{patient.address}</span>
                </div>
              )}

              {patient.notes && (
                <div className={styles.field} style={{ marginTop: 'var(--space-4)' }}>
                  <span className={styles.fieldLabel}>Administrative Notes</span>
                  <span className={styles.fieldValue}>{patient.notes}</span>
                </div>
              )}
            </section>

            {/* Emergency Contacts */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Emergency Contacts</h2>
              </div>
              {patient.emergencyContacts.length === 0 ? (
                <p className={styles.listItemMeta}>No emergency contact on file.</p>
              ) : (
                <div className={styles.listGroup}>
                  {patient.emergencyContacts.map((contact) => (
                    <div key={contact.id} className={styles.listItem}>
                      <div>
                        <div className={styles.listItemText}>{contact.name}</div>
                        <div className={styles.listItemMeta}>
                          Relationship: {contact.relationship}
                        </div>
                      </div>
                      <div className={styles.fieldValue}>{contact.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar: Clinic Care & Quick Summary */}
          <div>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Clinical Care</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Primary Branch Location</span>
                  <span className={styles.fieldValue}>{patient.primaryLocation?.name}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Primary Dentist</span>
                  <span className={styles.fieldValue}>
                    {patient.primaryDentist?.displayName || 'Unassigned'}
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Active Clinical Alerts</span>
                  <span className={styles.fieldValue}>
                    {activeAlertsCount > 0 ? (
                      <span style={{ color: 'var(--color-danger)' }}>{activeAlertsCount} flag(s) active</span>
                    ) : (
                      'None reported'
                    )}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Tab Content: Dental Chart */}
      {tab === 'chart' && (
        <DentalChart
          organizationId={organizationId}
          patientId={patientId}
          conditions={conditionsData}
        />
      )}

      {/* Tab Content: Clinical Progress Notes */}
      {tab === 'notes' && (
        <ClinicalNotesView
          organizationId={organizationId}
          patientId={patientId}
          notes={notesData}
          dentists={orgDentists}
        />
      )}

      {/* Tab Content: Unified Patient Timeline */}
      {tab === 'timeline' && (
        <PatientTimelineView events={timelineEvents} />
      )}
    </div>
  );
}

