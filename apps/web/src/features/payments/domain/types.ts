/**
 * Core domain types for provider-neutral payments and PayFast integration.
 */

export type PaymentProviderType = 'payfast';

export type RegistrationIntentStatus =
  | 'pending_payment'
  | 'processing'
  | 'paid'
  | 'completed'
  | 'expired'
  | 'cancelled';

export type PaymentRecordStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type VerificationStatus = 'unverified' | 'verified' | 'failed';

export interface CreateCheckoutInput {
  intentId: string;
  userId: string;
  amount: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  returnUrl: string;
}

export interface CheckoutSession {
  provider: PaymentProviderType;
  providerReference: string; // Basket ID
  actionUrl: string;         // Hosted checkout submission URL
  formFields: Record<string, string>; // Hidden POST form inputs
}

export interface VerifyPaymentInput {
  rawPayload: Record<string, string | undefined>;
}

export interface VerifiedPayment {
  isValid: boolean;
  isPaid: boolean;
  basketId: string;
  transactionId?: string;
  statusCode: string;
  statusMessage: string;
  rawPayload: Record<string, string | undefined>;
  errorMessage?: string;
}

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifiedPayment>;
}

export interface RegistrationEntitlement {
  canOnboard: boolean;
  hasActiveClinic: boolean;
  paidIntentId: string | null;
  clinicName?: string;
  status: 'active_clinic' | 'entitled' | 'unpaid' | 'pending';
}
