import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'mock-user-id' } }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { confirmAppointmentByToken } from '@/features/communications/server/actions';
import { db } from '@dental/db';

vi.mock('@dental/db', async () => {
  const actual = await vi.importActual('@dental/db');
  return {
    ...actual,
    db: {
      query: {
        confirmationTokens: {
          findFirst: vi.fn(),
        },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
        })),
      })),
    },
  };
});

describe('Phase 6: Public Appointment Confirmation Links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects confirmation when token is empty or missing', async () => {
    const res = await confirmAppointmentByToken('');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INVALID_TOKEN');
  });

  it('returns NOT_FOUND when token does not exist in database', async () => {
    vi.mocked(db.query.confirmationTokens.findFirst).mockResolvedValueOnce(undefined as any);

    const res = await confirmAppointmentByToken('non-existent-uuid');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
    expect(res.error?.message).toContain('Confirmation link not found');
  });

  it('returns EXPIRED when token past its expiration date', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    vi.mocked(db.query.confirmationTokens.findFirst).mockResolvedValueOnce({
      id: 'token-123',
      appointmentId: 'appt-456',
      token: 'expired-token',
      expiresAt: pastDate,
      confirmedAt: null,
      appointment: {
        id: 'appt-456',
        status: 'scheduled',
        startAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        organization: { name: 'Apex Dental Care' },
      },
    } as any);

    const res = await confirmAppointmentByToken('expired-token');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('EXPIRED');
    expect(res.error?.message).toContain('expired');
  });

  it('transitions scheduled appointment to confirmed upon valid token submission', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48); // 2 days in future
    const appointmentTime = new Date('2026-09-15T14:30:00Z');

    vi.mocked(db.query.confirmationTokens.findFirst).mockResolvedValueOnce({
      id: 'token-valid-1',
      appointmentId: 'appt-789',
      token: 'valid-secure-token-123',
      expiresAt: futureDate,
      confirmedAt: null,
      appointment: {
        id: 'appt-789',
        status: 'scheduled',
        startAt: appointmentTime,
        organization: { name: 'Smile Dental Clinic' },
      },
    } as any);

    const updateSetSpy = vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    }));
    vi.mocked(db.update).mockImplementation((() => ({
      set: updateSetSpy,
    })) as any);

    const res = await confirmAppointmentByToken('valid-secure-token-123');

    expect(res.success).toBe(true);
    expect(res.data?.appointmentId).toBe('appt-789');
    expect(res.data?.clinicName).toBe('Smile Dental Clinic');
    expect(res.data?.appointmentTime).toBe(appointmentTime.toISOString());

    // Verify appointment status was updated to confirmed
    expect(updateSetSpy).toHaveBeenCalledWith({ status: 'confirmed' });
  });

  it('allows idempotency when appointment was already confirmed', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48);
    const appointmentTime = new Date('2026-09-15T14:30:00Z');

    vi.mocked(db.query.confirmationTokens.findFirst).mockResolvedValueOnce({
      id: 'token-already-used',
      appointmentId: 'appt-already-confirmed',
      token: 'token-already-used-xyz',
      expiresAt: futureDate,
      confirmedAt: new Date(),
      appointment: {
        id: 'appt-already-confirmed',
        status: 'confirmed', // Already confirmed earlier
        startAt: appointmentTime,
        organization: { name: 'Smile Dental Clinic' },
      },
    } as any);

    const res = await confirmAppointmentByToken('token-already-used-xyz');

    expect(res.success).toBe(true);
    expect(res.data?.appointmentId).toBe('appt-already-confirmed');
  });
});
