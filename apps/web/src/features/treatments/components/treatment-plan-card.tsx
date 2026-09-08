'use client';

import React, { useState, useTransition } from 'react';
import { Badge, Button } from '@/components/ui';
import {
  presentTreatmentPlan,
  updatePlanItemStatus,
  completeTreatmentItem,
} from '../server/actions';
import styles from './treatment-plan-card.module.css';
import { formatCurrency } from '@/lib/utils';

export interface TreatmentPlanCardProps {
  plan: any;
  organizationId: string;
  onRefresh?: () => void;
  onGenerateInvoice?: (plan: any, selectedItems?: any[]) => void;
}

export function TreatmentPlanCard({
  plan,
  organizationId,
  onRefresh,
  onGenerateInvoice,
}: TreatmentPlanCardProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const rollups = plan.rollups || {
    totalProposed: 0,
    totalAccepted: 0,
    totalCompleted: 0,
    totalPending: 0,
    acceptanceRate: 0,
  };

  const getPlanStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'completed':
        return 'success';
      case 'partially_accepted':
      case 'in_progress':
        return 'info';
      case 'presented':
        return 'warning';
      case 'declined':
      case 'abandoned':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getItemStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'accepted':
      case 'scheduled':
      case 'in_progress':
        return 'info';
      case 'declined':
        return 'danger';
      case 'deferred':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const handlePresentPlan = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await presentTreatmentPlan(organizationId, plan.id);
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to present plan');
      } else {
        onRefresh?.();
      }
    });
  };

  const handleUpdateItemStatus = (itemId: string, newStatus: any) => {
    setActionError(null);
    startTransition(async () => {
      const res = await updatePlanItemStatus(organizationId, {
        itemId,
        status: newStatus,
      });
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to update item');
      } else {
        onRefresh?.();
      }
    });
  };

  const handleCompleteItem = (item: any) => {
    setActionError(null);
    startTransition(async () => {
      const res = await completeTreatmentItem(organizationId, {
        itemId: item.id,
        dentistId: plan.dentistId,
        toothCode: item.toothCode,
        surface: item.surface,
      });
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to complete item');
      } else {
        onRefresh?.();
      }
    });
  };

  const dentistName =
    plan.dentist?.membership?.user?.name ||
    plan.dentist?.displayName ||
    'Assigned Dentist';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{plan.title}</h3>
            <Badge variant={getPlanStatusVariant(plan.status)}>
              {plan.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <div className={styles.metaText}>
            Dentist: <strong>{dentistName}</strong> &bull; Created:{' '}
            {new Date(plan.createdAt).toLocaleDateString()}
            {plan.presentedAt && (
              <> &bull; Presented: {new Date(plan.presentedAt).toLocaleDateString()}</>
            )}
          </div>
        </div>

        <div className={styles.headerActions}>
          {plan.status === 'draft' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePresentPlan}
              disabled={isPending}
            >
              Present to Patient
            </Button>
          )}
          {onGenerateInvoice && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onGenerateInvoice(plan)}
              disabled={isPending}
            >
              Generate Invoice
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div style={{ color: '#dc2626', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
          {actionError}
        </div>
      )}

      {/* Financial Quotation Summary per Section 18 */}
      <div className={styles.metricsBar}>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Total Estimate</span>
          <span className={styles.metricValue}>{formatCurrency(rollups.totalProposed)}</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Accepted</span>
          <span className={styles.metricValue} style={{ color: '#059669' }}>
            {formatCurrency(rollups.totalAccepted)}
          </span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Completed</span>
          <span className={styles.metricValue} style={{ color: '#2563eb' }}>
            {formatCurrency(rollups.totalCompleted)}
          </span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Pending Decision</span>
          <span className={styles.metricValue} style={{ color: '#d97706' }}>
            {formatCurrency(rollups.totalPending)}
          </span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Acceptance Rate</span>
          <span className={styles.metricValue}>{rollups.acceptanceRate}%</span>
        </div>
      </div>

      {/* Items Table per Section 18 */}
      <div className={styles.itemsTableWrapper}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th style={{ width: '80px' }}>Tooth</th>
              <th>Procedure</th>
              <th style={{ width: '80px' }}>Priority</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Fee</th>
              <th style={{ width: '80px', textAlign: 'right' }}>Discount</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Total</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plan.items?.map((item: any, idx: number) => {
              const priceNum = parseFloat(item.price || '0');
              const discNum = parseFloat(item.discount || '0');
              const netPrice = Math.max(0, priceNum - discNum);

              return (
                <tr key={item.id}>
                  <td>{item.sequence || idx + 1}</td>
                  <td>
                    {item.toothCode ? (
                      <span className={styles.toothBadge}>
                        T{item.toothCode}
                        {item.surface ? ` (${item.surface})` : ''}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>General</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.procInfo}>
                      <span className={styles.procName}>
                        {item.treatmentDefinition?.name || 'Procedure'}
                      </span>
                      <span className={styles.procMeta}>
                        <span>{item.treatmentDefinition?.code}</span>
                        <span>&bull;</span>
                        <span style={{ textTransform: 'capitalize' }}>
                          {item.treatmentDefinition?.category}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge
                      variant={
                        item.priority === 'urgent'
                          ? 'danger'
                          : item.priority === 'high'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {item.priority}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(priceNum)}</td>
                  <td style={{ textAlign: 'right', color: discNum > 0 ? '#dc2626' : 'inherit' }}>
                    {discNum > 0 ? `-${formatCurrency(discNum)}` : '$0.00'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency(netPrice)}
                  </td>
                  <td>
                    <Badge variant={getItemStatusVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className={styles.rowActions} style={{ justifyContent: 'flex-end' }}>
                      {item.status === 'proposed' && (
                        <>
                          <button
                            type="button"
                            className={`${styles.btnAction} ${styles.btnAccept}`}
                            onClick={() => handleUpdateItemStatus(item.id, 'accepted')}
                            disabled={isPending}
                            title="Patient accepted procedure"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnAction} ${styles.btnDecline}`}
                            onClick={() => handleUpdateItemStatus(item.id, 'declined')}
                            disabled={isPending}
                            title="Patient declined procedure"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {(item.status === 'accepted' || item.status === 'scheduled') && (
                        <button
                          type="button"
                          className={`${styles.btnAction} ${styles.btnComplete}`}
                          onClick={() => handleCompleteItem(item)}
                          disabled={isPending}
                          title="Record procedure completed by dentist"
                        >
                          Complete
                        </button>
                      )}
                      {item.status === 'completed' && (
                        <span style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
                          ✓ Done
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {plan.notes && <div className={styles.notesArea}>{plan.notes}</div>}
    </div>
  );
}
