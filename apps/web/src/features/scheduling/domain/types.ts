/**
 * Scheduling Domain Types and Metadata.
 * Per spec (05_DATA_MODEL_AND_DOMAIN.md Section 7, 06_UI_UX_DESIGN_SYSTEM.md Section 14).
 */

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_chair'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ConfirmationStatus =
  | 'unconfirmed'
  | 'confirmed_patient'
  | 'confirmed_clinic'
  | 'reminder_sent';

export type AppointmentSource =
  | 'reception'
  | 'online'
  | 'call'
  | 'recall'
  | 'chair_fill';

export interface StatusMeta {
  status: AppointmentStatus;
  label: string;
  color: string;
  bg: string;
  borderColor: string;
}

export const APPOINTMENT_STATUS_CATALOG: Record<AppointmentStatus, StatusMeta> = {
  scheduled: {
    status: 'scheduled',
    label: 'Scheduled',
    color: '#0284c7', // primary blue
    bg: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284c7',
  },
  confirmed: {
    status: 'confirmed',
    label: 'Confirmed',
    color: '#0891b2', // teal / cyan
    bg: 'rgba(8, 145, 178, 0.1)',
    borderColor: '#0891b2',
  },
  checked_in: {
    status: 'checked_in',
    label: 'Checked In',
    color: '#d97706', // amber
    bg: 'rgba(217, 119, 6, 0.12)',
    borderColor: '#d97706',
  },
  in_chair: {
    status: 'in_chair',
    label: 'In Chair',
    color: '#7c3aed', // purple
    bg: 'rgba(124, 58, 237, 0.12)',
    borderColor: '#7c3aed',
  },
  completed: {
    status: 'completed',
    label: 'Completed',
    color: '#16a34a', // green
    bg: 'rgba(22, 163, 74, 0.12)',
    borderColor: '#16a34a',
  },
  cancelled: {
    status: 'cancelled',
    label: 'Cancelled',
    color: '#64748b', // slate
    bg: 'rgba(100, 116, 139, 0.12)',
    borderColor: '#94a3b8',
  },
  no_show: {
    status: 'no_show',
    label: 'No Show',
    color: '#dc2626', // red
    bg: 'rgba(220, 38, 38, 0.12)',
    borderColor: '#dc2626',
  },
};

export const DEFAULT_APPOINTMENT_TYPES = [
  { name: 'Consultation & Exam', durationMinutes: 30, color: '#0284c7' },
  { name: 'Scaling & Polishing', durationMinutes: 45, color: '#16a34a' },
  { name: 'Composite Restoration', durationMinutes: 45, color: '#2563eb' },
  { name: 'Root Canal Treatment', durationMinutes: 60, color: '#7c3aed' },
  { name: 'Crown Preparation', durationMinutes: 60, color: '#d97706' },
  { name: 'Extraction', durationMinutes: 30, color: '#ea580c' },
  { name: 'Emergency / Toothache', durationMinutes: 30, color: '#dc2626' },
];
