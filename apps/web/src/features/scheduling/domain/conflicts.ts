/**
 * Pure domain logic for appointment intervals, time slot math, and conflict detection.
 * Per spec (09_TESTING_AND_QA.md Section 5 - Appointment Tests).
 */

export interface AppointmentSlotCheck {
  id: string;
  chairId: string;
  dentistId: string;
  startAt: Date;
  endAt: Date;
  status: string;
}

/**
 * Returns true if two half-open intervals [startA, endA) and [startB, endB) overlap in time.
 */
export function hasTimeOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

/**
 * Checks if a proposed appointment conflicts with any existing appointment on the same chair.
 * Cancelled and No-Show appointments do NOT produce conflicts.
 */
export function findChairConflict(
  existing: AppointmentSlotCheck[],
  chairId: string,
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string
): AppointmentSlotCheck | undefined {
  return existing.find((appt) => {
    if (excludeAppointmentId && appt.id === excludeAppointmentId) return false;
    if (appt.chairId !== chairId) return false;
    if (appt.status === 'cancelled' || appt.status === 'no_show') return false;
    return hasTimeOverlap(startAt, endAt, appt.startAt, appt.endAt);
  });
}

/**
 * Checks if a proposed appointment conflicts with the assigned dentist's existing schedule.
 * A practitioner cannot be with two patients at once.
 */
export function findDentistConflict(
  existing: AppointmentSlotCheck[],
  dentistId: string,
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string
): AppointmentSlotCheck | undefined {
  return existing.find((appt) => {
    if (excludeAppointmentId && appt.id === excludeAppointmentId) return false;
    if (appt.dentistId !== dentistId) return false;
    if (appt.status === 'cancelled' || appt.status === 'no_show') return false;
    return hasTimeOverlap(startAt, endAt, appt.startAt, appt.endAt);
  });
}

/**
 * Calculates end date based on start date and duration in minutes.
 */
export function calculateEndTime(startAt: Date, durationMinutes: number): Date {
  return new Date(startAt.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Generates an array of time slot strings in "HH:MM" format between startHour and endHour.
 */
export function generateTimeSlots(
  startHour = 8,
  endHour = 20,
  stepMinutes = 30
): string[] {
  const slots: string[] = [];
  const totalMinutes = (endHour - startHour) * 60;

  for (let m = 0; m < totalMinutes; m += stepMinutes) {
    const hour = Math.floor(m / 60) + startHour;
    const min = m % 60;
    const hh = hour.toString().padStart(2, '0');
    const mm = min.toString().padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }

  return slots;
}
