'use client';

import React, { useState, useTransition } from 'react';
import { Dialog, Button, Input, Select } from '@/components/ui';
import { createAppointment } from '../../server/actions';
import { useRouter } from 'next/navigation';

export interface BookingPatientOption {
  id: string;
  name: string;
  patientNumber: string;
  phone: string;
}

export interface BookingLocationOption {
  id: string;
  name: string;
}

export interface BookingChairOption {
  id: string;
  name: string;
  locationId: string;
}

export interface BookingDentistOption {
  id: string;
  displayName: string;
}

export interface BookingTypeOption {
  id: string;
  name: string;
  durationMinutes: number;
  color: string;
}

interface BookAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  patients: BookingPatientOption[];
  locations: BookingLocationOption[];
  chairs: BookingChairOption[];
  dentists: BookingDentistOption[];
  appointmentTypes: BookingTypeOption[];
  initialLocationId?: string;
  initialChairId?: string;
  initialDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:MM
  initialPatientId?: string;
}

export function BookAppointmentDialog({
  open,
  onClose,
  organizationId,
  patients,
  locations,
  chairs,
  dentists,
  appointmentTypes,
  initialLocationId,
  initialChairId,
  initialDate,
  initialTime,
  initialPatientId,
}: BookAppointmentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [patientId, setPatientId] = useState<string>(initialPatientId || patients[0]?.id || '');
  const [locationId, setLocationId] = useState<string>(initialLocationId || locations[0]?.id || '');
  const [chairId, setChairId] = useState<string>(initialChairId || chairs[0]?.id || '');
  const [dentistId, setDentistId] = useState<string>(dentists[0]?.id || '');
  const [typeId, setTypeId] = useState<string>(appointmentTypes[0]?.id || '');

  const todayStr = new Date().toISOString().split('T')[0]!;
  const [date, setDate] = useState<string>(initialDate || todayStr);
  const [time, setTime] = useState<string>(initialTime || '09:00');
  const [duration, setDuration] = useState<number>(appointmentTypes[0]?.durationMinutes || 30);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When type changes, auto-populate duration
  const handleTypeChange = (newTypeId: string) => {
    setTypeId(newTypeId);
    const selected = appointmentTypes.find((t) => t.id === newTypeId);
    if (selected) {
      setDuration(selected.durationMinutes);
    }
  };

  // Filter chairs by selected location
  const availableChairs = chairs.filter((c) => c.locationId === locationId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const startDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(startDateTime.getTime())) {
      setErrorMsg('Please select a valid date and time.');
      return;
    }

    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('locationId', locationId);
    formData.append('chairId', chairId || availableChairs[0]?.id || '');
    formData.append('dentistId', dentistId);
    formData.append('appointmentTypeId', typeId);
    formData.append('startAt', startDateTime.toISOString());
    formData.append('durationMinutes', duration.toString());
    if (notes) formData.append('notes', notes);

    startTransition(async () => {
      const res = await createAppointment(organizationId, formData);
      if (res.success) {
        onClose();
        setNotes('');
        router.refresh();
      } else {
        setErrorMsg(res.error?.message || 'Failed to book appointment.');
      }
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Book Dental Appointment"
      description="Schedule an operatory chair session for a patient."
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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

        {/* Patient Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Patient *
          </label>
          <Select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            options={patients.map((p) => ({
              value: p.id,
              label: `${p.name} (#${p.patientNumber}) — ${p.phone}`,
            }))}
          />
        </div>

        {/* Location & Chair Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Clinic Branch *
            </label>
            <Select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                const nextChairs = chairs.filter((c) => c.locationId === e.target.value);
                if (nextChairs[0]) setChairId(nextChairs[0].id);
              }}
              options={locations.map((l) => ({
                value: l.id,
                label: l.name,
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Operatory Chair *
            </label>
            <Select
              value={chairId}
              onChange={(e) => setChairId(e.target.value)}
              options={availableChairs.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </div>
        </div>

        {/* Practitioner & Appointment Type Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Treating Dentist *
            </label>
            <Select
              value={dentistId}
              onChange={(e) => setDentistId(e.target.value)}
              options={dentists.map((d) => ({
                value: d.id,
                label: d.displayName,
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Appointment Type *
            </label>
            <Select
              value={typeId}
              onChange={(e) => handleTypeChange(e.target.value)}
              options={appointmentTypes.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.durationMinutes}m)`,
              }))}
            />
          </div>
        </div>

        {/* Date, Time & Duration Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Date *
            </label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Start Time *
            </label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Duration (mins)
            </label>
            <Input
              type="number"
              min={10}
              max={360}
              step={5}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
            />
          </div>
        </div>

        {/* Clinical / Reception Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Notes / Reason for Visit
          </label>
          <Input
            placeholder="e.g. Follow-up after root canal stage 1, check sensitivity..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Checking Conflicts & Booking...' : 'Confirm Booking'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
