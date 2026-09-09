import { NextRequest, NextResponse } from 'next/server';
import { billingService, PAYMENT_CONFIG } from '@/features/payments';

async function parsePayload(req: NextRequest): Promise<Record<string, string | undefined>> {
  const payload: Record<string, string | undefined> = {};

  // Parse query params
  req.nextUrl.searchParams.forEach((val, key) => {
    payload[key] = val;
  });

  // Parse body if POST
  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        formData.forEach((val, key) => {
          if (typeof val === 'string') {
            payload[key] = val;
          }
        });
      } catch {
        // Form data parse error
      }
    } else if (contentType.includes('application/json')) {
      try {
        const json = await req.json();
        Object.entries(json).forEach(([k, v]) => {
          payload[k] = typeof v === 'string' ? v : String(v);
        });
      } catch {
        // JSON parse error
      }
    }
  }

  return payload;
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}

async function handleCallback(req: NextRequest) {
  try {
    const rawPayload = await parsePayload(req);
    const verification = await billingService.handlePayFastCallback({ rawPayload });

    const basketId = verification.basketId;
    const isBrowserRedirect = req.headers.get('accept')?.includes('text/html') || req.method === 'GET' || rawPayload.redirect === 'Y';

    if (isBrowserRedirect) {
      const appUrl = PAYMENT_CONFIG.getAppUrl();
      const statusParam = verification.isPaid ? 'success' : 'failed';
      const redirectUrl = new URL(`${appUrl}/register/payment/status`);
      if (basketId) redirectUrl.searchParams.set('basketId', basketId);
      redirectUrl.searchParams.set('status', statusParam);
      if (verification.errorMessage) {
        redirectUrl.searchParams.set('error', encodeURIComponent(verification.errorMessage));
      }

      return NextResponse.redirect(redirectUrl.toString(), 303);
    }

    return NextResponse.json({
      success: verification.isPaid,
      isValid: verification.isValid,
      statusCode: verification.statusCode,
      basketId: verification.basketId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Callback processing failed';
    const appUrl = PAYMENT_CONFIG.getAppUrl();
    return NextResponse.redirect(`${appUrl}/register/payment/status?status=failed&error=${encodeURIComponent(message)}`, 303);
  }
}
