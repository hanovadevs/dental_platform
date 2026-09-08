'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Dialog } from '@/components/ui';
import {
  createStaffMember,
  createChair,
  setStaffAvailability,
} from '@/features/staff/server/actions';

interface LocationOption {
  id: string;
  name: string;
}

interface RoleOption {
  id: string;
  name: string;
}

interface StaffOption {
  id: string;
  displayName: string;
  isDentist?: boolean;
}

export function AddStaffDialog({
  organizationId,
  roles,
  locations,
}: {
  organizationId: string;
  roles: RoleOption[];
  locations: LocationOption[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDentist, setIsDentist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set('isDentist', isDentist ? 'true' : 'false');
    const res = await createStaffMember(organizationId, formData);
    setLoading(false);

    if (res.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error?.message || 'Failed to add staff member');
      if (res.error?.fields) setFieldErrors(res.error.fields);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Staff Member</Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Invite Practice Staff Member"
        description="Add a dentist, receptionist, dental assistant, or practice manager."
        size="md"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            <Input label="First Name" name="firstName" required placeholder="e.g. Dr. Bilal" error={fieldErrors.firstName?.[0]} />
            <Input label="Last Name" name="lastName" required placeholder="e.g. Tariq" error={fieldErrors.lastName?.[0]} />
          </div>

          <Input label="Work Email" name="email" type="email" required placeholder="staff@clinic.com" error={fieldErrors.email?.[0]} />
          <Input label="Phone" name="phone" type="tel" placeholder="+92 300 1234567" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            <Input label="Job Title" name="jobTitle" required placeholder="e.g. Associate Dentist" error={fieldErrors.jobTitle?.[0]} />
            <Select
              label="Assigned Role"
              name="roleId"
              required
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              onChange={(e) => {
                const selected = roles.find((r) => r.id === e.target.value);
                if (selected?.name.toLowerCase().includes('dentist')) {
                  setIsDentist(true);
                }
              }}
            />
          </div>

          <Select
            label="Assigned Branch Location"
            name="locationId"
            required
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input
              type="checkbox"
              id="isDentistCheckbox"
              checked={isDentist}
              onChange={(e) => setIsDentist(e.target.checked)}
            />
            <label htmlFor="isDentistCheckbox" style={{ font: 'var(--text-label)', cursor: 'pointer' }}>
              Practitioner profile (licensed dentist)
            </label>
          </div>

          {isDentist && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-canvas)', borderRadius: 'var(--radius-input)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Input label="License Number" name="licenseNumber" placeholder="e.g. PMDC-12345-D" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                <Input label="Clinical Specialty" name="specialty" defaultValue="General Dentistry" />
                <Input label="Default Slot (min)" name="defaultAppointmentDuration" type="number" defaultValue="30" />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Staff</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function AddChairDialog({
  organizationId,
  locations,
}: {
  organizationId: string;
  locations: LocationOption[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await createChair(organizationId, formData);
    setLoading(false);
    if (res.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error?.message || 'Failed to add chair');
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>+ Add Operatory Chair</Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add Operating Chair"
        description="Register a dental operatory chair for scheduling appointments."
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

          <Select
            label="Location"
            name="locationId"
            required
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />
          <Input label="Chair / Operatory Name" name="name" required placeholder="e.g. Operatory 1 (A-Dec)" />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Chair</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function AvailabilityDialog({
  organizationId,
  staffList,
  locations,
}: {
  organizationId: string;
  staffList: StaffOption[];
  locations: LocationOption[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(staffList[0]?.id || '');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState('1'); // Monday
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const slot = {
      locationId,
      dayOfWeek: parseInt(dayOfWeek, 10),
      startTime,
      endTime,
      active: true,
    };
    const res = await setStaffAvailability(organizationId, selectedStaff, [slot]);
    setLoading(false);
    if (res.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error?.message || 'Failed to save working hours');
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Configure Working Hours
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Practitioner Weekly Schedule"
        description="Configure weekly recurring chair availability hours for scheduling."
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

          <Select
            label="Staff Practitioner"
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            options={staffList.map((s) => ({ value: s.id, label: s.displayName }))}
          />

          <Select
            label="Branch Location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />

          <Select
            label="Day of Week"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            options={[
              { value: '1', label: 'Monday' },
              { value: '2', label: 'Tuesday' },
              { value: '3', label: 'Wednesday' },
              { value: '4', label: 'Thursday' },
              { value: '5', label: 'Friday' },
              { value: '6', label: 'Saturday' },
              { value: '0', label: 'Sunday' },
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            <Input
              label="Shift Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="Shift End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Hours</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
