'use client';

import React, { useState, useTransition } from 'react';
import { Dialog, Button, Input, Select } from '@/components/ui';
import { recordPayment } from '../server/actions';
import { formatCurrency } from '@/lib/utils';

export interface PaymentInvoiceOption {
  id: string;
  invoiceNumber: string;
  total: string | number;
  amountDue: string | number;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  patientId: string;
  patientName?: string;
  invoices?: PaymentInvoiceOption[];
  initialInvoiceId?: string;
  onRecorded?: () => void;
}

export function RecordPaymentDialog({
  open,
  onClose,
  organizationId,
  patientId,
  patientName,
  invoices = [],
  initialInvoiceId,
  onRecorded,
}: RecordPaymentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId || invoices[0]?.id || '');

  const initialAmount = (() => {
    const inv = invoices.find((i) => i.id === (initialInvoiceId || invoices[0]?.id));
    return inv ? parseFloat(inv.amountDue.toString()) : 0;
  })();

  const [amount, setAmount] = useState<number>(initialAmount);
  const [method, setMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other'>('card');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setAmount(parseFloat(inv.amountDue.toString()) || 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (amount <= 0) {
      setErrorMessage('Payment amount must be greater than 0');
      return;
    }

    startTransition(async () => {
      const payload = {
        patientId,
        invoiceId: selectedInvoiceId || undefined,
        amount,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await recordPayment(organizationId, payload);
      if (!res.success) {
        setErrorMessage(res.error?.message || 'Failed to record payment');
      } else {
        onRecorded?.();
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Record Payment" size="md">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMessage && (
            <div style={{ color: '#dc2626', background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
              {errorMessage}
            </div>
          )}

          {patientName && (
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Recording payment for: <strong style={{ color: '#0f172a' }}>{patientName}</strong>
            </div>
          )}

          {invoices.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Apply to Invoice
              </label>
              <Select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                options={[
                  { value: '', label: 'General Account Credit (No Invoice)' },
                  ...invoices.map((inv) => ({
                    value: inv.id,
                    label: `${inv.invoiceNumber} — Due: ${formatCurrency(parseFloat(inv.amountDue.toString()))}`,
                  })),
                ]}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Amount Paid ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Payment Method
              </label>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                options={[
                  { value: 'card', label: 'Credit/Debit Card' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'other', label: 'Other' },
                ]}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Reference / Auth Code
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Card auth 492041 or Cheque #1042"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Payment Notes
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
              placeholder="Optional notes or receipt memo..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Processing...' : 'Record Payment & Issue Receipt'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
