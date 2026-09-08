'use client';

import React, { useState, useTransition } from 'react';
import { Button, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  ExecutiveDashboardData,
  AnalyticsPeriod,
} from '@/features/analytics/domain/types';
import {
  getExecutiveDashboard,
  exportAnalyticsCsv,
} from '@/features/analytics/server/actions';
import styles from './reports.module.css';

export interface ReportsClientViewProps {
  organizationId: string;
  initialData: ExecutiveDashboardData;
  locations: any[];
}

export function ReportsClientView({
  organizationId,
  initialData,
  locations,
}: ReportsClientViewProps) {
  const [data, setData] = useState<ExecutiveDashboardData>(initialData);
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    setPeriod(newPeriod);
    loadDashboard(newPeriod, selectedLocationId);
  };

  const handleLocationChange = (newLocationId: string) => {
    setSelectedLocationId(newLocationId);
    loadDashboard(period, newLocationId);
  };

  const loadDashboard = (p: AnalyticsPeriod, locId: string) => {
    startTransition(async () => {
      const res = await getExecutiveDashboard(organizationId, {
        period: p,
        locationId: locId === 'all' ? undefined : locId,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportAnalyticsCsv(organizationId, {
        period,
        locationId: selectedLocationId === 'all' ? undefined : selectedLocationId,
      });

      if (res.success && res.data) {
        // Trigger browser file download
        const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.data.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export analytics report', err);
    } finally {
      setIsExporting(false);
    }
  };

  const kpi = data.kpis;

  // Calculate max values for bar chart scaling
  const maxBarValue = Math.max(
    ...data.timeSeries.map((t) => Math.max(t.production, t.collections)),
    100
  );

  return (
    <div className={styles.container}>
      {/* Header & Controls */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Practice Analytics & Executive Reporting</h1>
          <p className={styles.subtitle}>
            Performance metrics, chair utilization, practitioner scorecards, and financial velocity for{' '}
            <strong>{data.periodLabel}</strong>.
          </p>
        </div>

        <div className={styles.headerControls}>
          <select
            className={styles.periodSelect}
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value as AnalyticsPeriod)}
            disabled={isPending}
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="ytd">Year to Date (YTD)</option>
          </select>

          {locations.length > 1 && (
            <select
              className={styles.periodSelect}
              value={selectedLocationId}
              onChange={(e) => handleLocationChange(e.target.value)}
              disabled={isPending}
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || isPending}
          >
            {isExporting ? 'Generating...' : '📥 Export CSV'}
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Gross Production */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Gross Production</span>
          <span className={styles.kpiValue}>{formatCurrency(kpi.production)}</span>
          <div className={styles.kpiFooter}>
            <span
              className={
                kpi.deltas.productionChangePct >= 0
                  ? styles.deltaPositive
                  : styles.deltaNegative
              }
            >
              {kpi.deltas.productionChangePct >= 0 ? '▲' : '▼'}{' '}
              {Math.abs(kpi.deltas.productionChangePct)}%
            </span>
            <span className={styles.deltaPeriod}>vs prior period</span>
          </div>
        </div>

        {/* Card 2: Total Collections */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Collections</span>
          <span className={styles.kpiValue}>{formatCurrency(kpi.collections)}</span>
          <div className={styles.kpiFooter}>
            <Badge variant="success" size="sm">
              {kpi.collectionRate}% RATE
            </Badge>
            <span className={styles.deltaPeriod}>
              {formatCurrency(kpi.outstandingBalance)} open
            </span>
          </div>
        </div>

        {/* Card 3: Treatment Plan Acceptance */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Treatment Acceptance</span>
          <span className={styles.kpiValue}>{kpi.treatmentAcceptanceRate}%</span>
          <div className={styles.kpiFooter}>
            <span className={styles.deltaPeriod}>
              {formatCurrency(kpi.totalAcceptedAmount)} accepted / {formatCurrency(kpi.totalProposedAmount)}
            </span>
          </div>
        </div>

        {/* Card 4: Chair Utilization */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Chair Utilization</span>
          <span className={styles.kpiValue}>{kpi.chairUtilizationRate}%</span>
          <div className={styles.kpiFooter}>
            <span className={styles.deltaPeriod}>Active operatory occupancy</span>
          </div>
        </div>

        {/* Card 5: Attendance / No-Show Rate */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>No-Show / Cancel</span>
          <span className={styles.kpiValue}>
            {kpi.noShowRate}% <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/ {kpi.cancellationRate}%</span>
          </span>
          <div className={styles.kpiFooter}>
            <span className={styles.deltaPeriod}>
              {kpi.completedAppointments} completed ({kpi.totalAppointments} scheduled)
            </span>
          </div>
        </div>

        {/* Card 6: Recovered Pipeline Revenue */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Recovered Care Value</span>
          <span className={styles.kpiValue} style={{ color: '#16a34a' }}>
            {formatCurrency(kpi.recoveredRevenue)}
          </span>
          <div className={styles.kpiFooter}>
            <span className={styles.deltaPeriod}>Via Revenue Opportunity Engine</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className={styles.chartsRow}>
        {/* Production vs Collection Time Series */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Production vs Collections Trend</h2>
            <div className={styles.chartLegend}>
              <span>
                <span className={styles.legendDotProduction} /> Production
              </span>
              <span>
                <span className={styles.legendDotCollection} /> Collections
              </span>
            </div>
          </div>

          <div className={styles.barChartContainer}>
            {data.timeSeries.map((pt, idx) => {
              const prodHeight = Math.max(4, Math.round((pt.production / maxBarValue) * 160));
              const collHeight = Math.max(4, Math.round((pt.collections / maxBarValue) * 160));

              return (
                <div key={idx} className={styles.barGroup} title={`${pt.label}: Production $${pt.production} | Collections $${pt.collections}`}>
                  <div className={styles.barsPair}>
                    <div
                      className={styles.barProduction}
                      style={{ height: `${prodHeight}px` }}
                    />
                    <div
                      className={styles.barCollection}
                      style={{ height: `${collHeight}px` }}
                    />
                  </div>
                  <span className={styles.barLabel}>{pt.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Procedure Revenue by Category */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Revenue by Clinical Specialty</h2>
          </div>

          {data.categories.length === 0 ? (
            <div className={styles.emptyState}>No procedure data in this period.</div>
          ) : (
            <div className={styles.categoryList}>
              {data.categories.map((cat) => (
                <div key={cat.category} className={styles.categoryItem}>
                  <div className={styles.categoryMeta}>
                    <span>{cat.category}</span>
                    <span>
                      {formatCurrency(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className={styles.categoryBarTrack}>
                    <div
                      className={styles.categoryBarFill}
                      style={{ width: `${Math.max(5, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dentist Performance Scorecard Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2 className={styles.chartTitle}>Practitioner Performance Scorecard</h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Clinical productivity and hourly value generated
          </span>
        </div>

        {data.dentists.length === 0 ? (
          <div className={styles.emptyState}>No practitioner data available for this range.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Practitioner</th>
                  <th className={styles.numberCol}>Procedures</th>
                  <th className={styles.numberCol}>Appointments</th>
                  <th className={styles.numberCol}>Hours</th>
                  <th className={styles.numberCol}>Gross Production</th>
                  <th className={styles.numberCol}>Collections</th>
                  <th className={styles.numberCol}>Production / Hr</th>
                </tr>
              </thead>
              <tbody>
                {data.dentists.map((d) => (
                  <tr key={d.dentistId}>
                    <td>
                      <div className={styles.dentistName}>{d.name}</div>
                      <div className={styles.dentistSub}>{d.specialty}</div>
                    </td>
                    <td className={styles.numberCol}>{d.procedureCount}</td>
                    <td className={styles.numberCol}>{d.appointmentCount}</td>
                    <td className={styles.numberCol}>{d.hoursWorked} hrs</td>
                    <td className={styles.numberCol}>
                      <strong>{formatCurrency(d.production)}</strong>
                    </td>
                    <td className={styles.numberCol}>{formatCurrency(d.collections)}</td>
                    <td className={styles.numberCol} style={{ color: '#0284c7', fontWeight: 600 }}>
                      {formatCurrency(d.productionPerHour)}/hr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Location Efficiency Comparison Table (if multiple locations) */}
      {data.locations.length > 0 && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.chartTitle}>Branch & Chair Utilization</h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Cross-location operational performance
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Practice Location</th>
                  <th className={styles.numberCol}>Operatory Chairs</th>
                  <th className={styles.numberCol}>Patient Visits</th>
                  <th className={styles.numberCol}>Production</th>
                  <th className={styles.numberCol}>Collections</th>
                  <th className={styles.numberCol}>Chair Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {data.locations.map((loc) => (
                  <tr key={loc.locationId}>
                    <td>
                      <strong>{loc.name}</strong>
                    </td>
                    <td className={styles.numberCol}>{loc.chairCount} chairs</td>
                    <td className={styles.numberCol}>{loc.appointmentCount}</td>
                    <td className={styles.numberCol}>{formatCurrency(loc.production)}</td>
                    <td className={styles.numberCol}>{formatCurrency(loc.collections)}</td>
                    <td className={styles.numberCol}>
                      <Badge variant="info" size="sm">
                        {loc.utilizationRate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
