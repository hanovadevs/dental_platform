import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { billingService } from '@/features/payments';
import { PaymentClient } from './payment-client';

interface PaymentPageProps {
  searchParams: Promise<{
    intentId?: string;
  }>;
}

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    const params = await searchParams;
    const returnUrl = params.intentId ? `/register/payment?intentId=${params.intentId}` : '/register/payment';
    redirect(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  }

  const { intentId } = await searchParams;

  let intent = null;
  if (intentId) {
    intent = await billingService.registration.getIntentById(intentId);
  }

  if (!intent || intent.userId !== session.user.id) {
    intent = await billingService.registration.getLatestIntentForUser(session.user.id);
  }

  if (!intent) {
    redirect('/register');
  }

  if (intent.status === 'completed' && intent.organizationId) {
    redirect('/dashboard');
  }

  if (intent.status === 'paid') {
    redirect(`/register/payment/status?intentId=${intent.id}&status=success`);
  }

  return (
    <PaymentClient
      intentId={intent.id}
      clinicName={intent.clinicName}
      amount={intent.amount}
      currency={intent.currency}
      contactEmail={intent.contactEmail}
      contactPhone={intent.contactPhone}
    />
  );
}
