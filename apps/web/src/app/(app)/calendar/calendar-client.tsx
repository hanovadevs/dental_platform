'use client';

import React, { useState } from 'react';
import styles from './calendar.module.css';
import {
  MultiChairView,
  BookAppointmentDialog,
  AppointmentDetailDrawer,
  WaitingListDrawer,
  CalendarChair,
  AppointmentDetailData,
  BookingPatientOption,
  BookingLocationOption,
  BookingChairOption,
  BookingDentistOption,
  BookingTypeOption,
  WaitingListPatientItem,
} from '@/features/scheduling/components';
import { Button } from '@/components/ui';

interface CalendarClientProps {
  organizationId: string;
  initialDate: string;
  locations: BookingLocationOption[];
  chairs: BookingChairOption[];
  dentists: BookingDentistOption[];
  patients: BookingPatientOption[];
  appointmentTypes: BookingTypeOption[];
  appointments: AppointmentDetailData[];
  waitingList: WaitingListPatientItem[];
}

export function CalendarClient({
  organizationId,
  initialDate,
  locations,
  chairs,
  dentists,
  patients,
  appointmentTypes,
  appointments,
  waitingList,
}: CalendarClientProps) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0]?.id || '');
  const [selectedDentistId, setSelectedDentistId] = useState<string>('');

  // Modals & Drawers state
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [bookingChairId, setBookingChairId] = useState<string | undefined>(undefined);
  const [bookingTime, setBookingTime] = useState<string | undefined>(undefined);
  const [bookingPatientId, setBookingPatientId] = useState<string | undefined>(undefined);

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetailData | null>(null);
  const [waitingListOpen, setWaitingListOpen] = useState(false);

  // Date manipulation helpers
  const handlePrevDay = () => {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split('T')[0]!);
  };

  const handleNextDay = () => {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() + 1);
    setSelectedDate(current.toISOString().split('T')[0]!);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]!);
  };

  // Format date display
  const dateObj = new Date(`${selectedDate}T00:00:00`);
  const dateFormatted = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Filter chairs by selected location
  const filteredChairs: CalendarChair[] = chairs
    .filter((c) => !selectedLocationId || c.locationId === selectedLocationId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      locationName: locations.find((l) => l.id === c.locationId)?.name,
    }));

  // Filter appointments by dentist if dentist filter is chosen
  const filteredAppointments = appointments.filter((appt) => {
    if (selectedDentistId && appt.dentistName !== dentists.find((d) => d.id === selectedDentistId)?.displayName) {
      return false;
    }
    return true;
  });

  const handleSlotClick = (chairId: string, time: string) => {
    setBookingChairId(chairId);
    setBookingTime(time);
    setBookingPatientId(undefined);
    setBookDialogOpen(true);
  };

  const handleOpenBookModal = (prefillPatientId?: string) => {
    setBookingChairId(filteredChairs[0]?.id);
    setBookingTime('09:00');
    setBookingPatientId(prefillPatientId);
    setBookDialogOpen(true);
  };

  return (
    <div className={styles.container}>
      {/* Calendar Header */}
      <header className={styles.header}>
        {/* Date Navigator */}
        <div className={styles.dateNav}>
          <div className={styles.navButtons} role="group" aria-label="Date controls">
            <button type="button" className={styles.navButton} onClick={handlePrevDay} title="Previous Day">
              ◀
            </button>
            <button type="button" className={styles.navButton} onClick={handleToday}>
              Today
            </button>
            <button type="button" className={styles.navButton} onClick={handleNextDay} title="Next Day">
              ▶
            </button>
          </div>

          <h1 className={styles.dateHeadline}>{dateFormatted}</h1>

          <input
            type="date"
            className={styles.filterSelect}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Filters & Actions */}
        <div className={styles.actionsBar}>
          <div className={styles.filterControls}>
            {locations.length > 1 && (
              <select
                className={styles.filterSelect}
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}

            {dentists.length > 0 && (
              <select
                className={styles.filterSelect}
                value={selectedDentistId}
                onChange={(e) => setSelectedDentistId(e.target.value)}
              >
                <option value="">All Practitioners</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.displayName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button variant="secondary" onClick={() => setWaitingListOpen(true)}>
            Waiting List ({waitingList.length})
          </Button>

          <Button variant="primary" onClick={() => handleOpenBookModal()}>
            + Book Appointment
          </Button>
        </div>
      </header>

      {/* Multi-Chair Grid */}
      <MultiChairView
        chairs={filteredChairs}
        appointments={filteredAppointments}
        selectedDate={selectedDate}
        onSelectAppointment={(appt) => setSelectedAppointment(appt)}
        onSlotClick={handleSlotClick}
      />

      {/* Book Appointment Modal */}
      {bookDialogOpen && (
        <BookAppointmentDialog
          open={bookDialogOpen}
          onClose={() => setBookDialogOpen(false)}
          organizationId={organizationId}
          patients={patients}
          locations={locations}
          chairs={chairs}
          dentists={dentists}
          appointmentTypes={appointmentTypes}
          initialLocationId={selectedLocationId}
          initialChairId={bookingChairId}
          initialDate={selectedDate}
          initialTime={bookingTime}
          initialPatientId={bookingPatientId}
        />
      )}

      {/* Appointment Detail Drawer */}
      <AppointmentDetailDrawer
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        organizationId={organizationId}
        appointment={selectedAppointment}
      />

      {/* Waiting List Drawer */}
      <WaitingListDrawer
        open={waitingListOpen}
        onClose={() => setWaitingListOpen(false)}
        organizationId={organizationId}
        entries={waitingList}
        patients={patients}
        locations={locations}
        dentists={dentists}
        appointmentTypes={appointmentTypes}
        onBookPatient={(pId) => handleOpenBookModal(pId)}
      />
    </div>
  );
}
