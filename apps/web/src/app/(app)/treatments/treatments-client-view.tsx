'use client';

import React, { useState } from 'react';
import styles from './treatments.module.css';
import { Badge, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { NewProcedureDialog } from './new-procedure-dialog';
import { TreatmentPlanCard } from '@/features/treatments/components/treatment-plan-card';
import { TREATMENT_CATEGORIES } from '@/features/treatments/domain/types';
import Link from 'next/link';

interface TreatmentsClientViewProps {
  organizationId: string;
  catalog: any[];
  recentPlans: any[];
}

export function TreatmentsClientView({
  organizationId,
  catalog,
  recentPlans,
}: TreatmentsClientViewProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'plans'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredCatalog =
    selectedCategory === 'all'
      ? catalog
      : catalog.filter((c) => c.category === selectedCategory);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Treatments & Fee Schedule</h1>
          <p className={styles.subtitle}>
            Standard procedure catalog, pricing, and treatment plans
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            + New Procedure
          </Button>
        </div>
      </div>

      <div className={styles.navTabs}>
        <button
          type="button"
          className={`${styles.tabLink} ${activeTab === 'catalog' ? styles.tabLinkActive : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Procedure Catalog ({catalog.length})
        </button>
        <button
          type="button"
          className={`${styles.tabLink} ${activeTab === 'plans' ? styles.tabLinkActive : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Active Plans ({recentPlans.length})
        </button>
      </div>

      {activeTab === 'catalog' && (
        <div>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
                background: selectedCategory === 'all' ? '#0f172a' : '#fff',
                color: selectedCategory === 'all' ? '#fff' : '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              All Categories
            </button>
            {TREATMENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: `1px solid ${selectedCategory === cat.id ? cat.color : '#cbd5e1'}`,
                  background: selectedCategory === cat.id ? cat.color : '#fff',
                  color: selectedCategory === cat.id ? '#fff' : '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className={styles.cardGrid}>
            {filteredCatalog.map((proc) => (
              <div key={proc.id} className={styles.procCard}>
                <div>
                  <div className={styles.procHeader}>
                    <span className={styles.procCode}>{proc.code}</span>
                    <Badge variant="neutral" style={{ textTransform: 'capitalize' }}>
                      {proc.category}
                    </Badge>
                  </div>
                  <h4 className={styles.procName}>{proc.name}</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className={styles.metaTags}>
                    <span className={styles.metaTag}>⏱ {proc.defaultDurationMinutes} min</span>
                    {proc.toothSpecific && <span className={styles.metaTag}>Tooth Specific</span>}
                    {proc.surfaceSpecific && <span className={styles.metaTag}>Surface Specific</span>}
                  </div>

                  <div className={styles.procFooter}>
                    <span className={styles.procPrice}>
                      {formatCurrency(parseFloat(proc.defaultPrice || '0'))}
                    </span>
                    <span className={styles.procDuration}>Standard Fee</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div>
          {recentPlans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              No treatment plans created yet. Build one from any Patient profile!
            </div>
          ) : (
            recentPlans.map((plan) => (
              <div key={plan.id} style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Patient:</span>
                  <Link
                    href={`/patients/${plan.patientId}?tab=treatments`}
                    style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
                  >
                    {plan.patient?.name} ({plan.patient?.patientNumber})
                  </Link>
                </div>
                <TreatmentPlanCard
                  plan={plan}
                  organizationId={organizationId}
                  onRefresh={() => window.location.reload()}
                />
              </div>
            ))
          )}
        </div>
      )}

      <NewProcedureDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          window.location.reload();
        }}
        organizationId={organizationId}
      />
    </div>
  );
}
