import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, paymentRecords, registrationIntents } from '@dental/db';
import { eq } from 'drizzle-orm';
import { billingService } from '@/features/payments';
import { StatusClient } from './status-client';

interface StatusPageProps {
  searchParams: Promise<{
    intentId?: string;
    basketId?: string;
    status?: string;
    error?: string;
  }>;
}

export default async function PaymentStatusPage({ searchParams }: StatusPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { intentId, basketId, status: statusParam, error: errParam } = await searchParams;

  let intent = null;

  if (basketId) {
    const record = await db.query.paymentRecords.findFirst({
      where: eq(paymentRecords.providerReference, basketId),
      with: {
        registrationIntent: true,
      },
    });

    if (record?.registrationIntent) {
      intent = record.registrationIntent;
    }
  }

  if (!intent && intentId) {
    intent = await billingService.registration.getIntentById(intentId);
  }

  if (!intent) {
    intent = await billingService.registration.getLatestIntentForUser(session.user.id);
  }

  if (!intent) {
    redirect('/register');
  }

  // Determine effective status
  let effectiveStatus: 'paid' | 'pending' | 'failed' = 'pending';

  if (intent.status === 'paid' || intent.status === 'completed') {
    effectiveStatus = 'paid';
  } else if (statusParam === 'failed' || intent.status === 'failed') {
    effectiveStatus = 'failed';
  } else {
    effectiveStatus = 'pending';
  }

  return (
    <StatusClient
      intentId={intent.id}
      clinicName={intent.clinicName}
      amount={intent.amount}
      currency={intent.currency}
      status={effectiveStatus}
      basketId={basketId}
      errorMessage={errParam ? decodeURIComponent(errParam) : undefined}
    />
  );
}
