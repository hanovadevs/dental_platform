import React from 'react';
import styles from './skeleton.module.css';

/**
 * Loading skeleton component.
 * Per spec (06_UI_UX_DESIGN_SYSTEM.md Section 23):
 * - Small local skeletons
 * - Avoid making the entire application blank during small saves
 */
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({
  width,
  height = 16,
  borderRadius,
  className,
}: SkeletonProps) {
  return (
    <div
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: borderRadius || 'var(--radius-sm)',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Text skeleton — multiple lines of text placeholder.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={[styles.textGroup, className].filter(Boolean).join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={14}
        />
      ))}
    </div>
  );
}
