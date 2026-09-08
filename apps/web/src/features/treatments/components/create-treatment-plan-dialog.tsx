'use client';

import React, { useState, useTransition } from 'react';
import { Dialog, Button, Input, Select } from '@/components/ui';
import { createTreatmentPlan } from '../server/actions';
import { formatCurrency } from '@/lib/utils';

export interface CatalogItemOption {
  id: string;
  code: string;
  name: string;
  category: string;
  defaultPrice: string | number;
  toothSpecific: boolean;
  surfaceSpecific: boolean;
}

export interface DentistOption {
  id: string;
  displayName: string;
}

export interface LocationOption {
  id: string;
  name: string;
}

interface PlanItemDraft {
  treatmentDefinitionId: string;
  toothCode: string;
  surface: string;
  priority: 'normal' | 'high' | 'urgent';
  price: number;
  discount: number;
}

interface CreateTreatmentPlanDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  patientId: string;
  dentists: DentistOption[];
  locations: LocationOption[];
  catalog: CatalogItemOption[];
  onCreated?: () => void;
}

export function CreateTreatmentPlanDialog({
  open,
  onClose,
  organizationId,
  patientId,
  dentists,
  locations,
  catalog,
  onCreated,
}: CreateTreatmentPlanDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('Comprehensive Treatment Plan');
  const [dentistId, setDentistId] = useState(dentists[0]?.id || '');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [items, setItems] = useState<PlanItemDraft[]>([
    {
      treatmentDefinitionId: catalog[0]?.id || '',
      toothCode: '',
      surface: '',
      priority: 'normal',
      price: parseFloat(catalog[0]?.defaultPrice?.toString() || '0') || 0,
      discount: 0,
    },
  ]);

  const handleProcedureChange = (index: number, defId: string) => {
    const selected = catalog.find((c) => c.id === defId);
    const updated = [...items];
    updated[index].treatmentDefinitionId = defId;
    if (selected) {
      updated[index].price = parseFloat(selected.defaultPrice.toString()) || 0;
    }
    setItems(updated);
  };

  const handleFieldChange = (index: number, field: keyof PlanItemDraft, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleAddItem = () => {
    const defaultDef = catalog[0];
    setItems([
      ...items,
      {
        treatmentDefinitionId: defaultDef?.id || '',
        toothCode: '',
        surface: '',
        priority: 'normal',
        price: parseFloat(defaultDef?.defaultPrice?.toString() || '0') || 0,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const totalEstimate = items.reduce(
    (sum, item) => sum + Math.max(0, (item.price || 0) - (item.discount || 0)),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!dentistId || !locationId) {
      setErrorMessage('Dentist and Location are required');
      return;
    }

    if (items.length === 0 || !items[0].treatmentDefinitionId) {
      setErrorMessage('At least one valid procedure is required');
      return;
    }

    startTransition(async () => {
      const payload = {
        patientId,
        locationId,
        dentistId,
        title,
        notes: notes.trim() || undefined,
        items: items.map((item, idx) => ({
          treatmentDefinitionId: item.treatmentDefinitionId,
          toothCode: item.toothCode.trim() || undefined,
          surface: item.surface.trim() || undefined,
          sequence: idx + 1,
          priority: item.priority,
          price: item.price,
          discount: item.discount,
        })),
      };

      const res = await createTreatmentPlan(organizationId, payload);
      if (!res.success) {
        setErrorMessage(res.error?.message || 'Failed to create treatment plan');
      } else {
        onCreated?.();
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="New Treatment Plan" size="lg">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMessage && (
            <div style={{ color: '#dc2626', background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Plan Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full Restorative Plan"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Location
              </label>
              <Select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Attending Dentist
            </label>
            <Select
              value={dentistId}
              onChange={(e) => setDentistId(e.target.value)}
              options={dentists.map((d) => ({ value: d.id, label: d.displayName }))}
              required
            />
          </div>

          {/* Procedure Items Builder */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Procedures & Fees</span>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                + Add Procedure
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item, idx) => {
                const selectedCat = catalog.find((c) => c.id === item.treatmentDefinitionId);

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 80px 80px 100px 90px 80px 40px',
                      gap: '0.5rem',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <select
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={item.treatmentDefinitionId}
                        onChange={(e) => handleProcedureChange(idx, e.target.value)}
                        required
                      >
                        {catalog.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            [{cat.code}] {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Tooth #"
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={item.toothCode}
                        onChange={(e) => handleFieldChange(idx, 'toothCode', e.target.value)}
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Surf."
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={item.surface}
                        onChange={(e) => handleFieldChange(idx, 'surface', e.target.value)}
                      />
                    </div>

                    <div>
                      <select
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={item.priority}
                        onChange={(e) => handleFieldChange(idx, 'priority', e.target.value as any)}
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={item.price}
                        onChange={(e) => handleFieldChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Disc."
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={item.discount}
                        onChange={(e) => handleFieldChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.75rem',
              background: '#f1f5f9',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Estimated Quotation Total:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              {formatCurrency(totalEstimate)}
            </span>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Clinical Notes / Treatment Justification
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                minHeight: '70px',
              }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Treatment indicated for recurrent caries and periapical pathology..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Treatment Plan'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
