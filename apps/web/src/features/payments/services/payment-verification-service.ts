import { PaymentProvider, VerifyPaymentInput, VerifiedPayment } from '../domain/types';
import { PayFastProvider } from './payfast-provider';

/**
 * Service responsible for validating gateway responses, signatures, and callbacks.
 * Protects against:
 * - Fake success redirects
 * - Tampered amounts or status codes
 * - Timing attacks on validation hashes
 */
export class PaymentVerificationService {
  private provider: PaymentProvider;

  constructor(provider?: PaymentProvider) {
    this.provider = provider || new PayFastProvider();
  }

  async verifyIncomingCallback(input: VerifyPaymentInput): Promise<VerifiedPayment> {
    return this.provider.verifyPayment(input);
  }
}
