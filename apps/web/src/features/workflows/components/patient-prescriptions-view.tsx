'use client';

import React, { useState } from 'react';
import { Button, Input, Select, Badge, Dialog } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { MEDICATION_FORMS, MedicationForm } from '../domain/types';
import { createPrescription } from '../server/clinical-docs-actions';
import styles from './patient-workflows.module.css';

export interface PatientPrescriptionsViewProps {
  organizationId: string;
  patientId: string;
  prescriptions: any[];
  medicationTemplates: any[];
}

export function PatientPrescriptionsView({
  organizationId,
  patientId,
  prescriptions: initialList,
  medicationTemplates,
}: PatientPrescriptionsViewProps) {
  const [prescriptions, setPrescriptions] = useState<any[]>(initialList);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form items
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState<MedicationForm>('tablet');
  const [frequency, setFrequency] = useState('');
  const [durationDays, setDurationDays] = useState(5);
  const [quantity, setQuantity] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = medicationTemplates.find((t) => t.id === tplId);
    if (tpl) {
      setMedName(tpl.medicationName);
      setDosage(tpl.dosage);
      setForm(tpl.form);
      setFrequency(tpl.frequency);
      setDurationDays(tpl.durationDays);
      setInstructions(tpl.instructions || '');
      setQuantity(tpl.form === 'rinse' ? '1 bottle (473 mL)' : `${tpl.durationDays * 3} units`);
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !dosage) {
      setErrorMsg('Medication and dosage are required');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await createPrescription(organizationId, {
        patientId,
        notes: notes || undefined,
        items: [
          {
            medicationName: medName,
            dosage,
            form,
            frequency,
            durationDays,
            quantity: quantity || `${durationDays * 2} tablets`,
            instructions: instructions || undefined,
          },
        ],
      });

      if (!res.success) {
        setErrorMsg(res.error?.message || 'Failed to issue prescription');
        return;
      }

      setIsOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Prescription & Medication History</h2>
          <p className={styles.subtitle}>
            Prescribed medications, dosage instructions, and active antibiotic or analgesic courses.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          + Write Prescription (Rx)
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <div className={styles.emptyState}>
          No active or historical prescriptions issued for this patient.
        </div>
      ) : (
        <div className={styles.rxList}>
          {prescriptions.map((rx) => (
            <div key={rx.id} className={styles.rxCard}>
              <div className={styles.rxHeader}>
                <div className={styles.rxTitleRow}>
                  <span className={styles.rxSymbol}>Rx</span>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>
                      Prescription #{rx.id.slice(0, 8).toUpperCase()}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Issued on {formatDate(rx.issuedAt)} by {rx.dentist?.name || 'Practitioner'}
                    </div>
                  </div>
                </div>
                <Badge variant={rx.status === 'active' ? 'success' : 'neutral'} size="sm">
                  {rx.status.toUpperCase()}
                </Badge>
              </div>

              {rx.notes && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginBottom: '8px' }}>
                  Note: {rx.notes}
                </div>
              )}

              <div className={styles.itemsTable}>
                {rx.items?.map((item: any) => (
                  <div key={item.id} className={styles.itemRow}>
                    <div>
                      <span className={styles.itemName}>
                        {item.medicationName} {item.dosage}
                      </span>
                      <span className={styles.itemMeta}>
                        {item.form.toUpperCase()} • {item.frequency} for {item.durationDays} days (Qty: {item.quantity})
                      </span>
                      {item.instructions && (
                        <div className={styles.itemInstructions}>
                          Sig: {item.instructions}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Prescription Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Write New Prescription (Rx)"
      >
        <form onSubmit={handleCreatePrescription} className={styles.formGrid}>
          {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

          {medicationTemplates.length > 0 && (
            <div className={styles.formGroup}>
              <Select
                label="Quick Medication Template"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                options={[
                  { value: '', label: 'Select standard formula or enter custom...' },
                  ...medicationTemplates.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
            </div>
          )}

          <div className={styles.formRow2}>
            <Input
              label="Medication Name"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="e.g. Amoxicillin"
              required
            />
            <Input
              label="Dosage Strength"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 500 mg"
              required
            />
          </div>

          <div className={styles.formRow3}>
            <Select
              label="Form"
              value={form}
              onChange={(e) => setForm(e.target.value as MedicationForm)}
              options={MEDICATION_FORMS.map((f) => ({ value: f, label: f.toUpperCase() }))}
            />
            <Input
              label="Duration (Days)"
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
              required
            />
            <Input
              label="Quantity to Dispense"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 21 capsules"
              required
            />
          </div>

          <Input
            label="Dosing Frequency / Schedule"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g. Take 1 capsule every 8 hours"
            required
          />

          <Input
            label="Patient Instructions (Sig)"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Take with full glass of water. Complete full course."
          />

          <Input
            label="Clinical Note / Indication"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Post-extraction prophylaxis tooth #38"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Issuing...' : 'Issue Prescription'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
