'use client';

import React, { useState, useTransition } from 'react';
import { Dialog, Button, Input, Select } from '@/components/ui';
import { createTreatmentDefinition } from '@/features/treatments/server/actions';
import { TREATMENT_CATEGORIES } from '@/features/treatments/domain/types';

interface NewProcedureDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

export function NewProcedureDialog({
  open,
  onClose,
  organizationId,
}: NewProcedureDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('restorative');
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(30);
  const [defaultPrice, setDefaultPrice] = useState(150);
  const [toothSpecific, setToothSpecific] = useState(false);
  const [surfaceSpecific, setSurfaceSpecific] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await createTreatmentDefinition(organizationId, {
        code: code.trim(),
        name: name.trim(),
        category,
        defaultDurationMinutes,
        defaultPrice,
        currency: 'USD',
        toothSpecific,
        surfaceSpecific,
      });

      if (!res.success) {
        setErrorMessage(res.error?.message || 'Failed to create procedure');
      } else {
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add New Procedure" size="md">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMessage && (
            <div style={{ color: '#dc2626', background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Code
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. COMP-MOD"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Procedure Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Composite 3 Surfaces"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Category
            </label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              options={TREATMENT_CATEGORIES.map((cat) => ({
                value: cat.id,
                label: cat.label,
              }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Duration (Minutes)
              </label>
              <Input
                type="number"
                min={5}
                step={5}
                value={defaultDurationMinutes}
                onChange={(e) => setDefaultDurationMinutes(parseInt(e.target.value, 10) || 30)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Default Price ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={toothSpecific}
                onChange={(e) => setToothSpecific(e.target.checked)}
              />
              Tooth Specific
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={surfaceSpecific}
                onChange={(e) => setSurfaceSpecific(e.target.checked)}
              />
              Surface Specific
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Saving...' : 'Add to Catalog'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
