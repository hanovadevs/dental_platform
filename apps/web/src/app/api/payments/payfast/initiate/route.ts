import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { billingService } from '@/features/payments';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { intentId } = body;

    if (!intentId || typeof intentId !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid intentId is required.' }, { status: 400 });
    }

    const checkoutSession = await billingService.initiateRegistrationCheckout(
      intentId,
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      session: checkoutSession,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to initiate PayFast checkout.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
