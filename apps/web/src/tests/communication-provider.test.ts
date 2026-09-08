import { describe, it, expect } from 'vitest';
import {
  MockConsoleCommunicationProvider,
  getCommunicationProvider,
} from '../features/communications/services/provider';

describe('Communication Provider Abstraction (Section 3.13)', () => {
  const provider = new MockConsoleCommunicationProvider();

  it('delivers simulated email and returns provider reference', async () => {
    const result = await provider.sendEmail({
      to: 'patient@example.com',
      subject: 'Dental Checkup Reminder',
      body: 'Please visit us tomorrow at 10 AM.',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('delivered');
    expect(result.providerReference).toContain('mock_email_');
    expect(result.deliveredAt).toBeDefined();
  });

  it('delivers simulated SMS and returns provider reference', async () => {
    const result = await provider.sendSms({
      to: '+15551234567',
      body: 'Your appointment is confirmed for Friday.',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('delivered');
    expect(result.providerReference).toContain('mock_sms_');
  });

  it('delivers simulated WhatsApp message and returns provider reference', async () => {
    const result = await provider.sendWhatsApp({
      to: '+15551234567',
      body: 'Hello, your hygiene recall is due.',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('delivered');
    expect(result.providerReference).toContain('mock_wa_');
  });

  it('retrieves global active provider from factory', () => {
    const active = getCommunicationProvider();
    expect(active).toBeDefined();
    expect(active.name).toBe('MockConsoleProvider');
  });
});
