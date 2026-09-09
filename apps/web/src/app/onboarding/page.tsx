import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { billingService } from '@/features/payments';
import { OnboardingClient } from './onboarding-client';

/**
 * Clinic onboarding page.
 * Strictly gatekept by payment verification.
 * Users cannot access this page or create a clinic without a verified paid registration intent.
 */
export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/onboarding');
  }

  // Authoritatively check user entitlement
  const entitlement = await billingService.entitlement.checkUserRegistrationEntitlement(session.user.id);

  // If user already has an active clinic membership, take them to dashboard
  if (entitlement.hasActiveClinic) {
    redirect('/dashboard');
  }

  // If user has not paid registration, redirect to payment checkout screen
  if (!entitlement.canOnboard || !entitlement.paidIntentId) {
    redirect('/register/payment');
  }

  return (
    <OnboardingClient
      defaultClinicName={entitlement.clinicName || ''}
      paidIntentId={entitlement.paidIntentId}
    />
  );
}
