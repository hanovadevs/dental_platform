'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Drawer, Button, Dialog, Input, Badge } from '@/components/ui';
import { AppointmentStatus, APPOINTMENT_STATUS_CATALOG } from '../../domain/types';
import { transitionAppointmentStatus } from '../../server/actions';
import { useRouter } from 'next/navigation';

export interface AppointmentDetailData {
  id: string;
  patientId: string;
  patientName: string;
  patientNumber: string;
  patientPhone: string;
  chairName: string;
  dentistName: string;
  appointmentTypeName: string;
  appointmentTypeColor: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  confirmationStatus: string;
  notes?: string | null;
  cancellationReason?: string | null;
  history?: {
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    reason?: string | null;
    changedAt: Date;
    changedByName?: string;
  }[];
}

interface AppointmentDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  appointment: AppointmentDetailData | null;
}

export function AppointmentDetailDrawer({
  open,
  onClose,
  organizationId,
  appointment,
}: AppointmentDetailDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!appointment) return null;

  const statusMeta = APPOINTMENT_STATUS_CATALOG[appointment.status] || APPOINTMENT_STATUS_CATALOG.scheduled;

  const handleStatusChange = (newStatus: AppointmentStatus, reason?: string) => {
    setErrorMsg(null);
    const formData = new FormData();
    formData.append('targetStatus', newStatus);
    if (reason) formData.append('reason', reason);

    startTransition(async () => {
      const res = await transitionAppointmentStatus(organizationId, appointment.id, formData);
      if (res.success) {
        setCancelModalOpen(false);
        router.refresh();
      } else {
        setErrorMsg(res.error?.message || 'Failed to update appointment status.');
      }
    });
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellationReason.trim()) {
      setErrorMsg('Please specify a cancellation reason.');
      return;
    }
    handleStatusChange('cancelled', cancellationReason);
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Appointment Overview"
        description={`${appointment.chairName} • ${new Date(appointment.startAt).toLocaleDateString()}`}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {errorMsg && (
            <div
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--color-danger, #dc2626)',
                fontSize: '0.8125rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* SECTION 1: Patient Header Card */}
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <Link
                href={`/patients/${appointment.patientId}`}
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--primary-600, #0284c7)',
                  textDecoration: 'none',
                }}
              >
                {appointment.patientName}
              </Link>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                #{appointment.patientNumber} • {appointment.patientPhone}
              </div>
            </div>

            <span
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: statusMeta.color,
                backgroundColor: statusMeta.bg,
                border: `1px solid ${statusMeta.borderColor}`,
              }}
            >
              {statusMeta.label}
            </span>
          </div>

          {/* SECTION 2: Session Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                Procedure / Type
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    backgroundColor: appointment.appointmentTypeColor || '#0284c7',
                  }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {appointment.appointmentTypeName}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                Treating Dentist
              </span>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                Dr. {appointment.dentistName}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                Scheduled Time
              </span>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {new Date(appointment.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                {new Date(appointment.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                Operatory Chair
              </span>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                {appointment.chairName}
              </div>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                Visit Notes
              </span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Cancellation Reason if cancelled */}
          {appointment.status === 'cancelled' && appointment.cancellationReason && (
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Cancellation Reason:
              </span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {appointment.cancellationReason}
              </p>
            </div>
          )}

          {/* SECTION 3: Status Progression Bar */}
          <section>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
              Clinic Status Progression
            </h4>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {appointment.status === 'scheduled' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStatusChange('confirmed')}
                    disabled={isPending}
                  >
                    ✓ Confirm Booking
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange('checked_in')}
                    disabled={isPending}
                  >
                    Check In Patient
                  </Button>
                </>
              )}

              {appointment.status === 'confirmed' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusChange('checked_in')}
                  disabled={isPending}
                >
                  Check In Patient (Arrived)
                </Button>
              )}

              {appointment.status === 'checked_in' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusChange('in_chair')}
                  disabled={isPending}
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  Seat in Operatory Chair
                </Button>
              )}

              {appointment.status === 'in_chair' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isPending}
                  style={{ backgroundColor: '#16a34a' }}
                >
                  Complete Treatment Session
                </Button>
              )}

              {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStatusChange('no_show', 'Patient did not arrive')}
                    disabled={isPending}
                    style={{ color: 'var(--color-danger, #dc2626)' }}
                  >
                    Mark No-Show
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCancelModalOpen(true)}
                    disabled={isPending}
                    style={{ color: 'var(--color-danger, #dc2626)' }}
                  >
                    Cancel Appointment...
                  </Button>
                </>
              )}
            </div>
          </section>

          {/* SECTION 4: Status History Audit Trail */}
          {appointment.history && appointment.history.length > 0 && (
            <section>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
                Status History & Audit
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {appointment.history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-sunken)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(h.changedAt).toLocaleDateString()} at{' '}
                        {new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {h.reason && (
                      <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Reason: {h.reason}
                      </p>
                    )}
                    {h.changedByName && (
                      <div style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        By {h.changedByName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </Drawer>

      {/* Cancellation Reason Modal */}
      <Dialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Appointment"
        description="Every cancellation requires an audit reason to track clinic churn and enable ChairFill replacement."
        size="sm"
      >
        <form onSubmit={handleConfirmCancel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Reason for Cancellation *
            </label>
            <Input
              required
              placeholder="e.g. Patient called with flu, requested next week reschedule..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="secondary" onClick={() => setCancelModalOpen(false)} disabled={isPending}>
              Back
            </Button>
            <Button type="submit" variant="danger" disabled={isPending}>
              {isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
