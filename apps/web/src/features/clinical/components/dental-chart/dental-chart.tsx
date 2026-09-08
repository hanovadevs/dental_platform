'use client';

import React, { useState } from 'react';
import styles from './dental-chart.module.css';
import {
  ADULT_TEETH,
  ToothDefinition,
  TOOTH_CONDITIONS_CATALOG,
} from '../../domain/teeth';
import { ToothSvg } from './tooth-svg';
import { ToothDetailPanel, ToothConditionRecord } from './tooth-detail-panel';
import { Badge } from '@/components/ui';

interface DentalChartProps {
  organizationId: string;
  patientId: string;
  conditions: ToothConditionRecord[];
}

export function DentalChart({
  organizationId,
  patientId,
  conditions,
}: DentalChartProps) {
  const [notation, setNotation] = useState<'fdi' | 'universal'>('fdi');
  const [selectedTooth, setSelectedTooth] = useState<ToothDefinition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Split teeth into Quadrants:
  // Upper Right (Q1): 18 -> 11
  const q1 = ADULT_TEETH.filter((t) => t.quadrant === 1);
  // Upper Left (Q2): 21 -> 28
  const q2 = ADULT_TEETH.filter((t) => t.quadrant === 2);
  // Lower Right (Q4): 48 -> 41
  const q4 = ADULT_TEETH.filter((t) => t.quadrant === 4).reverse();
  // Lower Left (Q3): 31 -> 38
  const q3 = ADULT_TEETH.filter((t) => t.quadrant === 3).reverse();

  const handleSelectTooth = (tooth: ToothDefinition) => {
    setSelectedTooth(tooth);
    setDrawerOpen(true);
  };

  // Metrics calculation
  const activeConditions = conditions.filter((c) => c.active);
  const missingCount = activeConditions.filter((c) => c.conditionType === 'missing').length;
  const cariesCount = activeConditions.filter(
    (c) => c.conditionType === 'caries' || c.conditionType === 'fracture' || c.conditionType === 'extraction_recommended'
  ).length;
  const treatedCount = activeConditions.filter(
    (c) => c.conditionType === 'filling' || c.conditionType === 'crown' || c.conditionType === 'root_canal' || c.conditionType === 'implant'
  ).length;
  const watchCount = activeConditions.filter((c) => c.conditionType === 'watch').length;

  const affectedTeethSet = new Set(activeConditions.map((c) => c.toothCode));
  const soundTeethCount = 32 - affectedTeethSet.size;

  return (
    <div className={styles.chartContainer}>
      {/* Header & Controls */}
      <div className={styles.chartHeader}>
        <div className={styles.titleArea}>
          <h2 className={styles.chartTitle}>Interactive Dental Odontogram</h2>
          <Badge variant="neutral">Adult Dentition (32)</Badge>
        </div>

        <div className={styles.controls}>
          <div className={styles.toggleGroup} role="group" aria-label="Teeth numbering system">
            <button
              type="button"
              className={[styles.toggleButton, notation === 'fdi' ? styles.toggleButtonActive : ''].join(' ')}
              onClick={() => setNotation('fdi')}
              title="FDI Two-Digit ISO 3950 (11–48)"
            >
              FDI Notation
            </button>
            <button
              type="button"
              className={[styles.toggleButton, notation === 'universal' ? styles.toggleButtonActive : ''].join(' ')}
              onClick={() => setNotation('universal')}
              title="Universal American (1–32)"
            >
              Universal (#1–32)
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className={styles.summaryCards}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Sound / Healthy</span>
          <span className={styles.metricValue} style={{ color: '#16a34a' }}>
            {soundTeethCount}
          </span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Needs Treatment</span>
          <span className={styles.metricValue} style={{ color: '#dc2626' }}>
            {cariesCount}
          </span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Restored / Treated</span>
          <span className={styles.metricValue} style={{ color: '#2563eb' }}>
            {treatedCount}
          </span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Watch / Monitor</span>
          <span className={styles.metricValue} style={{ color: '#ca8a04' }}>
            {watchCount}
          </span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Missing</span>
          <span className={styles.metricValue} style={{ color: '#64748b' }}>
            {missingCount}
          </span>
        </div>
      </div>

      {/* Main Odontogram Section */}
      <div className={styles.odontogramWrapper}>
        {/* UPPER ARCH (MAXILLARY) */}
        <div className={styles.archSection}>
          <div className={styles.archHeader}>
            <span>Maxillary Right (Q1)</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Upper Arch (Maxilla)</span>
            <span>Maxillary Left (Q2)</span>
          </div>

          <div className={styles.teethRow}>
            {/* Quadrant 1: 18 -> 11 */}
            <div className={styles.quadrantGroup}>
              {q1.map((tooth) => (
                <ToothSvg
                  key={tooth.fdi}
                  tooth={tooth}
                  displayNumber={notation === 'fdi' ? tooth.fdi : tooth.universal}
                  conditions={conditions.filter((c) => c.toothCode === tooth.fdi)}
                  isSelected={selectedTooth?.fdi === tooth.fdi && drawerOpen}
                  onSelect={handleSelectTooth}
                />
              ))}
            </div>

            {/* Midline */}
            <div className={styles.midlineDivider}>
              <span className={styles.midlineLabel}>Midline</span>
            </div>

            {/* Quadrant 2: 21 -> 28 */}
            <div className={styles.quadrantGroup}>
              {q2.map((tooth) => (
                <ToothSvg
                  key={tooth.fdi}
                  tooth={tooth}
                  displayNumber={notation === 'fdi' ? tooth.fdi : tooth.universal}
                  conditions={conditions.filter((c) => c.toothCode === tooth.fdi)}
                  isSelected={selectedTooth?.fdi === tooth.fdi && drawerOpen}
                  onSelect={handleSelectTooth}
                />
              ))}
            </div>
          </div>
        </div>

        {/* LOWER ARCH (MANDIBULAR) */}
        <div className={styles.archSection}>
          <div className={styles.teethRow}>
            {/* Quadrant 4: 48 -> 41 */}
            <div className={styles.quadrantGroup}>
              {q4.map((tooth) => (
                <ToothSvg
                  key={tooth.fdi}
                  tooth={tooth}
                  displayNumber={notation === 'fdi' ? tooth.fdi : tooth.universal}
                  conditions={conditions.filter((c) => c.toothCode === tooth.fdi)}
                  isSelected={selectedTooth?.fdi === tooth.fdi && drawerOpen}
                  onSelect={handleSelectTooth}
                />
              ))}
            </div>

            {/* Midline */}
            <div className={styles.midlineDivider}>
              <span className={styles.midlineLabel}>Midline</span>
            </div>

            {/* Quadrant 3: 31 -> 38 */}
            <div className={styles.quadrantGroup}>
              {q3.map((tooth) => (
                <ToothSvg
                  key={tooth.fdi}
                  tooth={tooth}
                  displayNumber={notation === 'fdi' ? tooth.fdi : tooth.universal}
                  conditions={conditions.filter((c) => c.toothCode === tooth.fdi)}
                  isSelected={selectedTooth?.fdi === tooth.fdi && drawerOpen}
                  onSelect={handleSelectTooth}
                />
              ))}
            </div>
          </div>

          <div className={styles.archHeader} style={{ marginTop: 'var(--space-2)' }}>
            <span>Mandibular Right (Q4)</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Lower Arch (Mandible)</span>
            <span>Mandibular Left (Q3)</span>
          </div>
        </div>
      </div>

      {/* Accessible Condition Color Legend */}
      <div className={styles.legendBar}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Legend:</span>
        {Object.values(TOOTH_CONDITIONS_CATALOG).map((meta) => (
          <div key={meta.code} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: meta.color }} />
            <span>{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Tooth Detail Drawer */}
      <ToothDetailPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        organizationId={organizationId}
        patientId={patientId}
        tooth={selectedTooth}
        conditions={conditions}
      />
    </div>
  );
}
