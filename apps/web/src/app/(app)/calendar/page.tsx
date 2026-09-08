import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@dental/db';
import {
  memberships,
  locations,
  chairs,
  staffProfiles,
  patients,
  appointmentTypes,
  appointments,
  waitingListEntries,
} from '@dental/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { CalendarClient } from './calendar-client';
import { ensureDefaultAppointmentTypes } from '@/features/scheduling/server/actions';

interface CalendarPageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
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
  const { date: paramDate } = await searchParams;
  const initialDate = paramDate || new Date().toISOString().split('T')[0]!;

  // Ensure default appointment types exist
  await ensureDefaultAppointmentTypes(organizationId);

  // 1. Fetch Locations
  const orgLocations = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(and(eq(locations.organizationId, organizationId), eq(locations.active, true)));

  // 2. Fetch Chairs
  const orgChairs = await db
    .select({ id: chairs.id, name: chairs.name, locationId: chairs.locationId })
    .from(chairs)
    .where(and(eq(chairs.organizationId, organizationId), eq(chairs.active, true)));

  // 3. Fetch Dentists
  const orgDentists = await db
    .select({ id: staffProfiles.id, displayName: staffProfiles.displayName })
    .from(staffProfiles)
    .where(and(eq(staffProfiles.organizationId, organizationId), eq(staffProfiles.active, true)));

  // 4. Fetch Active Patients
  const orgPatients = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      patientNumber: patients.patientNumber,
      phone: patients.phone,
    })
    .from(patients)
    .where(and(eq(patients.organizationId, organizationId), isNull(patients.archivedAt)));

  // 5. Fetch Appointment Types
  const orgTypes = await db
    .select({
      id: appointmentTypes.id,
      name: appointmentTypes.name,
      durationMinutes: appointmentTypes.durationMinutes,
      color: appointmentTypes.color,
    })
    .from(appointmentTypes)
    .where(and(eq(appointmentTypes.organizationId, organizationId), eq(appointmentTypes.active, true)));

  // 6. Fetch Appointments with relations
  const rawAppointments = await db.query.appointments.findMany({
    where: eq(appointments.organizationId, organizationId),
    with: {
      patient: true,
      chair: true,
      dentist: true,
      appointmentType: true,
      statusHistory: {
        with: {
          changer: true,
        },
        orderBy: (history, { desc }) => [desc(history.changedAt)],
      },
    },
  });

  // 7. Fetch Waiting List entries
  const rawWaitingList = await db.query.waitingListEntries.findMany({
    where: and(
      eq(waitingListEntries.organizationId, organizationId),
      eq(waitingListEntries.status, 'waiting')
    ),
    with: {
      patient: true,
      location: true,
      preferredDentist: true,
      appointmentType: true,
    },
    orderBy: [desc(waitingListEntries.createdAt)],
  });

  // Format data for CalendarClient
  const formattedAppointments = rawAppointments.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    patientName: `${a.patient.firstName} ${a.patient.lastName}`,
    patientNumber: a.patient.patientNumber,
    patientPhone: a.patient.phone,
    chairName: a.chair.name,
    dentistName: a.dentist.displayName,
    appointmentTypeName: a.appointmentType.name,
    appointmentTypeColor: a.appointmentType.color,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status as any,
    confirmationStatus: a.confirmationStatus,
    notes: a.notes,
    cancellationReason: a.cancellationReason,
    history: a.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      changedAt: h.changedAt,
      changedByName: h.changer ? `${h.changer.firstName} ${h.changer.lastName}` : undefined,
    })),
  }));

  const formattedWaitingList = rawWaitingList.map((w) => ({
    id: w.id,
    patientId: w.patientId,
    patientName: `${w.patient.firstName} ${w.patient.lastName}`,
    patientPhone: w.patient.phone,
    patientNumber: w.patient.patientNumber,
    locationId: w.locationId,
    locationName: w.location.name,
    preferredDentistId: w.preferredDentistId,
    preferredDentistName: w.preferredDentist?.displayName,
    appointmentTypeId: w.appointmentTypeId,
    appointmentTypeName: w.appointmentType?.name,
    priority: w.priority as any,
    notes: w.notes,
    createdAt: w.createdAt,
  }));

  return (
    <CalendarClient
      organizationId={organizationId}
      initialDate={initialDate}
      locations={orgLocations}
      chairs={orgChairs}
      dentists={orgDentists}
      patients={orgPatients.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        patientNumber: p.patientNumber,
        phone: p.phone,
      }))}
      appointmentTypes={orgTypes}
      appointments={formattedAppointments}
      waitingList={formattedWaitingList}
    />
  );
}
