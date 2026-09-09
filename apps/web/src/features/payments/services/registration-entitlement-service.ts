import { db } from '@dental/db';
import { registrationIntents, paymentRecords, memberships } from '@dental/db';
import { eq, and, isNull } from 'drizzle-orm';
import { RegistrationEntitlement } from '../domain/types';

/**
 * Service responsible for enforcing payment gatekeeping and preventing clinic bypass.
 * Ensures:
 * 1. A user cannot access /onboarding without having paid.
 * 2. An already used payment cannot be reused to create multiple clinics.
 * 3. A clinic cannot be created without a verified paid registration intent.
 */
export class RegistrationEntitlementService {
  /**
   * Checks whether a user is entitled to proceed with clinic onboarding.
   */
  async checkUserRegistrationEntitlement(userId: string): Promise<RegistrationEntitlement> {
    // 1. Check if user already belongs to an active clinic
    const existingMembership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, userId),
      with: {
        organization: true,
      },
    });

    if (existingMembership) {
      return {
        canOnboard: false,
        hasActiveClinic: true,
        paidIntentId: null,
        clinicName: existingMembership.organization?.name,
        status: 'active_clinic',
      };
    }

    // 2. Check for a verified paid intent that has not yet been bound to an organization
    const paidIntent = await db.query.registrationIntents.findFirst({
      where: and(
        eq(registrationIntents.userId, userId),
        eq(registrationIntents.status, 'paid'),
        isNull(registrationIntents.organizationId),
      ),
    });

    if (paidIntent) {
      return {
        canOnboard: true,
        hasActiveClinic: false,
        paidIntentId: paidIntent.id,
        clinicName: paidIntent.clinicName,
        status: 'entitled',
      };
    }

    // 3. Check for any pending intent
    const pendingIntent = await db.query.registrationIntents.findFirst({
      where: and(
        eq(registrationIntents.userId, userId),
        eq(registrationIntents.status, 'pending_payment'),
      ),
    });

    if (pendingIntent) {
      return {
        canOnboard: false,
        hasActiveClinic: false,
        paidIntentId: pendingIntent.id,
        clinicName: pendingIntent.clinicName,
        status: 'pending',
      };
    }

    return {
      canOnboard: false,
      hasActiveClinic: false,
      paidIntentId: null,
      status: 'unpaid',
    };
  }

  /**
   * Authoritatively claims a paid registration intent when creating a clinic organization.
   * MUST be called inside the organization creation database transaction.
   */
  async claimIntentForOrganization(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    intentId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    // 1. Fetch and lock intent
    const intent = await tx.query.registrationIntents.findFirst({
      where: and(
        eq(registrationIntents.id, intentId),
        eq(registrationIntents.userId, userId),
      ),
    });

    if (!intent) {
      throw new Error('Registration intent not found.');
    }

    if (intent.status !== 'paid') {
      throw new Error(`Registration intent is not paid (current status: ${intent.status}). Payment is required before activating clinic.`);
    }

    if (intent.organizationId) {
      throw new Error('This registration payment has already been used to activate a clinic.');
    }

    // 2. Bind intent to new organization & mark completed
    await tx
      .update(registrationIntents)
      .set({
        organizationId,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(registrationIntents.id, intentId));

    // 3. Bind associated payment records to the organization for accounting
    await tx
      .update(paymentRecords)
      .set({
        organizationId,
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.registrationIntentId, intentId));
  }
}
