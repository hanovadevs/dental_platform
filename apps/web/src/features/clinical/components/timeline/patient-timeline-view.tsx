'use client';

import React, { useState } from 'react';
import styles from './timeline.module.css';
import { Badge, EmptyState } from '@/components/ui';
import { TimelineEvent } from '../../server/actions';

interface PatientTimelineViewProps {
  events: TimelineEvent[];
}

export function PatientTimelineView({ events }: PatientTimelineViewProps) {
  const [filter, setFilter] = useState<'all' | 'condition' | 'note' | 'alert'>('all');

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    return e.type === filter;
  });

  const getNodeColor = (type: string, severity?: string) => {
    switch (type) {
      case 'note':
        return '#16a34a'; // Green
      case 'condition':
        return '#0284c7'; // Primary blue
      case 'alert':
        return severity === 'critical' || severity === 'high' ? '#dc2626' : '#d97706';
      case 'registration':
        return '#64748b';
      default:
        return '#0284c7';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>Unified Patient History & Timeline</h2>
          <p className={styles.subtitle}>
            Chronological audit of clinical charting, signed progress notes, and medical alerts.
          </p>
        </div>

        <div className={styles.filterBar}>
          <button
            type="button"
            className={[styles.filterPill, filter === 'all' ? styles.filterPillActive : ''].join(' ')}
            onClick={() => setFilter('all')}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            className={[styles.filterPill, filter === 'condition' ? styles.filterPillActive : ''].join(' ')}
            onClick={() => setFilter('condition')}
          >
            Dental Chart ({events.filter((e) => e.type === 'condition').length})
          </button>
          <button
            type="button"
            className={[styles.filterPill, filter === 'note' ? styles.filterPillActive : ''].join(' ')}
            onClick={() => setFilter('note')}
          >
            Clinical Notes ({events.filter((e) => e.type === 'note').length})
          </button>
          <button
            type="button"
            className={[styles.filterPill, filter === 'alert' ? styles.filterPillActive : ''].join(' ')}
            onClick={() => setFilter('alert')}
          >
            Alerts ({events.filter((e) => e.type === 'alert').length})
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No timeline events found"
          description="Timeline events will populate automatically as charting findings and clinical notes are recorded."
        />
      ) : (
        <div className={styles.timelineFeed}>
          {filteredEvents.map((item) => {
            const color = getNodeColor(item.type, item.severity);
            const dateObj = new Date(item.timestamp);

            return (
              <div key={item.id} className={styles.timelineItem}>
                <div
                  className={styles.timelineNode}
                  style={{
                    borderColor: color,
                    boxShadow: `0 0 0 3px ${color}25`,
                  }}
                />

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <Badge variant="neutral">{item.type.toUpperCase()}</Badge>
                      {item.severity && (
                        <Badge
                          variant={
                            item.severity === 'critical' || item.severity === 'high'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {item.severity}
                        </Badge>
                      )}
                    </div>

                    <span className={styles.itemDate}>
                      {dateObj.toLocaleDateString()} at{' '}
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {item.description && (
                    <p className={styles.itemDesc}>{item.description}</p>
                  )}

                  {item.authorName && (
                    <span className={styles.authorMeta}>
                      Recorded by {item.authorName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
