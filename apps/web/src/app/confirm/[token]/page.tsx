import React from 'react';
import { confirmAppointmentByToken } from '@/features/communications/server/actions';
import { formatDate } from '@/lib/utils';
import styles from './confirm.module.css';

interface ConfirmPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ConfirmAppointmentPage({ params }: ConfirmPageProps) {
  const { token } = await params;
  const result = await confirmAppointmentByToken(token);

  if (!result.success || !result.data) {
    return (
      <main className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>✕</div>
          <h1 className={styles.title}>Unable to Confirm</h1>
          <p className={styles.subtitle}>
            {result.error?.message ||
              'This confirmation link is invalid or has expired. Please contact the clinic directly.'}
          </p>
        </div>
      </main>
    );
  }

  const { clinicName, appointmentTime } = result.data;
  const formattedDate = formatDate(appointmentTime);
  const formattedTime = new Date(appointmentTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.successIcon}>✓</div>
        <h1 className={styles.title}>Appointment Confirmed!</h1>
        <p className={styles.subtitle}>
          Thank you for confirming your upcoming dental visit with <strong>{clinicName}</strong>.
        </p>

        <div className={styles.detailsBox}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Date:</span>
            <span className={styles.detailValue}>{formattedDate}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Time:</span>
            <span className={styles.detailValue}>{formattedTime}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Clinic:</span>
            <span className={styles.detailValue}>{clinicName}</span>
          </div>
        </div>

        <div className={styles.instructions}>
          <h3>Arrival Instructions</h3>
          <p>
            Please arrive 10 minutes prior to your scheduled time. If you need to reschedule or have questions, please call our clinic.
          </p>
        </div>
      </div>
    </main>
  );
}
