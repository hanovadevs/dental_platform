import { describe, it, expect } from 'vitest';
import {
  canSendMessage,
  isStopKeyword,
  isStartKeyword,
} from '../features/communications/domain/consent';

describe('Communication Consent & Opt-Out Tracking (Section 13)', () => {
  it('allows operational messages when no opt-outs are recorded', () => {
    const result = canSendMessage({
      channel: 'sms',
      category: 'operational',
      patientConsents: [],
    });

    expect(result.allowed).toBe(true);
  });

  it('always allows internal staff notes and manual phone records regardless of consent', () => {
    const noteResult = canSendMessage({
      channel: 'internal_note',
      category: 'operational',
      patientConsents: [{ channel: 'sms', category: 'operational', consented: false }],
    });
    const phoneResult = canSendMessage({
      channel: 'phone',
      category: 'operational',
      patientConsents: [{ channel: 'phone', category: 'marketing', consented: false }],
    });

    expect(noteResult.allowed).toBe(true);
    expect(phoneResult.allowed).toBe(true);
  });

  it('blocks SMS when patient explicitly opted out of SMS', () => {
    const result = canSendMessage({
      channel: 'sms',
      category: 'operational',
      patientConsents: [
        {
          channel: 'sms',
          category: 'operational',
          consented: false,
          optedOutAt: new Date(),
        },
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('opted out of communications via SMS');
  });

  it('allows Email when patient only opted out of SMS', () => {
    const result = canSendMessage({
      channel: 'email',
      category: 'operational',
      patientConsents: [
        {
          channel: 'sms',
          category: 'operational',
          consented: false,
          optedOutAt: new Date(),
        },
      ],
    });

    expect(result.allowed).toBe(true);
  });

  it('blocks marketing messages when patient opted out of marketing', () => {
    const result = canSendMessage({
      channel: 'email',
      category: 'marketing',
      patientConsents: [
        {
          channel: 'email',
          category: 'marketing',
          consented: false,
          optedOutAt: new Date(),
        },
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('opted out of marketing');
  });

  it('detects standard TCPA STOP keywords accurately', () => {
    expect(isStopKeyword('STOP')).toBe(true);
    expect(isStopKeyword('stop')).toBe(true);
    expect(isStopKeyword(' unsubscribe ')).toBe(true);
    expect(isStopKeyword('CANCEL')).toBe(true);
    expect(isStopKeyword('Hello doctor')).toBe(false);
  });

  it('detects START and RESUME keywords', () => {
    expect(isStartKeyword('START')).toBe(true);
    expect(isStartKeyword('yes')).toBe(true);
    expect(isStartKeyword('UNSTOP')).toBe(true);
    expect(isStartKeyword('no thanks')).toBe(false);
  });
});
