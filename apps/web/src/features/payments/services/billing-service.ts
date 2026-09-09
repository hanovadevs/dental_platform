import { PaymentProvider, CheckoutSession, VerifiedPayment, VerifyPaymentInput } from '../domain/types';
import { PayFastProvider } from './payfast-provider';
import { PaymentVerificationService } from './payment-verification-service';
import { RegistrationPaymentService, CreateIntentParams } from './registration-payment-service';
import { RegistrationEntitlementService } from './registration-entitlement-service';
import { PAYMENT_CONFIG } from '../config/payment-config';

/**
 * Unified Billing & Payment Façade.
 * Coordinates payment gateway providers, verification, intent management, and entitlement gatekeeping.
 */
export class BillingService {
  private provider: PaymentProvider;
  public verification: PaymentVerificationService;
  public registration: RegistrationPaymentService;
  public entitlement: RegistrationEntitlementService;

  constructor(provider?: PaymentProvider) {
    this.provider = provider || new PayFastProvider();
    this.verification = new PaymentVerificationService(this.provider);
    this.registration = new RegistrationPaymentService();
    this.entitlement = new RegistrationEntitlementService();
  }

  /**
   * Initiates a registration checkout session with Premier PayFast.
   */
  async initiateRegistrationCheckout(intentId: string, userId: string): Promise<CheckoutSession> {
    const intent = await this.registration.getIntentById(intentId);
    if (!intent) {
      throw new Error(`Registration intent not found: ${intentId}`);
    }

    if (intent.userId !== userId) {
      throw new Error('Unauthorized: Registration intent does not belong to this user.');
    }

    if (intent.status === 'paid' || intent.status === 'completed') {
      throw new Error('This clinic registration has already been paid.');
    }

    const returnUrl = PAYMENT_CONFIG.getPayFastCallbackUrl();

    // 1. Create checkout with provider
    const session = await this.provider.createCheckout({
      intentId: intent.id,
      userId,
      amount: intent.amount,
      currency: intent.currency,
      customerName: intent.clinicName,
      customerEmail: intent.contactEmail,
      customerPhone: intent.contactPhone,
      description: `Dental OS Registration: ${intent.clinicName}`,
      returnUrl,
    });

    // 2. Record checkout attempt in database ledger
    await this.registration.recordCheckoutAttempt({
      intentId: intent.id,
      userId,
      basketId: session.providerReference,
      amount: intent.amount,
      currency: intent.currency,
      provider: session.provider,
    });

    return session;
  }

  /**
   * Processes an incoming callback from Premier PayFast.
   */
  async handlePayFastCallback(input: VerifyPaymentInput): Promise<VerifiedPayment> {
    // 1. Cryptographically verify signature and status code
    const verification = await this.verification.verifyIncomingCallback(input);

    if (verification.isValid) {
      // 2. Atomically update database transaction and registration intent
      await this.registration.processVerifiedPayment(verification);
    }

    return verification;
  }
}

// Global Singleton Instance
export const billingService = new BillingService();
