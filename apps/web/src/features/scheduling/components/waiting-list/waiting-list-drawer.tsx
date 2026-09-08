'use client';

import React, { useState, useTransition } from 'react';
import { Drawer, Button, Input, Select, Badge, EmptyState } from '@/components/ui';
import { addToWaitingList } from '../../server/actions';
import { useRouter } from 'next/navigation';

export interface WaitingListPatientItem {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientNumber: string;
  locationId: string;
  locationName: string;
  preferredDentistId?: string | null;
  preferredDentistName?: string | null;
  appointmentTypeId?: string | null;
  appointmentTypeName?: string | null;
  priority: 'normal' | 'high' | 'urgent';
  notes?: string | null;
  createdAt: Date;
}

interface WaitingListDrawerProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  entries: WaitingListPatientItem[];
  patients: { id: string; name: string; patientNumber: string }[];
  locations: { id: string; name: string }[];
  dentists: { id: string; displayName: string }[];
  appointmentTypes: { id: string; name: string }[];
  onBookPatient: (patientId: string) => void;
}

export function WaitingListDrawer({
  open,
  onClose,
  organizationId,
  entries,
  patients,
  locations,
  dentists,
  appointmentTypes,
  onBookPatient,
}: WaitingListDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [addMode, setAddMode] = useState(false);
  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [preferredDentistId, setPreferredDentistId] = useState('');
  const [appointmentTypeId, setAppointmentTypeId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('locationId', locationId);
    if (preferredDentistId) formData.append('preferredDentistId', preferredDentistId);
    if (appointmentTypeId) formData.append('appointmentTypeId', appointmentTypeId);
    formData.append('priority', priority);
    if (notes) formData.append('notes', notes);

    startTransition(async () => {
      const res = await addToWaitingList(organizationId, formData);
      if (res.success) {
        setAddMode(false);
        setNotes('');
        router.refresh();
      } else {
        setErrorMsg(res.error?.message || 'Failed to add to waiting list.');
      }
    });
  };

  const getPriorityVariant = (pri: string) => {
    switch (pri) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Cancellation Waiting List (ChairFill)"
      description="Patients waiting for earliest open chair slot or short-notice cancellation."
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {!addMode ? (
          <Button variant="secondary" onClick={() => setAddMode(true)}>
            + Add Patient to Waiting List
          </Button>
        ) : (
          <form
            onSubmit={handleAddSubmit}
            style={{
              padding: 'var(--space-4)',
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Add Patient to Waiting List
            </h4>

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

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Patient *
              </label>
              <Select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                options={patients.map((p) => ({
                  value: p.id,
                  label: `${p.name} (#${p.patientNumber})`,
                }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Branch Location *
                </label>
                <Select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  options={locations.map((l) => ({
                    value: l.id,
                    label: l.name,
                  }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Priority Level
                </label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'high', label: 'High Priority' },
                    { value: 'urgent', label: 'Urgent (Pain/Emergency)' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Availability Notes
              </label>
              <Input
                placeholder="e.g. Free after 2 PM on weekdays, can arrive with 30m notice..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setAddMode(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                {isPending ? 'Saving...' : 'Add to List'}
              </Button>
            </div>
          </form>
        )}

        {/* Entries List */}
        {entries.length === 0 ? (
          <EmptyState
            title="Waiting list is empty"
            description="When patients request short-notice or earlier appointments, add them here to fill cancellations automatically."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {entries.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--surface-base)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.patientName}
                    </span>
                    <Badge variant={getPriorityVariant(item.priority)}>
                      {item.priority}
                    </Badge>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    #{item.patientNumber} • {item.patientPhone} • {item.locationName}
                  </div>

                  {item.notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {item.notes}
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onBookPatient(item.patientId);
                  }}
                >
                  Book Slot
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
