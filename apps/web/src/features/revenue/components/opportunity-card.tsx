'use client';

import React from 'react';
import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import styles from './opportunity-card.module.css';

export interface OpportunityCardProps {
  opportunity: {
    id: string;
    organizationId: string;
    patientId: string;
    type: string;
    status: string;
    priority: string;
    estimatedValue: string | number;
    confidenceScore: number;
    reason: string;
    nextActionAt: string | Date | null;
    detectedAt: string | Date;
    recoveredRevenue?: string | number | null;
    resolutionType?: string | null;
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
      patientNumber?: string;
      phone?: string | null;
    } | null;
    outreachLogs?: any[];
  };
  onSelect: (opportunity: any) => void;
  onLogOutreach: (opportunity: any) => void;
  onResolve: (opportunity: any) => void;
  onSnooze: (opportunity: any) => void;
}

export function OpportunityCard({
  opportunity,
  onSelect,
  onLogOutreach,
  onResolve,
  onSnooze,
}: OpportunityCardProps) {
  const {
    id,
    type,
    status,
    priority,
    estimatedValue,
    confidenceScore,
    reason,
    nextActionAt,
    recoveredRevenue,
    patient,
    outreachLogs = [],
  } = opportunity;

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : 'Unknown Patient';

  const formatType = (t: string) => {
    switch (t) {
      case 'unaccepted_treatment':
        return 'Unaccepted Treatment';
      case 'overdue_recall':
        return 'Overdue Recall';
      case 'cancelled_appointment':
        return 'Cancelled Booking';
      case 'no_show':
        return 'No-Show';
      case 'outstanding_balance':
        return 'Outstanding Balance';
      case 'empty_chair':
        return 'Chair Vacancy';
      default:
        return t.replace(/_/g, ' ');
    }
  };

  const getPriorityVariant = (p: string): 'danger' | 'warning' | 'info' | 'neutral' => {
    switch (p) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const getStatusVariant = (s: string): 'success' | 'warning' | 'info' | 'neutral' | 'danger' => {
    switch (s) {
      case 'converted':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'snoozed':
        return 'warning';
      case 'lost':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const isClosed = status === 'converted' || status === 'lost' || status === 'closed';

  return (
    <div className={styles.card} data-priority={priority}>
      <div className={styles.header}>
        <div className={styles.patientInfo}>
          <div className={styles.patientMeta}>
            {patient ? (
              <Link
                href={`/patients/${patient.id}`}
                className={styles.patientLink}
                onClick={(e) => e.stopPropagation()}
              >
                {patientName}
              </Link>
            ) : (
              <span className={styles.patientLink}>{patientName}</span>
            )}
            {patient?.patientNumber && (
              <span className={styles.patientNumber}>{patient.patientNumber}</span>
            )}
            {patient?.phone && (
              <span className={styles.patientPhone}>{patient.phone}</span>
            )}
          </div>
          <div className={styles.badges}>
            <Badge variant={getPriorityVariant(priority)} size="sm">
              {priority.toUpperCase()}
            </Badge>
            <Badge variant="neutral" size="sm">
              {formatType(type)}
            </Badge>
            <Badge variant={getStatusVariant(status)} size="sm">
              {status.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className={styles.valueSection}>
          <div className={styles.valueLabel}>
            {status === 'converted' ? 'Recovered' : 'Est. Pipeline'}
          </div>
          <div className={styles.valueAmount}>
            {formatCurrency(
              status === 'converted'
                ? parseFloat(recoveredRevenue?.toString() || '0')
                : parseFloat(estimatedValue?.toString() || '0')
            )}
          </div>
          <div className={styles.confidenceScore}>
            <span>{confidenceScore}% confidence</span>
            <div className={styles.confidenceBar}>
              <div
                className={styles.confidenceFill}
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <p className={styles.reason}>{reason}</p>
      </div>

      <div className={styles.footer}>
        <div className={styles.metaRow}>
          {nextActionAt && !isClosed && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Next Action:</span>
              <span className={styles.metaValue}>{formatDate(nextActionAt)}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Touchpoints:</span>
            <span className={styles.metaValue}>
              {outreachLogs.length} contact{outreachLogs.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          {!isClosed && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onLogOutreach(opportunity)}
              >
                Log Outreach
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSnooze(opportunity)}
              >
                Snooze
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onResolve(opportunity)}
              >
                Resolve
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(opportunity)}
          >
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}
