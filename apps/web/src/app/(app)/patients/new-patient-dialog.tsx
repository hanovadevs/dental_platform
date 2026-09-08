'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Dialog } from '@/components/ui';
import { createPatient } from '@/features/patients/server/actions';

interface LocationOption {
  id: string;
  name: string;
}

interface DentistOption {
  id: string;
  displayName: string;
}

interface NewPatientDialogProps {
  organizationId: string;
  locations: LocationOption[];
  dentists: DentistOption[];
}

export function NewPatientDialog({
  organizationId,
  locations,
  dentists,
}: NewPatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const result = await createPatient(organizationId, formData);

    setLoading(false);

    if (result.success && result.data) {
      setOpen(false);
      router.push(`/patients/${result.data.patientId}`);
    } else {
      setError(result.error?.message || 'Failed to create patient.');
      if (result.error?.fields) {
        setFieldErrors(result.error.fields);
      }
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        + New Patient
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Register New Patient"
        description="Add a canonical patient profile with contact info, clinical assignment, and medical flags."
        size="lg"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {error && (
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'var(--color-danger-light)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-input)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Section 1: Demographics */}
          <div>
            <h3 style={{ font: 'var(--text-card-title)', marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)' }}>
              1. Patient Demographics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
              <Input
                label="First Name"
                name="firstName"
                required
                placeholder="e.g. Sara"
                error={fieldErrors.firstName?.[0]}
              />
              <Input
                label="Last Name"
                name="lastName"
                required
                placeholder="e.g. Khan"
                error={fieldErrors.lastName?.[0]}
              />
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                required
                placeholder="+92 300 1234567"
                error={fieldErrors.phone?.[0]}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="patient@example.com"
                error={fieldErrors.email?.[0]}
              />
              <Input
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                error={fieldErrors.dateOfBirth?.[0]}
              />
              <Select
                label="Gender"
                name="gender"
                placeholder="Select gender"
                options={[
                  { value: 'Female', label: 'Female' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>
          </div>

          {/* Section 2: Clinical Care Assignment */}
          <div>
            <h3 style={{ font: 'var(--text-card-title)', marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)' }}>
              2. Clinic Assignment
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
              <Select
                label="Primary Clinic Location"
                name="primaryLocationId"
                required
                defaultValue={locations[0]?.id || ''}
                options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
                error={fieldErrors.primaryLocationId?.[0]}
              />
              <Select
                label="Primary Dentist"
                name="primaryDentistId"
                placeholder="Unassigned"
                options={dentists.map((d) => ({ value: d.id, label: d.displayName }))}
              />
              <Select
                label="Preferred Contact Method"
                name="preferredContactMethod"
                defaultValue="phone"
                options={[
                  { value: 'phone', label: 'Phone Call' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'email', label: 'Email' },
                ]}
              />
              <Input
                label="Lead / Referral Source"
                name="leadSource"
                placeholder="e.g. Google, Walk-in, Referral"
              />
            </div>
          </div>

          {/* Progressive Disclosure Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-accent)',
                font: 'var(--text-label)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {showAdvanced ? '− Hide Emergency Contact & Medical Alert' : '+ Add Emergency Contact & Medical Alert'}
            </button>
          </div>

          {showAdvanced && (
            <>
              {/* Section 3: Emergency Contact */}
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-canvas)', borderRadius: 'var(--radius-input)' }}>
                <h3 style={{ font: 'var(--text-card-title)', marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)' }}>
                  3. Emergency Contact
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                  <Input
                    label="Contact Name"
                    name="emergencyContactName"
                    placeholder="Full name"
                  />
                  <Input
                    label="Relationship"
                    name="emergencyContactRelationship"
                    placeholder="e.g. Spouse, Parent"
                  />
                  <Input
                    label="Emergency Phone"
                    name="emergencyContactPhone"
                    type="tel"
                    placeholder="+92 300 0000000"
                  />
                </div>
              </div>

              {/* Section 4: Initial Medical Alert */}
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-canvas)', borderRadius: 'var(--radius-input)' }}>
                <h3 style={{ font: 'var(--text-card-title)', marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)' }}>
                  4. Initial Clinical Alert / Allergy
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                  <Input
                    label="Alert Label / Condition"
                    name="initialAlertLabel"
                    placeholder="e.g. Penicillin Allergy, Cardiac"
                  />
                  <Select
                    label="Alert Type"
                    name="initialAlertType"
                    defaultValue="medical_condition"
                    options={[
                      { value: 'medical_condition', label: 'Medical Condition' },
                      { value: 'allergy', label: 'Allergy' },
                      { value: 'premedication', label: 'Premedication Required' },
                      { value: 'bleeding_disorder', label: 'Bleeding Disorder' },
                    ]}
                  />
                  <Select
                    label="Severity Level"
                    name="initialAlertSeverity"
                    defaultValue="medium"
                    options={[
                      { value: 'critical', label: 'Critical (Red Warning)' },
                      { value: 'high', label: 'High (Amber Warning)' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'low', label: 'Low' },
                    ]}
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Patient Record
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
