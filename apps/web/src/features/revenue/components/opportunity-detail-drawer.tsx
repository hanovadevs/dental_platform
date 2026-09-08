'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Drawer, Button, Input, Select, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  OUTREACH_CHANNELS,
  OUTREACH_OUTCOMES,
  RESOLUTION_TYPES,
  OutreachChannel,
  OutreachOutcome,
  ResolutionType,
} from '../domain/types';
import styles from './opportunity-detail-drawer.module.css';

export interface OpportunityDetailDrawerProps {
  open: boolean;
  opportunity: any | null;
  onClose: () => void;
  onLogOutreach: (data: {
    opportunityId: string;
    channel: OutreachChannel;
    outcome: OutreachOutcome;
    notes?: string;
    nextActionDate?: string;
  }) => Promise<void>;
  onResolve: (data: {
    opportunityId: string;
    resolutionType: ResolutionType;
    recoveredAmount?: number;
    notes?: string;
  }) => Promise<void>;
  onSnooze: (data: {
    opportunityId: string;
    snoozedUntil: string;
    notes?: string;
  }) => Promise<void>;
}

export function OpportunityDetailDrawer({
  open,
  opportunity,
  onClose,
  onLogOutreach,
  onResolve,
  onSnooze,
}: OpportunityDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'outreach' | 'resolve' | 'snooze'>('timeline');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Outreach Form State
  const [channel, setChannel] = useState<OutreachChannel>('phone');
  const [outcome, setOutcome] = useState<OutreachOutcome>('spoke_with_patient');
  const [outreachNotes, setOutreachNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');

  // Resolve Form State
  const [resolutionType, setResolutionType] = useState<ResolutionType>('appointment_booked');
  const [recoveredAmount, setRecoveredAmount] = useState<string>('');
  const [resolveNotes, setResolveNotes] = useState('');

  // Snooze Form State
  const [snoozeUntil, setSnoozeUntil] = useState('');
  const [snoozeNotes, setSnoozeNotes] = useState('');

  if (!opportunity) return null;

  const patientName = opportunity.patient
    ? `${opportunity.patient.firstName} ${opportunity.patient.lastName}`
    : 'Unknown Patient';

  const outreachLogs = opportunity.outreachLogs || [];
  const attributions = opportunity.attributions || [];
  const isClosed = ['converted', 'lost', 'closed'].includes(opportunity.status);

  const handleOutreachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onLogOutreach({
        opportunityId: opportunity.id,
        channel,
        outcome,
        notes: outreachNotes,
        nextActionDate: nextActionDate || undefined,
      });
      setOutreachNotes('');
      setActiveTab('timeline');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to log outreach');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const amount = recoveredAmount ? parseFloat(recoveredAmount) : undefined;
      await onResolve({
        opportunityId: opportunity.id,
        resolutionType,
        recoveredAmount: amount,
        notes: resolveNotes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve opportunity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnoozeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snoozeUntil) {
      setErrorMsg('Please select a date to snooze until');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onSnooze({
        opportunityId: opportunity.id,
        snoozedUntil: snoozeUntil,
        notes: snoozeNotes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to snooze opportunity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Opportunity: ${patientName}`}
      description={`ID: ${opportunity.id.slice(0, 8)} • Detected ${formatDate(opportunity.detectedAt)}`}
      size="lg"
    >
      <div className={styles.container}>
        {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

        {/* Opportunity Overview Card */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <div>
              <h3 className={styles.summaryTitle}>{opportunity.reason}</h3>
              <div className={styles.patientLinks}>
                {opportunity.patient && (
                  <Link
                    href={`/patients/${opportunity.patient.id}`}
                    className={styles.viewChartLink}
                  >
                    Open Patient Chart & Record &rarr;
                  </Link>
                )}
              </div>
            </div>
            <div className={styles.summaryMetrics}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Pipeline Value</span>
                <span className={styles.metricValue}>
                  {formatCurrency(parseFloat(opportunity.estimatedValue || '0'))}
                </span>
              </div>
              {opportunity.recoveredRevenue && (
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Recovered</span>
                  <span className={styles.metricRecovered}>
                    {formatCurrency(parseFloat(opportunity.recoveredRevenue))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.summaryMetaGrid}>
            <div>
              <span className={styles.metaLabel}>Status:</span>{' '}
              <Badge variant="neutral" size="sm">
                {opportunity.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className={styles.metaLabel}>Priority:</span>{' '}
              <Badge
                variant={opportunity.priority === 'urgent' ? 'danger' : 'warning'}
                size="sm"
              >
                {opportunity.priority.toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className={styles.metaLabel}>Confidence:</span>{' '}
              <strong>{opportunity.confidenceScore}%</strong>
            </div>
            <div>
              <span className={styles.metaLabel}>Next Action:</span>{' '}
              <span>
                {opportunity.nextActionAt ? formatDate(opportunity.nextActionAt) : 'None set'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabNav}>
          <button
            type="button"
            className={[styles.tabButton, activeTab === 'timeline' ? styles.activeTab : ''].join(' ')}
            onClick={() => setActiveTab('timeline')}
          >
            Touchpoints ({outreachLogs.length})
          </button>
          {!isClosed && (
            <>
              <button
                type="button"
                className={[styles.tabButton, activeTab === 'outreach' ? styles.activeTab : ''].join(' ')}
                onClick={() => setActiveTab('outreach')}
              >
                Log Outreach
              </button>
              <button
                type="button"
                className={[styles.tabButton, activeTab === 'resolve' ? styles.activeTab : ''].join(' ')}
                onClick={() => {
                  setRecoveredAmount(opportunity.estimatedValue?.toString() || '');
                  setActiveTab('resolve');
                }}
              >
                Resolve
              </button>
              <button
                type="button"
                className={[styles.tabButton, activeTab === 'snooze' ? styles.activeTab : ''].join(' ')}
                onClick={() => setActiveTab('snooze')}
              >
                Snooze
              </button>
            </>
          )}
        </div>

        {/* Tab 1: Timeline of Touchpoints */}
        {activeTab === 'timeline' && (
          <div className={styles.timelineSection}>
            {attributions.length > 0 && (
              <div className={styles.attributionsBox}>
                <h4 className={styles.boxTitle}>Verified Revenue Attribution</h4>
                {attributions.map((attr: any) => (
                  <div key={attr.id} className={styles.attributionItem}>
                    <div>
                      <strong>{formatCurrency(parseFloat(attr.amount))}</strong> attributed
                      via {attr.eventType.replace(/_/g, ' ')} ({attr.sourceEntityType})
                    </div>
                    <span className={styles.attrDate}>{formatDate(attr.occurredAt)}</span>
                  </div>
                ))}
              </div>
            )}

            {outreachLogs.length === 0 ? (
              <div className={styles.emptyLogs}>
                <p>No touchpoints recorded yet.</p>
                {!isClosed && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('outreach')}
                  >
                    Log First Contact
                  </Button>
                )}
              </div>
            ) : (
              <div className={styles.timeline}>
                {outreachLogs.map((log: any) => (
                  <div key={log.id} className={styles.timelineItem}>
                    <div className={styles.timelineHeader}>
                      <div className={styles.timelineMeta}>
                        <span className={styles.channelBadge}>{log.channel.toUpperCase()}</span>
                        <span className={styles.outcomeText}>
                          {log.outcome.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className={styles.timelineTime}>
                        {formatDate(log.contactedAt)}
                      </span>
                    </div>
                    {log.notes && <p className={styles.timelineNotes}>{log.notes}</p>}
                    <div className={styles.timelineActor}>
                      Recorded by {log.actor?.name || 'Staff member'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Log Outreach Form */}
        {activeTab === 'outreach' && (
          <form onSubmit={handleOutreachSubmit} className={styles.formSection}>
            <div className={styles.formGroup}>
              <Select
                label="Contact Channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as OutreachChannel)}
                options={OUTREACH_CHANNELS.map((c) => ({
                  value: c,
                  label: c.toUpperCase(),
                }))}
              />
            </div>

            <div className={styles.formGroup}>
              <Select
                label="Contact Outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as OutreachOutcome)}
                options={OUTREACH_OUTCOMES.map((o) => ({
                  value: o,
                  label: o.replace(/_/g, ' ').toUpperCase(),
                }))}
              />
            </div>

            <div className={styles.formGroup}>
              <Input
                label="Next Follow-up Date (Optional)"
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Interaction Notes</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Details of the conversation, objections raised, or preferred appointment times..."
                value={outreachNotes}
                onChange={(e) => setOutreachNotes(e.target.value)}
              />
            </div>

            <div className={styles.formActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab('timeline')}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Touchpoint'}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Resolve Form */}
        {activeTab === 'resolve' && (
          <form onSubmit={handleResolveSubmit} className={styles.formSection}>
            <div className={styles.formGroup}>
              <Select
                label="Resolution Type"
                value={resolutionType}
                onChange={(e) => setResolutionType(e.target.value as ResolutionType)}
                options={RESOLUTION_TYPES.map((r) => ({
                  value: r,
                  label: r.replace(/_/g, ' ').toUpperCase(),
                }))}
              />
            </div>

            {['appointment_booked', 'treatment_accepted', 'invoice_paid'].includes(
              resolutionType
            ) && (
              <div className={styles.formGroup}>
                <Input
                  label="Recovered Revenue ($ USD)"
                  type="number"
                  step="0.01"
                  value={recoveredAmount}
                  onChange={(e) => setRecoveredAmount(e.target.value)}
                  hint="Exact revenue attributable to this conversion"
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Resolution Notes</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Notes on resolution outcome..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
              />
            </div>

            <div className={styles.formActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab('timeline')}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Processing...' : 'Confirm Resolution'}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 4: Snooze Form */}
        {activeTab === 'snooze' && (
          <form onSubmit={handleSnoozeSubmit} className={styles.formSection}>
            <div className={styles.formGroup}>
              <Input
                label="Snooze Until Date *"
                type="date"
                value={snoozeUntil}
                onChange={(e) => setSnoozeUntil(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Reason for Snoozing</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Patient traveling, asked to call back next month, etc."
                value={snoozeNotes}
                onChange={(e) => setSnoozeNotes(e.target.value)}
              />
            </div>

            <div className={styles.formActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab('timeline')}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Snoozing...' : 'Confirm Snooze'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Drawer>
  );
}
