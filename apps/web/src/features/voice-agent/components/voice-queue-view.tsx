'use client';

import React, { useState } from 'react';
import { Badge, Button } from '@/components/ui';

interface VoiceTaskItem {
  id: string;
  intent: string;
  status: string;
  outcome?: string;
  needsHumanFollowup: boolean;
  humanFollowupReason?: string;
  transcript?: string;
  callDurationSeconds?: number;
  createdAt: Date | string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  opportunity?: {
    id: string;
    type: string;
    estimatedValue: string;
  };
}

interface VoiceQueueViewProps {
  tasks: VoiceTaskItem[];
}

export function VoiceQueueView({ tasks }: VoiceQueueViewProps) {
  const [selectedTask, setSelectedTask] = useState<VoiceTaskItem | null>(null);

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
      case 'queued':
        return 'info';
      case 'escalated_to_human':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
          <div style={{ font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>Total Voice Calls</div>
          <div style={{ font: 'var(--text-page-title)', color: 'var(--color-text-primary)' }}>{tasks.length}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
          <div style={{ font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>Automated Bookings</div>
          <div style={{ font: 'var(--text-page-title)', color: 'var(--color-success)' }}>
            {tasks.filter((t) => t.outcome === 'booked').length}
          </div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
          <div style={{ font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>Human Escalations</div>
          <div style={{ font: 'var(--text-page-title)', color: 'var(--color-accent)' }}>
            {tasks.filter((t) => t.needsHumanFollowup).length}
          </div>
        </div>
        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
          <div style={{ font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>Avg Call Duration</div>
          <div style={{ font: 'var(--text-page-title)', color: 'var(--color-text-primary)' }}>
            {tasks.length > 0
              ? `${Math.round(tasks.reduce((sum, t) => sum + (t.callDurationSeconds || 0), 0) / tasks.length)}s`
              : '0s'}
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}>
          <p style={{ font: 'var(--text-body)', color: 'var(--color-text-secondary)' }}>
            No voice call tasks in queue. Dispatch an AI calling agent from any revenue opportunity.
          </p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', overflow: 'hidden', background: 'var(--color-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-divider)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>Patient</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>Intent</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>Outcome</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>Duration</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>Escalation</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>
                    {task.patient.firstName} {task.patient.lastName}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      {task.patient.phone}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{task.intent.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={getStatusVariant(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500 }}>
                    {task.outcome ? task.outcome.toUpperCase() : '—'}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {task.callDurationSeconds ? `${task.callDurationSeconds}s` : '—'}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {task.needsHumanFollowup ? (
                      <span style={{ color: 'var(--color-danger)', fontWeight: 500 }} title={task.humanFollowupReason || undefined}>
                        ⚠️ Required
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {task.transcript && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                      >
                        Transcript
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transcript Modal / Drawer */}
      {selectedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setSelectedTask(null)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              width: '560px',
              maxHeight: '80vh',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ font: 'var(--text-card-title)', margin: 0 }}>
                Call Transcript: {selectedTask.patient.firstName} {selectedTask.patient.lastName}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>✕</Button>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Outcome: <strong>{selectedTask.outcome?.toUpperCase()}</strong> • Duration: {selectedTask.callDurationSeconds}s
            </div>
            {selectedTask.humanFollowupReason && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-light)', borderRadius: 'var(--radius-input)', fontSize: '0.8125rem', color: 'var(--color-danger)' }}>
                <strong>Escalation Note:</strong> {selectedTask.humanFollowupReason}
              </div>
            )}
            <div
              style={{
                background: 'var(--color-canvas)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-input)',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
                maxHeight: '300px',
                border: '1px solid var(--color-border)',
              }}
            >
              {selectedTask.transcript}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button onClick={() => setSelectedTask(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
