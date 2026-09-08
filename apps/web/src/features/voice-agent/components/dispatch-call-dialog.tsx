'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Select, Input } from '@/components/ui';
import {
  createVoiceCallTask,
  executeVoiceCallSimulation,
} from '../server/actions';

interface DispatchCallDialogProps {
  organizationId: string;
  patientId: string;
  patientName: string;
  opportunityId?: string;
  defaultProcedure?: string;
  estimatedFee?: number;
  triggerButton?: React.ReactNode;
}

export function DispatchCallDialog({
  organizationId,
  patientId,
  patientName,
  opportunityId,
  defaultProcedure,
  estimatedFee,
  triggerButton,
}: DispatchCallDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<'treatment_followup' | 'overdue_recall' | 'unscheduled_care'>('treatment_followup');
  const [treatmentSummary, setTreatmentSummary] = useState(defaultProcedure || 'Preventative care & dental consultation');
  const [proposedDate, setProposedDate] = useState('2026-09-18');
  const [proposedTime, setProposedTime] = useState('10:30 AM');
  const [error, setError] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<{ outcome: string; status: string } | null>(null);

  const router = useRouter();

  const handleDispatch = async (scenario: 'booked' | 'voicemail' | 'escalate' | 'declined' = 'booked') => {
    setLoading(true);
    setError(null);
    setCallResult(null);

    // 1. Create and enqueue task
    const createRes = await createVoiceCallTask(organizationId, {
      patientId,
      opportunityId,
      intent,
      treatmentSummary,
      estimatedFee: estimatedFee || 250,
      appointmentOptions: [
        {
          date: proposedDate,
          time: proposedTime,
        },
      ],
    });

    if (!createRes.success || !createRes.data) {
      setLoading(false);
      setError(createRes.error?.message || 'Failed to dispatch voice call task.');
      return;
    }

    // 2. Run simulation with chosen scenario for instant demonstration
    const simRes = await executeVoiceCallSimulation(organizationId, createRes.data.taskId, scenario);
    setLoading(false);

    if (simRes.success && simRes.data) {
      setCallResult(simRes.data);
      router.refresh();
    } else {
      setError(simRes.error?.message || 'Call queued but simulation failed.');
    }
  };

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setOpen(true)}>{triggerButton}</span>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          🤖 AI Voice Call
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setCallResult(null);
          setError(null);
        }}
        title={`Dispatch AI Calling Agent: ${patientName}`}
        description="Downstream voice executor bounded by clinic-approved scripts, TCPA consent, and mandatory clinical advice restrictions."
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
            >
              {error}
            </div>
          )}

          {callResult ? (
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ font: 'var(--text-card-title)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                ✓ Call Completed & Processed
              </div>
              <p style={{ font: 'var(--text-body)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Outcome: <strong style={{ color: 'var(--color-text-primary)' }}>{callResult.outcome.toUpperCase()}</strong>.
                {callResult.outcome === 'booked' && ' Patient confirmed booking and opportunity converted with causal revenue attribution.'}
                {callResult.outcome === 'escalated_to_human' && ' Patient reported acute symptoms; automatically escalated to triage queue.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <Select
                  label="Contact Intent"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value as any)}
                  options={[
                    { value: 'treatment_followup', label: 'Treatment Plan Follow-up' },
                    { value: 'overdue_recall', label: 'Overdue Hygiene Recall' },
                    { value: 'unscheduled_care', label: 'Unscheduled Care Recovery' },
                  ]}
                />
                <Input
                  label="Proposed Appointment Date"
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                />
              </div>

              <Input
                label="Approved Treatment Context"
                value={treatmentSummary}
                onChange={(e) => setTreatmentSummary(e.target.value)}
                placeholder="e.g. Composite filling on tooth 16"
              />

              {/* Immutable Safety Guardrails Banner */}
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                  🛡️ Active Clinical & TCPA Guardrails:
                </div>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                  <li>Strictly prohibited from offering clinical diagnosis or medical advice.</li>
                  <li>Automatic human escalation if patient reports acute pain or billing disputes.</li>
                  <li>Verified telephone communication consent prior to call dispatch.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)' }}>
                <span style={{ font: 'var(--text-meta)', color: 'var(--color-text-muted)' }}>
                  Select simulation scenario:
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleDispatch('escalate')}
                    title="Simulate patient reporting pain"
                  >
                    Simulate Escalation
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    loading={loading}
                    onClick={() => handleDispatch('booked')}
                  >
                    Dispatch Call (Booked)
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}
