/**
 * Communication Provider Abstraction.
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.13, 02_PHASES_AND_ROADMAP.md Phase 6):
 * - Clean abstraction independent of underlying delivery vendor (Twilio, Resend, Sendgrid, Meta Cloud API).
 * - Stores provider references and standardized delivery results.
 */

export interface ProviderSendResult {
  success: boolean;
  providerReference: string;
  status: 'sent' | 'delivered' | 'failed';
  deliveredAt?: Date;
  failureReason?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SmsPayload {
  to: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppPayload {
  to: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface CommunicationProvider {
  name: string;
  sendEmail(payload: EmailPayload): Promise<ProviderSendResult>;
  sendSms(payload: SmsPayload): Promise<ProviderSendResult>;
  sendWhatsApp(payload: WhatsAppPayload): Promise<ProviderSendResult>;
}

/**
 * Standard simulated provider for testing and development.
 * Emits structured console logs and returns realistic provider references.
 */
export class MockConsoleCommunicationProvider implements CommunicationProvider {
  name = 'MockConsoleProvider';

  async sendEmail(payload: EmailPayload): Promise<ProviderSendResult> {
    const reference = `mock_email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[Provider:Email] Sending to ${payload.to} | Subject: "${payload.subject}" | Ref: ${reference}`);

    return {
      success: true,
      providerReference: reference,
      status: 'delivered',
      deliveredAt: new Date(),
    };
  }

  async sendSms(payload: SmsPayload): Promise<ProviderSendResult> {
    const reference = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[Provider:SMS] Sending to ${payload.to} | Body: "${payload.body}" | Ref: ${reference}`);

    return {
      success: true,
      providerReference: reference,
      status: 'delivered',
      deliveredAt: new Date(),
    };
  }

  async sendWhatsApp(payload: WhatsAppPayload): Promise<ProviderSendResult> {
    const reference = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[Provider:WhatsApp] Sending to ${payload.to} | Body: "${payload.body}" | Ref: ${reference}`);

    return {
      success: true,
      providerReference: reference,
      status: 'delivered',
      deliveredAt: new Date(),
    };
  }
}

let activeProvider: CommunicationProvider = new MockConsoleCommunicationProvider();

export function getCommunicationProvider(): CommunicationProvider {
  return activeProvider;
}

export function setCommunicationProvider(provider: CommunicationProvider): void {
  activeProvider = provider;
}
