'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerUser } from '@/features/auth/server/actions';
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

    const formData = new FormData(e.currentTarget);

    try {
      const result = await registerUser(formData);

      if (result.success) {
        // Redirect to login after registration
        router.push('/login?registered=1');
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
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>
            Set up your account, then configure your clinic.
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
              error={fieldErrors.firstName?.[0]}
            />
            <Input
              label="Last name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              error={fieldErrors.lastName?.[0]}
            />
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@clinic.com"
            error={fieldErrors.email?.[0]}
          />

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
            placeholder="Re-enter your password"
            error={fieldErrors.confirmPassword?.[0]}
          />

          <Button type="submit" loading={loading} fullWidth size="lg">
            Create account
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
