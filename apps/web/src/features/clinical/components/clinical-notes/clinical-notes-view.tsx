'use client';

import React, { useState, useTransition } from 'react';
import styles from './clinical-notes.module.css';
import { Button, Dialog, Input, Select, Badge, EmptyState } from '@/components/ui';
import { createClinicalNote } from '../../server/actions';
import { useRouter } from 'next/navigation';

export interface ClinicalNoteRecord {
  id: string;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  treatmentProvided: string;
  plan?: string | null;
  signedAt: Date;
  authorName?: string;
  dentistName?: string;
}

interface ClinicalNotesViewProps {
  organizationId: string;
  patientId: string;
  notes: ClinicalNoteRecord[];
  dentists: { id: string; displayName: string }[];
}

export function ClinicalNotesView({
  organizationId,
  patientId,
  notes,
  dentists,
}: ClinicalNotesViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form states
  const [dentistId, setDentistId] = useState<string>(dentists[0]?.id || '');
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [treatmentProvided, setTreatmentProvided] = useState<string>('');
  const [plan, setPlan] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    if (dentistId) formData.append('dentistId', dentistId);
    if (chiefComplaint) formData.append('chiefComplaint', chiefComplaint);
    if (diagnosis) formData.append('diagnosis', diagnosis);
    formData.append('treatmentProvided', treatmentProvided);
    if (plan) formData.append('plan', plan);

    startTransition(async () => {
      const res = await createClinicalNote(organizationId, patientId, formData);
      if (res.success) {
        setDialogOpen(false);
        setChiefComplaint('');
        setDiagnosis('');
        setTreatmentProvided('');
        setPlan('');
        router.refresh();
      } else {
        setErrorMsg(res.error?.message || 'Failed to sign clinical note.');
      }
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>Clinical Progress Notes (SOAP)</h2>
          <p className={styles.subtitle}>
            Legally signed medical and dental treatment records for this patient.
          </p>
        </div>

        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          + New Clinical Note
        </Button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <EmptyState
          title="No clinical notes recorded"
          description="Record clinical progress notes after each examination, consultation, or treatment session."
          action={{
            label: 'Create First Note',
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : (
        <div className={styles.notesList}>
          {notes.map((note) => (
            <article key={note.id} className={styles.noteCard}>
              <div className={styles.cardHeader}>
                <div className={styles.signerInfo}>
                  <div>
                    <span className={styles.signerName}>
                      {note.dentistName ? `Dr. ${note.dentistName}` : note.authorName || 'Attending Practitioner'}
                    </span>
                    <div className={styles.timestamp}>
                      Signed on {new Date(note.signedAt).toLocaleDateString()} at{' '}
                      {new Date(note.signedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className={styles.signatureBadge}>
                  ✓ Digitally Signed & Locked
                </div>
              </div>

              {/* SOAP Sections */}
              <div className={styles.soapGrid}>
                {note.chiefComplaint && (
                  <div className={styles.soapSection}>
                    <span className={styles.soapTag}>S • Subjective (Chief Complaint)</span>
                    <p className={styles.soapText}>{note.chiefComplaint}</p>
                  </div>
                )}

                {note.diagnosis && (
                  <div className={styles.soapSection}>
                    <span className={styles.soapTag}>O • Objective (Diagnosis & Findings)</span>
                    <p className={styles.soapText}>{note.diagnosis}</p>
                  </div>
                )}

                <div className={styles.soapSection} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.soapTag} style={{ color: '#16a34a' }}>
                    A • Assessment & Treatment Provided
                  </span>
                  <p className={styles.soapText} style={{ fontWeight: 500 }}>
                    {note.treatmentProvided}
                  </p>
                </div>

                {note.plan && (
                  <div className={styles.soapSection} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.soapTag} style={{ color: '#d97706' }}>
                      P • Plan & Follow-up
                    </span>
                    <p className={styles.soapText}>{note.plan}</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* New Note Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Record Clinical Progress Note (SOAP)"
        description="Clinical progress notes are permanent legal records and cannot be modified once signed."
        size="lg"
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

          {dentists.length > 0 && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Treating Dentist / Practitioner
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
          )}

          {/* Subjective */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              Subjective (Chief Complaint & Patient Report)
            </label>
            <Input
              placeholder="e.g. Patient reports sensitivity to cold liquids on lower right quadrant for 3 days..."
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </div>

          {/* Objective */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              Objective (Clinical Examination & Radiographic Findings)
            </label>
            <Input
              placeholder="e.g. Tooth 46 DO cavitated lesion, sensitive to percussion (-), cold response (+)..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          {/* Treatment Provided (Required) */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              Treatment Provided (Procedures Completed Today) *
            </label>
            <textarea
              required
              rows={4}
              placeholder="e.g. Administered 1 carpule 2% Lidocaine 1:100k epi. Excavated deep caries on 46 DO. Placed composite resin restoration. Polished and verified occlusion."
              value={treatmentProvided}
              onChange={(e) => setTreatmentProvided(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-base)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* Plan */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              Plan (Post-Op Instructions & Next Visit)
            </label>
            <Input
              placeholder="e.g. Post-op instructions given. Next visit in 2 weeks for recall and tooth 16 evaluation."
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Signing Note...' : 'Sign & Lock Note'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
