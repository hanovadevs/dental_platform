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
  appointments,
  revenueOpportunities,
  recalls,
  communications,
  communicationConsents,
} from '@dental/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import styles from './patient-profile.module.css';
import { Badge, MedicalAlertBanner } from '@/components/ui';
import { PatientActions, ResolveAlertButton, RemoveAllergyButton } from './patient-actions';
import { DentalChart } from '@/features/clinical/components/dental-chart';
import { ClinicalNotesView } from '@/features/clinical/components/clinical-notes';
import { PatientTimelineView } from '@/features/clinical/components/timeline';
import { getPatientTimeline } from '@/features/clinical/server/actions';
import { PatientTreatmentsView } from '@/features/treatments/components/patient-treatments-view';
import { PatientBillingView } from '@/features/billing/components/patient-billing-view';
import {
  ensureDefaultTreatmentCatalog,
  getTreatmentPlansForPatient,
  getPatientProcedures,
} from '@/features/treatments/server/actions';
import { getPatientFinancialSummary } from '@/features/billing/server/actions';
import { treatmentDefinitions } from '@dental/db';
import { asc } from 'drizzle-orm';

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
  const activeOpportunities = await db.query.revenueOpportunities.findMany({
    where: and(
      eq(revenueOpportunities.patientId, patientId),
      eq(revenueOpportunities.organizationId, organizationId),
      inArray(revenueOpportunities.status, ['open', 'in_progress', 'snoozed'])
    ),
    orderBy: [desc(revenueOpportunities.estimatedValue)],
  });

  const patientRecalls = await db.query.recalls.findMany({
    where: and(
      eq(recalls.patientId, patientId),
      eq(recalls.organizationId, organizationId)
    ),
    with: {
      rule: true,
    },
    orderBy: [desc(recalls.dueAt)],
  });

  let conditionsData: any[] = [];
  let notesData: any[] = [];
  let timelineEvents: any[] = [];
  let appointmentsData: any[] = [];

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
  } else if (tab === 'appointments') {
    appointmentsData = await db.query.appointments.findMany({
      where: and(
        eq(appointments.patientId, patientId),
        eq(appointments.organizationId, organizationId)
      ),
      with: {
        chair: true,
        dentist: true,
        appointmentType: true,
      },
      orderBy: [desc(appointments.startAt)],
    });
  }

  let treatmentsData: { plans: any[]; procedures: any[]; catalog: any[] } = {
    plans: [],
    procedures: [],
    catalog: [],
  };
  let financialSummaryData: any = null;

  if (tab === 'treatments') {
    await ensureDefaultTreatmentCatalog(organizationId);
    const plansResult = await getTreatmentPlansForPatient(organizationId, patientId);
    const proceduresResult = await getPatientProcedures(organizationId, patientId);
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

    treatmentsData = {
      plans: plansResult.data || [],
      procedures: proceduresResult.data || [],
      catalog,
    };
  } else if (tab === 'billing') {
    const summaryResult = await getPatientFinancialSummary(organizationId, patientId);
    financialSummaryData = summaryResult.data || {
      totalBilled: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      invoices: [],
      payments: [],
    };
  } else if (tab === 'communications') {
    patientCommunicationsData = await db.query.communications.findMany({
      where: and(
        eq(communications.patientId, patientId),
        eq(communications.organizationId, organizationId)
      ),
      with: {
        sender: true,
        template: true,
      },
      orderBy: [desc(communications.createdAt)],
    });

    patientConsentsData = await db.query.communicationConsents.findMany({
      where: and(
        eq(communicationConsents.patientId, patientId),
        eq(communicationConsents.organizationId, organizationId)
      ),
    });
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
        <Link
          href={`/patients/${patientId}?tab=appointments`}
          className={[styles.tab, tab === 'appointments' ? styles.tabActive : ''].join(' ')}
        >
          Appointments
        </Link>
        <Link
          href={`/patients/${patientId}?tab=treatments`}
          className={[styles.tab, tab === 'treatments' ? styles.tabActive : ''].join(' ')}
        >
          Treatments
        </Link>
        <Link
          href={`/patients/${patientId}?tab=billing`}
          className={[styles.tab, tab === 'billing' ? styles.tabActive : ''].join(' ')}
        >
          Billing
        </Link>
        <Link
          href={`/patients/${patientId}?tab=communications`}
          className={[styles.tab, tab === 'communications' ? styles.tabActive : ''].join(' ')}
        >
          Communications
        </Link>
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

            {/* Unscheduled Care & Revenue Opportunities */}
            {activeOpportunities.length > 0 && (
              <section className={styles.card} style={{ marginTop: 'var(--space-4)', borderLeft: '4px solid var(--color-warning, #f59e0b)' }}>
                <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 className={styles.cardTitle}>Care Opportunities ({activeOpportunities.length})</h2>
                  <Link href={`/revenue`} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>
                    View in Queue &rarr;
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {activeOpportunities.map((opp) => (
                    <div key={opp.id} style={{ padding: '8px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: '4px', fontSize: 'var(--text-xs)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Badge variant={opp.priority === 'urgent' ? 'danger' : 'warning'} size="sm">
                          {opp.priority.toUpperCase()}
                        </Badge>
                        <strong>${parseFloat(opp.estimatedValue || '0').toFixed(2)}</strong>
                      </div>
                      <div>{opp.reason}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recalls */}
            {patientRecalls.length > 0 && (
              <section className={styles.card} style={{ marginTop: 'var(--space-4)' }}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Recalls & Hygiene Intervals</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {patientRecalls.map((rec) => (
                    <div key={rec.id} style={{ padding: '8px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: '4px', fontSize: 'var(--text-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{rec.rule?.name || 'Hygiene Recall'}</div>
                        <div style={{ color: 'var(--color-text-muted)' }}>Due: {new Date(rec.dueAt).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={rec.status === 'overdue' ? 'danger' : rec.status === 'booked' ? 'success' : 'neutral'} size="sm">
                        {rec.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}
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

      {/* Tab Content: Appointments History */}
      {tab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Scheduled & Past Appointments ({appointmentsData.length})
            </h2>
            <Link
              href="/calendar"
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-600, #0284c7)',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              Open Calendar
            </Link>
          </div>

          {appointmentsData.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-10)',
                background: 'var(--surface-base)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <p>No appointments recorded for this patient.</p>
              <Link
                href="/calendar"
                style={{
                  display: 'inline-block',
                  marginTop: 'var(--space-3)',
                  color: 'var(--primary-600, #0284c7)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Schedule First Appointment on Calendar →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {appointmentsData.map((appt: any) => (
                <div
                  key={appt.id}
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--surface-base)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {appt.appointmentType?.name || 'Appointment'}
                      </span>
                      <Badge
                        variant={
                          appt.status === 'completed'
                            ? 'success'
                            : appt.status === 'cancelled' || appt.status === 'no_show'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {appt.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {new Date(appt.startAt).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(appt.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(appt.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      Dr. {appt.dentist?.displayName || 'Practitioner'} • {appt.chair?.name || 'Chair'}
                    </div>

                    {appt.notes && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Notes: {appt.notes}
                      </p>
                    )}

                    {appt.cancellationReason && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger, #dc2626)', marginTop: '4px' }}>
                        Cancellation Reason: {appt.cancellationReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Treatments View */}
      {tab === 'treatments' && (
        <PatientTreatmentsView
          organizationId={organizationId}
          patientId={patientId}
          patientName={`${patient.firstName} ${patient.lastName}`}
          patientNumber={patient.patientNumber}
          plans={treatmentsData.plans}
          procedures={treatmentsData.procedures}
          catalog={treatmentsData.catalog}
          dentists={orgDentists}
          locations={orgLocations}
        />
      )}

      {/* Tab Content: Billing View */}
      {tab === 'billing' && financialSummaryData && (
        <PatientBillingView
          organizationId={organizationId}
          patientId={patientId}
          patientName={`${patient.firstName} ${patient.lastName}`}
          patientNumber={patient.patientNumber}
          financialSummary={financialSummaryData}
          locations={orgLocations}
        />
      )}

      {/* Tab Content: Communications View */}
      {tab === 'communications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Communication Preferences & Consent</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              {['sms', 'email', 'whatsapp'].map((ch) => {
                const optOut = patientConsentsData.find((c) => c.channel === ch && !c.consented);
                return (
                  <div key={ch} style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ textTransform: 'uppercase', fontSize: 'var(--text-xs)' }}>{ch}</strong>
                      <Badge variant={optOut ? 'danger' : 'success'} size="sm">
                        {optOut ? 'OPTED OUT' : 'CONSENTED'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {optOut ? 'No outbound messages allowed' : 'Operational & reminders active'}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className={styles.cardTitle}>Message History ({patientCommunicationsData.length})</h2>
              <Link href={`/communications`} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>
                Open Messaging Center &rarr;
              </Link>
            </div>

            {patientCommunicationsData.length === 0 ? (
              <p className={styles.listItemMeta}>No messages recorded for this patient.</p>
            ) : (
              <div className={styles.listGroup}>
                {patientCommunicationsData.map((comm) => (
                  <div key={comm.id} className={styles.listItem}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                          {comm.channel.toUpperCase()}
                        </span>
                        <Badge variant={comm.status === 'delivered' ? 'success' : comm.status === 'failed' ? 'danger' : 'info'} size="sm">
                          {comm.status.toUpperCase()}
                        </Badge>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          {new Date(comm.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {comm.subject && (
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '2px' }}>
                          Subject: {comm.subject}
                        </div>
                      )}
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {comm.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

