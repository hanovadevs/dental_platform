import { db } from '@dental/db';
import { registrationIntents, paymentRecords, RegistrationIntent, PaymentRecord } from '@dental/db';
import { eq, desc, and } from 'drizzle-orm';
import { PAYMENT_CONFIG } from '../config/payment-config';
import { VerifiedPayment } from '../domain/types';

export interface CreateIntentParams {
  userId: string;
  clinicName: string;
  contactEmail: string;
  contactPhone: string;
  plan?: string;
  amount?: string;
  currency?: string;
}

export class RegistrationPaymentService {
  /**
   * Creates a new temporary registration intent.
   */
  async createIntent(params: CreateIntentParams): Promise<RegistrationIntent> {
    const amount = params.amount || PAYMENT_CONFIG.registrationFeePkr;
    const currency = params.currency || PAYMENT_CONFIG.currency;
    const plan = params.plan || 'starter';

    // Expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [intent] = await db
      .insert(registrationIntents)
      .values({
        userId: params.userId,
        clinicName: params.clinicName.trim(),
        contactEmail: params.contactEmail.toLowerCase().trim(),
        contactPhone: params.contactPhone.trim(),
        plan,
        amount,
        currency,
        status: 'pending_payment',
        expiresAt,
      })
      .returning();

    if (!intent) {
      throw new Error('Failed to create registration intent in database.');
    }

    return intent;
  }

  /**
   * Retrieves an intent by ID.
   */
  async getIntentById(id: string): Promise<RegistrationIntent | null> {
    const intent = await db.query.registrationIntents.findFirst({
      where: eq(registrationIntents.id, id),
    });
    return intent || null;
  }

  /**
   * Retrieves the latest active or paid registration intent for a user.
   */
  async getLatestIntentForUser(userId: string): Promise<RegistrationIntent | null> {
    const intent = await db.query.registrationIntents.findFirst({
      where: and(
        eq(registrationIntents.userId, userId),
      ),
      orderBy: [desc(registrationIntents.createdAt)],
    });
    return intent || null;
  }

  /**
   * Records a checkout session attempt.
   */
  async recordCheckoutAttempt(params: {
    intentId: string;
    userId: string;
    basketId: string;
    amount: string;
    currency: string;
    provider: string;
  }): Promise<PaymentRecord> {
    const idempotencyKey = `checkout_${params.basketId}`;

    const [record] = await db
      .insert(paymentRecords)
      .values({
        userId: params.userId,
        registrationIntentId: params.intentId,
        provider: params.provider,
        providerReference: params.basketId,
        amount: params.amount,
        currency: params.currency,
        status: 'processing',
        verificationStatus: 'unverified',
        idempotencyKey,
      })
      .onConflictDoUpdate({
        target: paymentRecords.idempotencyKey,
        set: {
          updatedAt: new Date(),
          status: 'processing',
        },
      })
      .returning();

    if (!record) {
      throw new Error('Failed to initialize payment record.');
    }

    return record;
  }

  /**
   * Authoritatively processes a cryptographically verified payment.
   * Runs inside a database transaction to guarantee atomicity and idempotency.
   */
  async processVerifiedPayment(verification: VerifiedPayment): Promise<{
    success: boolean;
    intent: RegistrationIntent | null;
    paymentRecord: PaymentRecord | null;
  }> {
    const basketId = verification.basketId;

    return await db.transaction(async (tx) => {
      // Find existing payment record
      const record = await tx.query.paymentRecords.findFirst({
        where: eq(paymentRecords.providerReference, basketId),
      });

      if (!record) {
        // Record might not exist if created directly by gateway callback; create it
        throw new Error(`Payment record not found for basket ID: ${basketId}`);
      }

      // Check if already in terminal state
      if (record.status === 'paid' && record.verificationStatus === 'verified') {
        const intent = record.registrationIntentId
          ? await tx.query.registrationIntents.findFirst({
              where: eq(registrationIntents.id, record.registrationIntentId),
            })
          : null;

        return {
          success: true,
          intent: intent || null,
          paymentRecord: record,
        };
      }

      if (verification.isPaid) {
        // Mark payment record as paid & verified
        const [updatedRecord] = await tx
          .update(paymentRecords)
          .set({
            status: 'paid',
            verificationStatus: 'verified',
            providerTransactionId: verification.transactionId || record.providerTransactionId,
            paidAt: new Date(),
            updatedAt: new Date(),
            providerMetadata: verification.rawPayload,
          })
          .where(eq(paymentRecords.id, record.id))
          .returning();

        // Mark registration intent as paid
        let updatedIntent: RegistrationIntent | null = null;
        if (record.registrationIntentId) {
          const [res] = await tx
            .update(registrationIntents)
            .set({
              status: 'paid',
              updatedAt: new Date(),
            })
            .where(eq(registrationIntents.id, record.registrationIntentId))
            .returning();
          updatedIntent = res || null;
        }

        return {
          success: true,
          intent: updatedIntent,
          paymentRecord: updatedRecord || null,
        };
      } else {
        // Mark payment record as failed
        const [updatedRecord] = await tx
          .update(paymentRecords)
          .set({
            status: 'failed',
            verificationStatus: 'failed',
            failedAt: new Date(),
            updatedAt: new Date(),
            providerMetadata: verification.rawPayload,
          })
          .where(eq(paymentRecords.id, record.id))
          .returning();

        const intent = record.registrationIntentId
          ? await tx.query.registrationIntents.findFirst({
              where: eq(registrationIntents.id, record.registrationIntentId),
            })
          : null;

        return {
          success: false,
          intent: intent || null,
          paymentRecord: updatedRecord || null,
        };
      }
    });
  }

  /**
   * Retrieves all payment records for internal operational view.
   */
  async listPaymentRecords(limit = 100): Promise<Array<PaymentRecord & { user: { firstName: string; lastName: string; email: string }; registrationIntent: RegistrationIntent | null }>> {
    const records = await db.query.paymentRecords.findMany({
      orderBy: [desc(paymentRecords.createdAt)],
      limit,
      with: {
        user: {
          columns: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        registrationIntent: true,
      },
    });

    return records as any;
  }
}
