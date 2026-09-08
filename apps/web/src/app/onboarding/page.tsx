'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createOrganization } from '@/features/organizations/server/actions';
import styles from './onboarding.module.css';

/**
 * Clinic onboarding page.
 * Per spec (02_PHASES_AND_ROADMAP.md Phase 1, 10_DEPLOYMENT_OBSERVABILITY_AND_OPERATIONS.md Section 15):
 * "A clinic should not need a technician."
 *
 * Phase 0: Minimal form — clinic name + location.
 * Phase 1 will expand to the full wizard (currency, timezone, working hours, etc.)
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createOrganization(formData);

      if (result.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(result.error?.message ?? 'Failed to create clinic.');
        if (result.error?.fields) {
          setFieldErrors(result.error.fields);
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="Dental OS Logo"
            style={{
              width: '96px',
              height: '96px',
              objectFit: 'contain',
              marginBottom: '16px',
              filter: 'drop-shadow(0 8px 24px rgba(2, 132, 199, 0.25))',
            }}
          />
          <h1 className={styles.title}>Set up your clinic</h1>
          <p className={styles.subtitle}>
            Tell us about your practice to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <Input
            label="Clinic name"
            name="name"
            type="text"
            required
            placeholder="e.g., Smile Dental Clinic"
            error={fieldErrors.name?.[0]}
          />

          <Input
            label="Clinic phone"
            name="phone"
            type="tel"
            placeholder="+92 300 1234567"
            error={fieldErrors.phone?.[0]}
          />

          <Input
            label="Clinic email"
            name="email"
            type="email"
            placeholder="info@yourclinic.com"
            error={fieldErrors.email?.[0]}
          />

          <hr className={styles.divider} />

          <Input
            label="First location name"
            name="locationName"
            type="text"
            required
            placeholder="e.g., Main Branch"
            defaultValue="Main Branch"
          />

          <Input
            label="Location address"
            name="locationAddress"
            type="text"
            placeholder="Street address, city"
          />

          {/* Hidden defaults for Phase 0; Phase 1 wizard will expose these */}
          <input type="hidden" name="defaultCurrency" value="PKR" />
          <input type="hidden" name="defaultTimezone" value="Asia/Karachi" />

          <Button type="submit" loading={loading} fullWidth size="lg">
            Create clinic
          </Button>
        </form>
      </div>
    </div>
  );
}
