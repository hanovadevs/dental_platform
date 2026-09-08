'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Dialog } from '@/components/ui';
import {
  updatePatient,
  archivePatient,
  addMedicalAlert,
  resolveMedicalAlert,
  addAllergy,
  removeAllergy,
} from '@/features/patients/server/actions';

interface LocationOption {
  id: string;
  name: string;
}

interface DentistOption {
  id: string;
  displayName: string;
}

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  primaryLocationId: string;
  primaryDentistId: string | null;
  preferredLanguage: string | null;
  preferredContactMethod: string | null;
  leadSource: string | null;
  status: string;
  address: string | null;
  notes: string | null;
}

export function PatientActions({
  organizationId,
  patient,
  locations,
  dentists,
}: {
  organizationId: string;
  patient: PatientData;
  locations: LocationOption[];
  dentists: DentistOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await updatePatient(organizationId, patient.id, formData);
    setLoading(false);
    if (res.success) {
      setEditOpen(false);
      router.refresh();
    } else {
      setError(res.error?.message || 'Failed to update patient');
    }
  };

  const handleArchiveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const reason = formData.get('reason') as string;
    const res = await archivePatient(organizationId, patient.id, reason);
    setLoading(false);
    if (res.success) {
      setArchiveOpen(false);
      router.push('/patients');
    } else {
      setError(res.error?.message || 'Failed to archive patient');
    }
  };

  const handleAddAlertSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await addMedicalAlert(organizationId, patient.id, formData);
    setLoading(false);
    if (res.success) {
      setAlertOpen(false);
      router.refresh();
    } else {
      setError(res.error?.message || 'Failed to add medical alert');
    }
  };

  const handleAddAllergySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await addAllergy(organizationId, patient.id, formData);
    setLoading(false);
    if (res.success) {
      setAllergyOpen(false);
      router.refresh();
    } else {
      setError(res.error?.message || 'Failed to add allergy');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="secondary" size="sm" onClick={() => setAlertOpen(true)}>
          + Medical Alert
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setAllergyOpen(true)}>
          + Allergy
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          Edit Details
        </Button>
        {patient.status !== 'archived' && (
          <Button variant="ghost" size="sm" onClick={() => setArchiveOpen(true)} style={{ color: 'var(--color-danger)' }}>
            Archive
          </Button>
        )}
      </div>

      {/* Edit Demographics Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Patient Record"
        description="Update demographics, contact methods, or status."
        size="lg"
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            <Input label="First Name" name="firstName" defaultValue={patient.firstName} required />
            <Input label="Last Name" name="lastName" defaultValue={patient.lastName} required />
            <Input label="Phone" name="phone" defaultValue={patient.phone} required />
            <Input label="Email" name="email" type="email" defaultValue={patient.email || ''} />
            <Input label="Date of Birth" name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth || ''} />
            <Select
              label="Status"
              name="status"
              defaultValue={patient.status}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'recall_due', label: 'Recall Due' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <Select
              label="Primary Location"
              name="primaryLocationId"
              defaultValue={patient.primaryLocationId}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
            />
            <Select
              label="Primary Dentist"
              name="primaryDentistId"
              defaultValue={patient.primaryDentistId || ''}
              options={[
                { value: '', label: 'Unassigned' },
                ...dentists.map((d) => ({ value: d.id, label: d.displayName })),
              ]}
            />
          </div>

          <Input label="Residential Address" name="address" defaultValue={patient.address || ''} />
          <Input label="Administrative Notes" name="notes" defaultValue={patient.notes || ''} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </div>
        </form>
      </Dialog>

      {/* Add Medical Alert Dialog */}
      <Dialog
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Record Clinical Medical Alert"
        description="Alert clinical staff to medical conditions, premedication requirements, or bleeding risks."
      >
        <form onSubmit={handleAddAlertSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

          <Input label="Alert Condition / Description" name="label" required placeholder="e.g. Heart Valve Replacement, INR Elevated" />
          <Select
            label="Category"
            name="type"
            defaultValue="medical_condition"
            options={[
              { value: 'medical_condition', label: 'Medical Condition' },
              { value: 'premedication', label: 'Premedication Required' },
              { value: 'bleeding_disorder', label: 'Bleeding Disorder / Anticoagulants' },
              { value: 'infectious_disease', label: 'Infectious Disease' },
              { value: 'other', label: 'Other Clinical Alert' },
            ]}
          />
          <Select
            label="Severity Level"
            name="severity"
            defaultValue="high"
            options={[
              { value: 'critical', label: 'Critical (Red Warning)' },
              { value: 'high', label: 'High (Amber Warning)' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button type="button" variant="ghost" onClick={() => setAlertOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Alert</Button>
          </div>
        </form>
      </Dialog>

      {/* Add Allergy Dialog */}
      <Dialog
        open={allergyOpen}
        onClose={() => setAllergyOpen(false)}
        title="Record Known Allergy"
        description="Substances causing adverse drug or material reactions."
      >
        <form onSubmit={handleAddAllergySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}

          <Input label="Allergen / Substance" name="substance" required placeholder="e.g. Penicillin, Latex, Ibuprofen" />
          <Input label="Specific Reaction" name="reaction" placeholder="e.g. Anaphylaxis, Rash, Urticaria" />
          <Select
            label="Severity"
            name="severity"
            defaultValue="high"
            options={[
              { value: 'critical', label: 'Critical (Anaphylaxis/Severe)' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low / Mild' },
            ]}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button type="button" variant="ghost" onClick={() => setAllergyOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Record Allergy</Button>
          </div>
        </form>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Archive Patient Record"
        description="Soft delete: this patient will be removed from active lists but all historical records are preserved."
      >
        <form onSubmit={handleArchiveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input label="Reason for Archiving" name="reason" placeholder="e.g. Patient moved to another city" required />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button type="button" variant="ghost" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={loading}>Archive Patient</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function ResolveAlertButton({ organizationId, alertId }: { organizationId: string; alertId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResolve = async () => {
    setLoading(true);
    await resolveMedicalAlert(organizationId, alertId);
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleResolve} loading={loading}>
      Mark Resolved
    </Button>
  );
}

export function RemoveAllergyButton({ organizationId, allergyId }: { organizationId: string; allergyId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRemove = async () => {
    setLoading(true);
    await removeAllergy(organizationId, allergyId);
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleRemove} loading={loading} style={{ color: 'var(--color-danger)' }}>
      Remove
    </Button>
  );
}
