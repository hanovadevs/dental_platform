'use client';

import React, { useState, useEffect } from 'react';
import { Button, Badge } from '@/components/ui';
import {
  SubscriptionStatusData,
  updateSubscriptionPlan,
} from '@/features/subscriptions/server/actions';
import { exportCompletePracticeArchive } from '@/features/admin/server/data-management-actions';
import { PlanTier, SUBSCRIPTION_PLANS } from '@/features/subscriptions/domain/plans';
import styles from './subscription.module.css';

interface SubscriptionClientViewProps {
  organizationId: string;
  initialSubscription: SubscriptionStatusData;
}

export function SubscriptionClientView({
  organizationId,
  initialSubscription,
}: SubscriptionClientViewProps) {
  const [sub, setSub] = useState<SubscriptionStatusData>(initialSubscription);
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live health diagnostic state
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setHealthStatus(data);
          setHealthLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setHealthStatus({ status: 'unreachable', error: err instanceof Error ? err.message : 'Unknown error' });
          setHealthLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthStatus(data);
    } catch (err: unknown) {
      setHealthStatus({ status: 'unreachable', error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setHealthLoading(false);
    }
  };

  const handlePlanChange = async (plan: PlanTier) => {
    if (plan === sub.plan) return;
    setUpdatingTier(plan);
    setErrorMsg(null);

    try {
      const res = await updateSubscriptionPlan(organizationId, plan);
      if (res.success && res.data) {
        const planDef = SUBSCRIPTION_PLANS[plan];
        setSub((prev) => ({
          ...prev,
          plan: res.data!.plan,
          planName: planDef.name,
          priceMonthly: planDef.priceMonthly,
          maxLocations: planDef.maxLocations,
          maxChairs: planDef.maxChairs,
          features: planDef.features,
        }));
      } else {
        setErrorMsg(res.error?.message || 'Failed to update subscription tier');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUpdatingTier(null);
    }
  };

  const handleExportArchive = async () => {
    setExporting(true);
    setErrorMsg(null);
    setExportSuccess(null);

    try {
      const res = await exportCompletePracticeArchive(organizationId);
      if (res.success && res.data) {
        // Trigger browser download of JSON archive
        const blob = new Blob([res.data.exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportSuccess(`Practice archive (${res.data.fileName}) exported successfully!`);
      } else {
        setErrorMsg(res.error?.message || 'Failed to export practice archive');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setExporting(false);
    }
  };

  const locPct = Math.min(100, Math.round((sub.currentLocations / sub.maxLocations) * 100));
  const chairPct = Math.min(100, Math.round((sub.currentChairs / sub.maxChairs) * 100));

  return (
    <div>
      {errorMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {exportSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          ✓ {exportSuccess}
        </div>
      )}

      {/* 1. Current Plan & Usage Quotas */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Current Plan & Capacity Quotas</h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Active tier: <strong>{sub.planName}</strong> (${sub.priceMonthly}/mo)
            </div>
          </div>
          <Badge variant={sub.status === 'active' ? 'success' : 'warning'}>
            {sub.status.toUpperCase()}
          </Badge>
        </div>

        <div className={styles.quotaGrid}>
          <div className={styles.quotaCard}>
            <div className={styles.quotaLabel}>Branch Locations</div>
            <div className={styles.quotaValue}>
              {sub.currentLocations} <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 400 }}>/ {sub.maxLocations >= 999 ? 'Unlimited' : sub.maxLocations}</span>
            </div>
            {sub.maxLocations < 999 && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${locPct}%`, backgroundColor: locPct >= 100 ? '#ef4444' : 'var(--color-primary)' }} />
              </div>
            )}
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {sub.maxLocations >= 999 ? 'Enterprise Multi-Site Enabled' : `${sub.maxLocations - sub.currentLocations} location slot(s) remaining`}
            </div>
          </div>

          <div className={styles.quotaCard}>
            <div className={styles.quotaLabel}>Operatory Chairs</div>
            <div className={styles.quotaValue}>
              {sub.currentChairs} <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 400 }}>/ {sub.maxChairs >= 999 ? 'Unlimited' : sub.maxChairs}</span>
            </div>
            {sub.maxChairs < 999 && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${chairPct}%`, backgroundColor: chairPct >= 100 ? '#ef4444' : 'var(--color-primary)' }} />
              </div>
            )}
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {sub.maxChairs >= 999 ? 'Unlimited Operatories' : `${sub.maxChairs - sub.currentChairs} chair slot(s) remaining`}
            </div>
          </div>

          <div className={styles.quotaCard}>
            <div className={styles.quotaLabel}>Active Patient Base</div>
            <div className={styles.quotaValue}>{sub.totalPatients}</div>
            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '8px' }}>
              ✓ Unlimited patient records across all tiers
            </div>
          </div>
        </div>
      </section>

      {/* 2. Commercial Plan Selector */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Available Subscription Tiers</h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Scale your practice capacity with instant feature activation.
            </div>
          </div>
        </div>

        <div className={styles.plansGrid}>
          {(['starter', 'growth', 'enterprise'] as PlanTier[]).map((tierKey) => {
            const plan = SUBSCRIPTION_PLANS[tierKey];
            const isCurrent = sub.plan === tierKey;

            return (
              <div
                key={tierKey}
                className={[styles.planCard, isCurrent ? styles.planCardActive : ''].join(' ')}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div className={styles.planName}>{plan.name}</div>
                    {isCurrent && <Badge variant="success" size="sm">ACTIVE PLAN</Badge>}
                  </div>
                  <div className={styles.planPrice}>
                    ${plan.priceMonthly}<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--color-text-muted)' }}>/mo</span>
                  </div>
                  <p className={styles.planDesc}>{plan.description}</p>

                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    Capacity & Features
                  </div>
                  <ul className={styles.featuresList}>
                    <li className={styles.featureItem}>
                      <span>✓</span> <strong>{plan.maxLocations >= 999 ? 'Unlimited' : plan.maxLocations}</strong> Location(s)
                    </li>
                    <li className={styles.featureItem}>
                      <span>✓</span> <strong>{plan.maxChairs >= 999 ? 'Unlimited' : plan.maxChairs}</strong> Operatory Chair(s)
                    </li>
                    {plan.features.slice(4).map((f) => (
                      <li key={f} className={styles.featureItem}>
                        <span>✓</span> {f.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Button
                    variant={isCurrent ? 'ghost' : 'primary'}
                    style={{ width: '100%' }}
                    disabled={isCurrent || updatingTier !== null}
                    onClick={() => handlePlanChange(tierKey)}
                  >
                    {updatingTier === tierKey
                      ? 'Updating Plan...'
                      : isCurrent
                      ? 'Current Tier'
                      : `Switch to ${plan.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Data Portability & GDPR Archive */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Data Portability & Backup Export</h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Download a complete machine-readable JSON backup of your practice data (patients, appointments, procedures, invoices, inventory, lab cases).
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleExportArchive}
            disabled={exporting}
          >
            {exporting ? 'Generating Archive...' : '📥 Export Practice Archive (JSON)'}
          </Button>
        </div>
      </section>

      {/* 4. Live System Health & Observability */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>System Diagnostics & Platform Health</h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Real-time connectivity verification against PostgreSQL and core services.
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchHealth} disabled={healthLoading}>
            {healthLoading ? 'Testing...' : '🔄 Recheck'}
          </Button>
        </div>

        <div>
          <div className={styles.diagRow}>
            <span>Database Connection</span>
            <strong>
              {healthStatus?.checks?.database?.status === 'healthy' ? (
                <span style={{ color: '#16a34a' }}>● Connected ({healthStatus.checks.database.latencyMs}ms)</span>
              ) : (
                <span style={{ color: '#ef4444' }}>● Disconnected</span>
              )}
            </strong>
          </div>
          <div className={styles.diagRow}>
            <span>Runtime Environment</span>
            <span>{healthStatus?.checks?.app?.environment || 'development'}</span>
          </div>
          <div className={styles.diagRow}>
            <span>Process Uptime</span>
            <span>{healthStatus?.uptimeSeconds ? `${healthStatus.uptimeSeconds} seconds` : '—'}</span>
          </div>
          <div className={styles.diagRow}>
            <span>Active Feature Flags</span>
            <span>{sub.features.length} enabled</span>
          </div>
        </div>
      </section>
    </div>
  );
}
