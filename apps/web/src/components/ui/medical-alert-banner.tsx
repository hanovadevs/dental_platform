import React from 'react';
import styles from './medical-alert-banner.module.css';

export interface AlertItem {
  id: string;
  label: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
}

export interface MedicalAlertBannerProps {
  alerts: AlertItem[];
  allergies?: { id: string; substance: string; reaction?: string | null; severity: 'low' | 'medium' | 'high' | 'critical' }[];
  className?: string;
}

export function MedicalAlertBanner({ alerts = [], allergies = [], className }: MedicalAlertBannerProps) {
  const activeAlerts = alerts;
  const activeAllergies = allergies;

  if (activeAlerts.length === 0 && activeAllergies.length === 0) {
    return null;
  }

  const hasCritical =
    activeAlerts.some((a) => a.severity === 'critical') ||
    activeAllergies.some((a) => a.severity === 'critical');
  const hasHigh =
    activeAlerts.some((a) => a.severity === 'high') ||
    activeAllergies.some((a) => a.severity === 'high');

  const bannerSeverity = hasCritical ? 'critical' : hasHigh ? 'high' : 'medium';

  return (
    <div
      className={[styles.banner, styles[bannerSeverity], className]
        .filter(Boolean)
        .join(' ')}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.iconColumn} aria-hidden="true">
        ⚠️
      </div>
      <div className={styles.content}>
        <div className={styles.title}>
          <strong>Clinical Medical Alert</strong>
          {hasCritical && <span className={styles.criticalTag}>CRITICAL</span>}
        </div>
        <div className={styles.badges}>
          {activeAlerts.map((alert) => (
            <span
              key={`alert-${alert.id}`}
              className={[styles.alertPill, styles[`pill-${alert.severity}`]].join(' ')}
            >
              {alert.label}
            </span>
          ))}
          {activeAllergies.map((allergy) => (
            <span
              key={`allergy-${allergy.id}`}
              className={[styles.alertPill, styles.allergyPill, styles[`pill-${allergy.severity}`]].join(' ')}
            >
              Allergy: {allergy.substance}
              {allergy.reaction ? ` (${allergy.reaction})` : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
