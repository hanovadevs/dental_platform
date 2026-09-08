'use client';

import React, { useState, useTransition } from 'react';
import { Drawer, Button, Input, Select, Badge } from '@/components/ui';
import { ToothDefinition, ToothSurface, TOOTH_CONDITIONS_CATALOG } from '../../domain/teeth';
import { recordToothCondition, removeToothCondition } from '../../server/actions';
import { useRouter } from 'next/navigation';

export interface ToothConditionRecord {
  id: string;
  toothCode: string;
  surface?: string | null;
  conditionType: string;
  status: string;
  notes?: string | null;
  recordedAt: Date;
  recordedByName?: string;
  active: boolean;
  supersedesId?: string | null;
}

interface ToothDetailPanelProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  patientId: string;
  tooth: ToothDefinition | null;
  conditions: ToothConditionRecord[];
}

export function ToothDetailPanel({
  open,
  onClose,
  organizationId,
  patientId,
  tooth,
  conditions,
}: ToothDetailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [conditionType, setConditionType] = useState<string>('caries');
  const [status, setStatus] = useState<string>('diagnosed');
  const [selectedSurfaces, setSelectedSurfaces] = useState<ToothSurface[]>([]);
  const [wholeTooth, setWholeTooth] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!tooth) return null;

  const toothConditions = conditions.filter((c) => c.toothCode === tooth.fdi);
  const activeFindings = toothConditions.filter((c) => c.active);
  const historicalFindings = toothConditions.filter((c) => !c.active);

  const toggleSurface = (surf: ToothSurface) => {
    setWholeTooth(false);
    setSelectedSurfaces((prev) =>
      prev.includes(surf) ? prev.filter((s) => s !== surf) : [...prev, surf]
    );
  };

  const handleWholeToothToggle = () => {
    if (!wholeTooth) {
      setWholeTooth(true);
      setSelectedSurfaces([]);
    } else {
      setWholeTooth(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const surfaceString = wholeTooth ? undefined : selectedSurfaces.join('');

    const formData = new FormData();
    formData.append('toothCode', tooth.fdi);
    if (surfaceString) formData.append('surface', surfaceString);
    formData.append('conditionType', conditionType);
    formData.append('status', status);
    if (notes) formData.append('notes', notes);

    startTransition(async () => {
      const res = await recordToothCondition(organizationId, patientId, formData);
      if (res.success) {
        // Reset form inputs
        setSelectedSurfaces([]);
        setWholeTooth(false);
        setNotes('');
        router.refresh();
      } else {
        setFormError(res.error?.message || 'Failed to record condition.');
      }
    });
  };

  const handleDeactivate = (conditionId: string) => {
    startTransition(async () => {
      const res = await removeToothCondition(organizationId, conditionId);
      if (res.success) {
        router.refresh();
      } else {
        setFormError(res.error?.message || 'Failed to deactivate condition.');
      }
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Tooth ${tooth.fdi} (Universal #${tooth.universal})`}
      description={`${tooth.name} • Quadrant ${tooth.quadrant}`}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* SECTION 1: Record New Finding */}
        <section
          style={{
            background: 'var(--surface-sunken)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Record Finding / Treatment
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {formError && (
              <div
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--color-danger, #dc2626)',
                  fontSize: '0.8125rem',
                }}
              >
                {formError}
              </div>
            )}

            {/* Condition Type */}
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
                Condition / Procedure Type
              </label>
              <Select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value)}
                options={Object.values(TOOTH_CONDITIONS_CATALOG).map((c) => ({
                  value: c.code,
                  label: c.label,
                }))}
              />
            </div>

            {/* Surface Selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Surfaces Involved
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleWholeToothToggle}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: wholeTooth ? 'var(--primary-600, #0284c7)' : 'var(--border-subtle)',
                    backgroundColor: wholeTooth ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-base)',
                    color: wholeTooth ? 'var(--primary-600, #0284c7)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Whole Tooth
                </button>

                {tooth.surfaces.map((surf) => {
                  const isSelected = selectedSurfaces.includes(surf);
                  const surfaceLabels: Record<ToothSurface, string> = {
                    M: 'Mesial (M)',
                    D: 'Distal (D)',
                    O: 'Occlusal (O)',
                    I: 'Incisal (I)',
                    B: 'Buccal (B)',
                    F: 'Facial (F)',
                    L: 'Lingual (L)',
                    P: 'Palatal (P)',
                  };

                  return (
                    <button
                      key={surf}
                      type="button"
                      onClick={() => toggleSurface(surf)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--primary-600, #0284c7)' : 'var(--border-subtle)',
                        backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-base)',
                        color: isSelected ? 'var(--primary-600, #0284c7)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {surfaceLabels[surf]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
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
                Clinical Status
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'diagnosed', label: 'Diagnosed (Needs Care)' },
                  { value: 'completed', label: 'Completed (Treated)' },
                  { value: 'existing', label: 'Existing (Pre-dates Care)' },
                  { value: 'watch', label: 'Watch / Monitor' },
                ]}
              />
            </div>

            {/* Notes */}
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
                Clinical Observation Notes
              </label>
              <Input
                placeholder="e.g. Incipient lesion on distal margin, no pain..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              style={{ marginTop: 'var(--space-2)', width: '100%' }}
            >
              {isPending ? 'Saving Record...' : 'Save Finding to Chart'}
            </Button>
          </form>
        </section>

        {/* SECTION 2: Active Conditions */}
        <section>
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Active Findings ({activeFindings.length})
          </h3>

          {activeFindings.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
              No active findings recorded for this tooth. Tooth appears sound.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {activeFindings.map((finding) => {
                const meta = TOOTH_CONDITIONS_CATALOG[finding.conditionType];
                return (
                  <div
                    key={finding.id}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-base)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: meta ? meta.color : '#dc2626',
                          }}
                        />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {meta?.label || finding.conditionType}
                        </span>
                        {finding.surface && (
                          <Badge variant="neutral">Surface: {finding.surface}</Badge>
                        )}
                        <Badge variant={finding.status === 'completed' ? 'success' : 'warning'}>
                          {finding.status}
                        </Badge>
                      </div>

                      {finding.notes && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {finding.notes}
                        </p>
                      )}

                      <div
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--text-tertiary)',
                          marginTop: '4px',
                        }}
                      >
                        Recorded{' '}
                        {new Date(finding.recordedAt).toLocaleDateString()}{' '}
                        {finding.recordedByName ? `by ${finding.recordedByName}` : ''}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(finding.id)}
                      disabled={isPending}
                      style={{ color: 'var(--color-danger, #dc2626)', fontSize: '0.75rem' }}
                    >
                      Resolve
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: Historical Audit Trail */}
        {historicalFindings.length > 0 && (
          <section>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Historical / Superseded Records ({historicalFindings.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {historicalFindings.map((hist) => {
                const meta = TOOTH_CONDITIONS_CATALOG[hist.conditionType];
                return (
                  <div
                    key={hist.id}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(241, 245, 249, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      opacity: 0.75,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {meta?.label || hist.conditionType}
                      </span>
                      {hist.surface && <Badge variant="neutral">{hist.surface}</Badge>}
                      <Badge variant="neutral">Historical</Badge>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      Resolved / Superseded •{' '}
                      {new Date(hist.recordedAt).toLocaleDateString()}{' '}
                      {hist.recordedByName ? `by ${hist.recordedByName}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Drawer>
  );
}
