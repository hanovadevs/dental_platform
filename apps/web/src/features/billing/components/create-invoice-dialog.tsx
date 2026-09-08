'use client';

import React, { useState, useTransition } from 'react';
import { Dialog, Button, Input, Select } from '@/components/ui';
import { createInvoice } from '../server/actions';
import { formatCurrency } from '@/lib/utils';
import { calculateInvoiceTotals } from '../domain/calculations';

export interface BillingPatientOption {
  id: string;
  name: string;
  patientNumber: string;
}

export interface BillingLocationOption {
  id: string;
  name: string;
}

interface InvoiceItemDraft {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  procedureId?: string;
  treatmentPlanItemId?: string;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  patients: BillingPatientOption[];
  locations: BillingLocationOption[];
  initialPatientId?: string;
  initialItems?: {
    description: string;
    unitPrice: number;
    procedureId?: string;
    treatmentPlanItemId?: string;
  }[];
  onCreated?: () => void;
}

export function CreateInvoiceDialog({
  open,
  onClose,
  organizationId,
  patients,
  locations,
  initialPatientId,
  initialItems,
  onCreated,
}: CreateInvoiceDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [patientId, setPatientId] = useState(initialPatientId || patients[0]?.id || '');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [items, setItems] = useState<InvoiceItemDraft[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((item) => ({
        description: item.description,
        quantity: 1,
        unitPrice: item.unitPrice,
        discount: 0,
        procedureId: item.procedureId,
        treatmentPlanItemId: item.treatmentPlanItemId,
      }));
    }
    return [
      {
        description: 'Dental Consultation & Procedure',
        quantity: 1,
        unitPrice: 150,
        discount: 0,
      },
    ];
  });

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemDraft, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calculated = calculateInvoiceTotals(items);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientId || !locationId) {
      setErrorMessage('Patient and Location are required');
      return;
    }

    if (items.some((item) => !item.description.trim())) {
      setErrorMessage('Every line item must have a description');
      return;
    }

    startTransition(async () => {
      const payload = {
        patientId,
        locationId,
        dueAt: dueAt || undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          procedureId: item.procedureId || undefined,
          treatmentPlanItemId: item.treatmentPlanItemId || undefined,
        })),
      };

      const res = await createInvoice(organizationId, payload);
      if (!res.success) {
        setErrorMessage(res.error?.message || 'Failed to create invoice');
      } else {
        onCreated?.();
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Invoice" size="lg">
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
                Patient
              </label>
              <Select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                options={patients.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.patientNumber})`,
                }))}
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
              Payment Due Date
            </label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          {/* Line items */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Line Items</span>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                + Add Line
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 70px 100px 90px 40px',
                    gap: '0.5rem',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Description / Procedure"
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Disc."
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    value={item.discount}
                    onChange={(e) => handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                  />
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
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: '#f1f5f9',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(calculated.subtotal)}</span>
            </div>
            {calculated.discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#dc2626' }}>
                <span>Discount Total</span>
                <span>-{formatCurrency(calculated.discountTotal)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#0f172a',
                borderTop: '1px solid #cbd5e1',
                paddingTop: '0.35rem',
                marginTop: '0.2rem',
              }}
            >
              <span>Invoice Total</span>
              <span>{formatCurrency(calculated.total)}</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Notes / Payment Instructions
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                minHeight: '60px',
              }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Payment due within 14 days. Bank details: ..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Generating...' : 'Issue Invoice'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
