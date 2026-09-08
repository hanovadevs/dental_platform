'use client';

import React from 'react';
import styles from './multi-chair-view.module.css';
import { AppointmentDetailData } from '../dialogs/appointment-detail-drawer';
import { generateTimeSlots } from '../../domain/conflicts';
import { APPOINTMENT_STATUS_CATALOG } from '../../domain/types';

export interface CalendarChair {
  id: string;
  name: string;
  locationName?: string;
}

interface MultiChairViewProps {
  chairs: CalendarChair[];
  appointments: AppointmentDetailData[];
  selectedDate: string; // YYYY-MM-DD
  onSelectAppointment: (appointment: AppointmentDetailData) => void;
  onSlotClick: (chairId: string, time: string) => void;
}

export function MultiChairView({
  chairs,
  appointments,
  selectedDate,
  onSelectAppointment,
  onSlotClick,
}: MultiChairViewProps) {
  const startHour = 8;
  const endHour = 20;
  const slotStep = 30; // 30 mins per slot
  const slotHeight = 50; // px

  const timeSlots = generateTimeSlots(startHour, endHour, slotStep);

  // Group appointments by chair
  const getAppointmentsForChair = (chairId: string) => {
    return appointments.filter((appt) => {
      // Compare dates
      const apptDate = new Date(appt.startAt).toISOString().split('T')[0];
      return apptDate === selectedDate && appt.status !== 'cancelled';
    });
  };

  // Compute position and dimensions for an appointment
  const computePosition = (startAt: Date, endAt: Date) => {
    const startObj = new Date(startAt);
    const endObj = new Date(endAt);

    const startMinutes = (startObj.getHours() - startHour) * 60 + startObj.getMinutes();
    const durationMinutes = Math.max(
      15,
      (endObj.getTime() - startObj.getTime()) / (60 * 1000)
    );

    const top = (startMinutes / slotStep) * slotHeight;
    const height = (durationMinutes / slotStep) * slotHeight - 4; // leave slight gap

    return { top: Math.max(0, top), height: Math.max(24, height) };
  };

  if (chairs.length === 0) {
    return (
      <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>No dental chairs configured for this branch location.</p>
        <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
          Add operatory chairs in Operations → Chairs to begin scheduling.
        </p>
      </div>
    );
  }

  const columnWidthStyle = {
    gridTemplateColumns: `repeat(${chairs.length}, minmax(180px, 1fr))`,
  };

  return (
    <div className={styles.calendarWrapper}>
      {/* Chair Column Headers */}
      <div
        className={styles.chairHeaderRow}
        style={{
          display: 'grid',
          gridTemplateColumns: `70px repeat(${chairs.length}, minmax(180px, 1fr))`,
        }}
      >
        <div className={styles.timeGutterHeader}>Time</div>
        {chairs.map((chair) => (
          <div key={chair.id} className={styles.chairHeaderCell}>
            <span className={styles.chairName}>{chair.name}</span>
            {chair.locationName && (
              <span className={styles.chairMeta}>{chair.locationName}</span>
            )}
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className={styles.gridBody}>
        {/* Time Gutter Column */}
        <div className={styles.timeGutterColumn}>
          {timeSlots.map((time) => (
            <div key={time} className={styles.timeGutterSlot}>
              {time}
            </div>
          ))}
        </div>

        {/* Chairs Columns Grid */}
        <div className={styles.chairsColumnsContainer} style={columnWidthStyle}>
          {chairs.map((chair) => {
            const chairAppts = getAppointmentsForChair(chair.id);

            return (
              <div key={chair.id} className={styles.chairColumn}>
                {/* Background Clickable Time Slots */}
                {timeSlots.map((time) => (
                  <div
                    key={time}
                    className={styles.gridSlotCell}
                    onClick={() => onSlotClick(chair.id, time)}
                    title={`Click to book on ${chair.name} at ${time}`}
                  />
                ))}

                {/* Overlaid Appointment Cards */}
                {chairAppts.map((appt) => {
                  const { top, height } = computePosition(appt.startAt, appt.endAt);
                  const statusMeta = APPOINTMENT_STATUS_CATALOG[appt.status] || APPOINTMENT_STATUS_CATALOG.scheduled;

                  return (
                    <div
                      key={appt.id}
                      className={styles.appointmentCard}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAppointment(appt);
                      }}
                    >
                      <span
                        className={styles.statusIndicator}
                        style={{ backgroundColor: statusMeta.color }}
                      />

                      <div className={styles.cardHeader}>
                        <span className={styles.cardPatientName}>{appt.patientName}</span>
                        <span className={styles.cardTime}>
                          {new Date(appt.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className={styles.cardDetails}>
                        {appt.appointmentTypeName} • Dr. {appt.dentistName}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
