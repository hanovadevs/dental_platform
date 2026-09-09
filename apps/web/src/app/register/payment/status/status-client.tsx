'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../payment.module.css';

interface StatusClientProps {
  intentId: string;
  clinicName: string;
  amount: string;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  basketId?: string;
  errorMessage?: string;
}

export function StatusClient({
  intentId,
  clinicName,
  amount,
  currency,
  status,
  basketId,
  errorMessage,
}: StatusClientProps) {
  const router = useRouter();

  // If pending, poll every 3 seconds to detect callback confirmation
  useEffect(() => {
    if (status === 'pending') {
      const timer = setTimeout(() => {
        router.refresh();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandHeader}>
          <img
            src="/logo.png"
            alt="Dental OS Logo"
            className={styles.logo}
          />

          {status === 'paid' && (
            <>
              <div className={styles.statusIconSuccess}>✓</div>
              <h1 className={styles.title}>Payment Successful</h1>
              <p className={styles.subtitle}>
                Your dental clinic registration is ready.
              </p>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className={styles.statusIconPending}>⟳</div>
              <h1 className={styles.title}>Verifying Payment</h1>
              <p className={styles.subtitle}>
                We are confirming your transaction with Premier PayFast. Please hold on.
              </p>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className={styles.statusIconFailed}>✕</div>
              <h1 className={styles.title}>Payment Could Not Be Completed</h1>
              <p className={styles.subtitle}>
                {errorMessage || 'The payment gateway was unable to authorize your transaction.'}
              </p>
            </>
          )}
        </div>

        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Clinic Name</span>
            <span className={styles.summaryValue}>{clinicName}</span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Registration Plan</span>
            <span className={styles.summaryValue}>Dental Revenue OS · Active Registration</span>
          </div>

          {basketId && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Reference Code</span>
              <span className={styles.summaryValue} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{basketId}</span>
            </div>
          )}

          <hr className={styles.divider} />

          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Amount</span>
            <div>
              <span className={styles.currencyTag}>{currency}</span>
              <span className={styles.totalAmount}>{Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {status === 'paid' && (
          <Link href="/onboarding" className={styles.payButton}>
            Set Up Your Dental Clinic
          </Link>
        )}

        {status === 'pending' && (
          <button
            type="button"
            onClick={() => router.refresh()}
            className={styles.payButton}
          >
            Check Status Again
          </button>
        )}

        {status === 'failed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              href={`/register/payment?intentId=${intentId}`}
              className={styles.payButton}
            >
              Try Again
            </Link>
            <Link
              href="/register"
              style={{
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#64748b',
                textDecoration: 'none',
                padding: '8px',
              }}
            >
              Return to Registration
            </Link>
          </div>
        )}

        <p className={styles.securityNote}>
          Transactions are logged with cryptographically verified checksums and State Bank of Pakistan compliant gateway protocols.
        </p>
      </div>
    </div>
  );
}
