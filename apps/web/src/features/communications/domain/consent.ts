import { CommunicationChannel, ConsentCategory } from './types';

export interface ConsentRecord {
  channel: string;
  category: string;
  consented: boolean;
  optedOutAt?: Date | string | null;
}

export interface ConsentCheckInput {
  channel: CommunicationChannel;
  category: ConsentCategory;
  patientConsents?: ConsentRecord[];
}

export interface ConsentCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Checks whether a communication can be sent to a patient based on regulatory compliance
 * and explicit consent / opt-out preferences.
 * Per spec (08_SECURITY_PRIVACY_AND_AUDIT.md Section 13):
 * "Do not treat operational notifications and marketing consent as automatically equivalent."
 */
export function canSendMessage(input: ConsentCheckInput): ConsentCheckResult {
  const { channel, category, patientConsents = [] } = input;

  // Internal notes and manual staff phone calls are always permissible
  if (channel === 'internal_note' || channel === 'phone') {
    return { allowed: true };
  }

  // 1. Check if patient explicitly opted out of this specific channel completely
  const channelOptOut = patientConsents.find(
    (c) => c.channel === channel && (c.category === 'all' || !c.category) && c.consented === false
  );

  if (channelOptOut) {
    return {
      allowed: false,
      reason: `Patient has opted out of communications via ${channel.toUpperCase()}`,
    };
  }

  // 2. Check category-specific consent on this channel
  const categoryConsent = patientConsents.find(
    (c) => c.channel === channel && c.category === category && c.consented === false
  );

  if (categoryConsent) {
    return {
      allowed: false,
      reason: category === 'marketing'
        ? 'Patient has opted out of marketing communications'
        : `Patient has opted out of communications via ${channel.toUpperCase()}`,
    };
  }

  // 3. Marketing messages require explicit opt-in or non-opted-out state
  if (category === 'marketing') {
    const marketingOptOut = patientConsents.find(
      (c) => c.category === 'marketing' && c.consented === false
    );
    if (marketingOptOut) {
      return {
        allowed: false,
        reason: 'Patient has opted out of marketing communications',
      };
    }
  }

  return { allowed: true };
}

/**
 * Detects whether an inbound text message represents an opt-out request (e.g. TCPA STOP keyword).
 */
export function isStopKeyword(text: string): boolean {
  if (!text) return false;
  const normalized = text.trim().toUpperCase();
  return ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'].includes(
    normalized
  );
}

/**
 * Detects whether an inbound text message represents an opt-in or resume request.
 */
export function isStartKeyword(text: string): boolean {
  if (!text) return false;
  const normalized = text.trim().toUpperCase();
  return ['START', 'YES', 'UNSTOP'].includes(normalized);
}
