'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerClinicAccount } from '@/features/auth/server/actions';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await registerClinicAccount(formData);

      if (result.success && result.intentId) {
        // Authenticate immediately so the user session is active for the payment checkout
        const loginRes = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (loginRes?.error) {
          router.push(`/login?intentId=${result.intentId}&registered=1`);
        } else {
          router.push(`/register/payment?intentId=${result.intentId}`);
        }
      } else {
        setError(result.error?.message ?? 'Registration failed.');
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
              width: '100px',
              height: '100px',
              objectFit: 'contain',
              marginBottom: '16px',
              filter: 'drop-shadow(0 8px 24px rgba(2, 132, 199, 0.25))',
            }}
          />
          <h1 className={styles.title}>Register Your Dental Clinic</h1>
          <p className={styles.subtitle}>
            Enter your practice details to initiate clinic registration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <div className={styles.row}>
            <Input
              label="First name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              placeholder="Dr. Sarah"
              error={fieldErrors.firstName?.[0]}
            />
            <Input
              label="Last name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              placeholder="Ahmed"
              error={fieldErrors.lastName?.[0]}
            />
          </div>

          <Input
            label="Clinic / Practice Name"
            name="clinicName"
            type="text"
            required
            placeholder="e.g. Apex Dental Hospital"
            error={fieldErrors.clinicName?.[0]}
          />

          <div className={styles.row}>
            <Input
              label="Contact Phone"
              name="phone"
              type="tel"
              required
              placeholder="03001234567"
              error={fieldErrors.phone?.[0]}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="doctor@clinic.com"
              error={fieldErrors.email?.[0]}
            />
          </div>

          <div className={styles.row}>
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="At least 8 characters"
              error={fieldErrors.password?.[0]}
            />
            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Re-enter password"
              error={fieldErrors.confirmPassword?.[0]}
            />
          </div>

          <Button type="submit" loading={loading} fullWidth size="lg">
            Continue to Payment
          </Button>
        </form>

        <p className={styles.footer}>
          Already registered?{' '}
          <Link href="/login">Login to your clinic</Link>
        </p>
      </div>
    </div>
  );
}
