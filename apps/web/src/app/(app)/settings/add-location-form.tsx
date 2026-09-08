'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Dialog } from '@/components/ui';
import { createLocation } from '@/features/organizations/server/actions';

interface AddLocationFormProps {
  organizationId: string;
}

export function AddLocationForm({ organizationId }: AddLocationFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const result = await createLocation(organizationId, formData);

    setLoading(false);

    if (result.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error?.message || 'Failed to add location');
      if (result.error?.fields) {
        setFieldErrors(result.error.fields);
      }
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Add Location
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add Practice Location"
        description="Add another physical branch or clinic location for your organization."
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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

          <Input
            label="Location Name"
            name="name"
            placeholder="e.g. DHA Phase 5 Branch"
            required
            error={fieldErrors.name?.[0]}
          />

          <Input
            label="Address"
            name="address"
            placeholder="Street address, building, floor"
            error={fieldErrors.address?.[0]}
          />

          <Input
            label="Phone"
            name="phone"
            type="tel"
            placeholder="+92 300 1234567"
            error={fieldErrors.phone?.[0]}
          />

          <Input
            label="Timezone"
            name="timezone"
            defaultValue="Asia/Karachi"
            error={fieldErrors.timezone?.[0]}
          />

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
              Create Location
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
