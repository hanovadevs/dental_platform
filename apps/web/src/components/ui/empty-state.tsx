import React from 'react';
import styles from './empty-state.module.css';

/**
 * Empty state component.
 * Per spec (06_UI_UX_DESIGN_SYSTEM.md Section 22):
 * - Calm and useful
 * - No illustrations unless they add real value
 * - Include an action when possible
 * - No sad emoji or generic "No data" messages
 */
export interface EmptyStateProps {
  title?: string;
  description?: string;
  message?: string;
  action?: React.ReactNode | {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, message, action }: EmptyStateProps) {
  const displayText = description || message;

  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {displayText && <p className={styles.message}>{displayText}</p>}
      {action && (
        <div className={styles.actionWrapper}>
          {React.isValidElement(action) ? (
            action
          ) : typeof action === 'object' && 'label' in action ? (
            <button className={styles.action} onClick={action.onClick}>
              {action.label}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
