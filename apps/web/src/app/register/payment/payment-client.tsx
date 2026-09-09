'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './payment.module.css';

interface PaymentClientProps {
  intentId: string;
  clinicName: string;
  amount: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
}

export function PaymentClient({
  intentId,
  clinicName,
  amount,
  currency,
  contactEmail,
  contactPhone,
}: PaymentClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleProceed() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/payfast/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.session) {
        throw new Error(data.error || 'Failed to initiate secure checkout session.');
      }

      const { actionUrl, formFields } = data.session;

      // Construct and submit the official PayFast POST form to transfer to hosted checkout
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = actionUrl;
      form.style.display = 'none';

      Object.entries(formFields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandHeader}>
          <img
            src="/logo.png"
            alt="Dental OS Logo"
            className={styles.logo}
          />
          <h1 className={styles.title}>Register Your Dental Clinic</h1>
          <p className={styles.subtitle}>
            Complete your registration to activate your clinic workspace.
          </p>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Clinic Name</span>
            <span className={styles.summaryValue}>{clinicName}</span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Subscription Plan</span>
            <span className={styles.summaryValue}>Dental Revenue OS · Clinic Registration</span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Primary Contact</span>
            <span className={styles.summaryValue}>{contactEmail}</span>
          </div>

          <hr className={styles.divider} />

          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Registration Fee</span>
            <div>
              <span className={styles.currencyTag}>{currency}</span>
              <span className={styles.totalAmount}>{Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className={styles.methodsBox}>
          <span className={styles.methodsTitle}>Payment methods available through Premier PayFast</span>
          <div className={styles.methodsList}>
            <span>Visa</span>
            <span className={styles.methodDot}>·</span>
            <span>Mastercard</span>
            <span className={styles.methodDot}>·</span>
            <span>Raast</span>
            <span className={styles.methodDot}>·</span>
            <span>Bank Account</span>
            <span className={styles.methodDot}>·</span>
            <span>Mobile Wallet</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleProceed}
          disabled={loading}
          className={styles.payButton}
        >
          {loading ? 'Connecting to Premier PayFast...' : 'Continue to Secure Payment'}
        </button>

        <p className={styles.secondaryLink}>
          Already registered?{' '}
          <Link href="/login">Login to your clinic</Link>
        </p>

        <p className={styles.securityNote}>
          Protected by 256-bit TLS encryption. Transactions are processed securely via State Bank of Pakistan regulated Premier PayFast gateway.
        </p>
      </div>
    </div>
  );
}
