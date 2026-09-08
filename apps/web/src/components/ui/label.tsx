import React from 'react';
import styles from './label.module.css';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
  hint?: string;
}

export function Label({
  children,
  required,
  optional,
  hint,
  className,
  ...props
}: LabelProps) {
  return (
    <div className={styles.labelWrapper}>
      <label
        className={[styles.label, className].filter(Boolean).join(' ')}
        {...props}
      >
        <span>{children}</span>
        {required && <span className={styles.required} aria-hidden="true">*</span>}
        {optional && <span className={styles.optional}>(optional)</span>}
      </label>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
