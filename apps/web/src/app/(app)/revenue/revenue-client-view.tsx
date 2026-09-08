'use client';

import React, { useState, useTransition } from 'react';
import { Button, Select, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { OpportunityCard } from '@/features/revenue/components/opportunity-card';
import { OpportunityDetailDrawer } from '@/features/revenue/components/opportunity-detail-drawer';
import {
  runOpportunityScan,
  logOpportunityOutreach,
  resolveOpportunity,
  snoozeOpportunity,
} from '@/features/revenue/server/actions';
import {
  RevenueMetrics,
  OutreachChannel,
  OutreachOutcome,
  ResolutionType,
} from '@/features/revenue/domain/types';
import styles from './revenue.module.css';

export interface RevenueClientViewProps {
  organizationId: string;
  initialMetrics: RevenueMetrics;
  initialOpportunities: any[];
}

export function RevenueClientView({
  organizationId,
  initialMetrics,
  initialOpportunities,
}: RevenueClientViewProps) {
  const [opportunities, setOpportunities] = useState<any[]>(initialOpportunities);
  const [metrics, setMetrics] = useState<RevenueMetrics>(initialMetrics);

  // Filters
  const [statusTab, setStatusTab] = useState<'active' | 'converted' | 'lost' | 'all'>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Drawer & Selection
  const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Scan status
  const [isPending, startTransition] = useTransition();
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Filtering opportunities client-side
  const filteredOpportunities = opportunities.filter((opp) => {
    // Status Tab filter
    if (statusTab === 'active') {
      if (!['open', 'in_progress', 'snoozed'].includes(opp.status)) return false;
    } else if (statusTab === 'converted') {
      if (opp.status !== 'converted') return false;
    } else if (statusTab === 'lost') {
      if (opp.status !== 'lost') return false;
    }

    // Type filter
    if (typeFilter !== 'all' && opp.type !== typeFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && opp.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  const handleRunScan = () => {
    setScanFeedback(null);
    startTransition(async () => {
      const res = await runOpportunityScan(organizationId);
      if (res.success && res.data) {
        setScanFeedback(res.data.message);
        // Refresh page after short delay or state update
        window.location.reload();
      } else {
        setScanFeedback(res.error?.message || 'Failed to complete scan');
      }
    });
  };

  const handleOpenDrawer = (opp: any) => {
    setSelectedOpportunity(opp);
    setIsDrawerOpen(true);
  };

  const handleLogOutreach = async (data: {
    opportunityId: string;
    channel: OutreachChannel;
    outcome: OutreachOutcome;
    notes?: string;
    nextActionDate?: string;
  }) => {
    const res = await logOpportunityOutreach(organizationId, data);
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to log outreach');
    }

    // Update local state
    setOpportunities((prev) =>
      prev.map((item) => {
        if (item.id === data.opportunityId) {
          const newLogs = [
            {
              id: res.data?.outreachId || Math.random().toString(),
              channel: data.channel,
              outcome: data.outcome,
              notes: data.notes,
              contactedAt: new Date().toISOString(),
              actor: { name: 'Current User' },
            },
            ...(item.outreachLogs || []),
          ];
          return {
            ...item,
            status: item.status === 'open' ? 'in_progress' : item.status,
            nextActionAt: data.nextActionDate || item.nextActionAt,
            outreachLogs: newLogs,
          };
        }
        return item;
      })
    );

    if (selectedOpportunity && selectedOpportunity.id === data.opportunityId) {
      setSelectedOpportunity((prev: any) => ({
        ...prev,
        status: prev.status === 'open' ? 'in_progress' : prev.status,
        nextActionAt: data.nextActionDate || prev.nextActionAt,
        outreachLogs: [
          {
            id: res.data?.outreachId || Math.random().toString(),
            channel: data.channel,
            outcome: data.outcome,
            notes: data.notes,
            contactedAt: new Date().toISOString(),
            actor: { name: 'Current User' },
          },
          ...(prev.outreachLogs || []),
        ],
      }));
    }
  };

  const handleResolve = async (data: {
    opportunityId: string;
    resolutionType: ResolutionType;
    recoveredAmount?: number;
    notes?: string;
  }) => {
    const res = await resolveOpportunity(organizationId, data);
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to resolve opportunity');
    }

    const isConverted = ['appointment_booked', 'treatment_accepted', 'invoice_paid'].includes(
      data.resolutionType
    );

    setOpportunities((prev) =>
      prev.map((item) => {
        if (item.id === data.opportunityId) {
          return {
            ...item,
            status: isConverted ? 'converted' : 'lost',
            resolutionType: data.resolutionType,
            recoveredRevenue: isConverted ? (data.recoveredAmount ?? item.estimatedValue) : null,
          };
        }
        return item;
      })
    );
  };

  const handleSnooze = async (data: {
    opportunityId: string;
    snoozedUntil: string;
    notes?: string;
  }) => {
    const res = await snoozeOpportunity(organizationId, data);
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to snooze opportunity');
    }

    setOpportunities((prev) =>
      prev.map((item) => {
        if (item.id === data.opportunityId) {
          return {
            ...item,
            status: 'snoozed',
            snoozedUntil: data.snoozedUntil,
            nextActionAt: data.snoozedUntil,
          };
        }
        return item;
      })
    );
  };

  return (
    <div className={styles.wrapper}>
      {/* Header & Metric Cards */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Revenue Opportunities</h1>
          <p className={styles.pageSubtitle}>
            Prioritized work queue of unscheduled care, overdue recalls, and recoverable revenue.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="primary"
            onClick={handleRunScan}
            disabled={isPending}
          >
            {isPending ? 'Scanning System...' : 'Run Opportunity Scan'}
          </Button>
        </div>
      </div>

      {scanFeedback && (
        <div className={styles.feedbackBanner}>
          {scanFeedback}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Pipeline Value</span>
          <span className={styles.kpiValue}>
            {formatCurrency(metrics.totalPipelineValue)}
          </span>
          <span className={styles.kpiSubtext}>
            Across {metrics.openOpportunitiesCount} active opportunities
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Recovered Revenue</span>
          <span className={styles.kpiValueSuccess}>
            {formatCurrency(metrics.totalRecoveredRevenue)}
          </span>
          <span className={styles.kpiSubtext}>
            {metrics.convertedCount} converted care cases
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Overdue Recalls</span>
          <span className={styles.kpiValueWarning}>
            {metrics.overdueRecallsCount}
          </span>
          <span className={styles.kpiSubtext}>
            Patients due for periodic hygiene/exam
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Unaccepted Treatments</span>
          <span className={styles.kpiValue}>
            {formatCurrency(metrics.unacceptedTreatmentsValue)}
          </span>
          <span className={styles.kpiSubtext}>
            Presented plans pending patient booking
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className={styles.filterBar}>
        <div className={styles.statusTabs}>
          <button
            type="button"
            className={[styles.statusTab, statusTab === 'active' ? styles.activeStatusTab : ''].join(' ')}
            onClick={() => setStatusTab('active')}
          >
            Active Queue ({opportunities.filter((o) => ['open', 'in_progress', 'snoozed'].includes(o.status)).length})
          </button>
          <button
            type="button"
            className={[styles.statusTab, statusTab === 'converted' ? styles.activeStatusTab : ''].join(' ')}
            onClick={() => setStatusTab('converted')}
          >
            Converted ({opportunities.filter((o) => o.status === 'converted').length})
          </button>
          <button
            type="button"
            className={[styles.statusTab, statusTab === 'lost' ? styles.activeStatusTab : ''].join(' ')}
            onClick={() => setStatusTab('lost')}
          >
            Lost ({opportunities.filter((o) => o.status === 'lost').length})
          </button>
          <button
            type="button"
            className={[styles.statusTab, statusTab === 'all' ? styles.activeStatusTab : ''].join(' ')}
            onClick={() => setStatusTab('all')}
          >
            All ({opportunities.length})
          </button>
        </div>

        <div className={styles.dropdownFilters}>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Opportunity Types' },
              { value: 'unaccepted_treatment', label: 'Unaccepted Treatment' },
              { value: 'overdue_recall', label: 'Overdue Recall' },
              { value: 'cancelled_appointment', label: 'Cancelled Appointment' },
              { value: 'no_show', label: 'No-Show' },
              { value: 'outstanding_balance', label: 'Outstanding Balance' },
            ]}
          />

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' },
              { value: 'low', label: 'Low' },
            ]}
          />
        </div>
      </div>

      {/* Opportunity Work Queue List */}
      <div className={styles.queueContainer}>
        {filteredOpportunities.length === 0 ? (
          <EmptyState
            title="No opportunities found"
            description={
              statusTab === 'active'
                ? "No pending opportunities match your filters. Run an Opportunity Scan or adjust the filter criteria."
                : "No matching records in this view."
            }
            action={
              statusTab === 'active' ? (
                <Button variant="secondary" onClick={handleRunScan}>
                  Scan Now
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={styles.queueList}>
            {filteredOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onSelect={(o) => handleOpenDrawer(o)}
                onLogOutreach={(o) => {
                  setSelectedOpportunity(o);
                  setIsDrawerOpen(true);
                }}
                onResolve={(o) => {
                  setSelectedOpportunity(o);
                  setIsDrawerOpen(true);
                }}
                onSnooze={(o) => {
                  setSelectedOpportunity(o);
                  setIsDrawerOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <OpportunityDetailDrawer
        open={isDrawerOpen}
        organizationId={organizationId}
        opportunity={selectedOpportunity}
        onClose={() => setIsDrawerOpen(false)}
        onLogOutreach={handleLogOutreach}
        onResolve={handleResolve}
        onSnooze={handleSnooze}
      />
    </div>
  );
}
