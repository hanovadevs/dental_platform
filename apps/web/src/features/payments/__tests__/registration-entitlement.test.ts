import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrationEntitlementService } from '../services/registration-entitlement-service';
import { db } from '@dental/db';

vi.mock('@dental/db', () => ({
  db: {
    query: {
      memberships: {
        findFirst: vi.fn(),
      },
      registrationIntents: {
        findFirst: vi.fn(),
      },
    },
    transaction: vi.fn(),
  },
  memberships: {},
  registrationIntents: {
    userId: 'user_id',
    status: 'status',
    organizationId: 'organization_id',
    id: 'id',
  },
  paymentRecords: {
    registrationIntentId: 'registration_intent_id',
  },
}));

describe('RegistrationEntitlementService', () => {
  let service: RegistrationEntitlementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RegistrationEntitlementService();
  });

  it('detects if user already has an active clinic membership and blocks new onboarding', async () => {
    vi.mocked(db.query.memberships.findFirst).mockResolvedValueOnce({
      id: 'm1',
      userId: 'u1',
      organizationId: 'org1',
      organization: { id: 'org1', name: 'Apex Dental Care' },
    } as any);

    const res = await service.checkUserRegistrationEntitlement('u1');

    expect(res.canOnboard).toBe(false);
    expect(res.hasActiveClinic).toBe(true);
    expect(res.clinicName).toBe('Apex Dental Care');
    expect(res.status).toBe('active_clinic');
  });

  it('allows onboarding if user has a verified paid intent with no organizationId', async () => {
    vi.mocked(db.query.memberships.findFirst).mockResolvedValueOnce(null as any);
    vi.mocked(db.query.registrationIntents.findFirst).mockResolvedValueOnce({
      id: 'intent-paid-123',
      userId: 'u1',
      organizationId: null,
      clinicName: 'Beacon Dental Hospital',
      status: 'paid',
    } as any);

    const res = await service.checkUserRegistrationEntitlement('u1');

    expect(res.canOnboard).toBe(true);
    expect(res.hasActiveClinic).toBe(false);
    expect(res.paidIntentId).toBe('intent-paid-123');
    expect(res.clinicName).toBe('Beacon Dental Hospital');
    expect(res.status).toBe('entitled');
  });

  it('blocks onboarding and directs to payment if intent is pending payment', async () => {
    vi.mocked(db.query.memberships.findFirst).mockResolvedValueOnce(null as any);
    // First call (paid check) returns null
    vi.mocked(db.query.registrationIntents.findFirst).mockResolvedValueOnce(null as any);
    // Second call (pending check) returns pending intent
    vi.mocked(db.query.registrationIntents.findFirst).mockResolvedValueOnce({
      id: 'intent-pending-456',
      userId: 'u1',
      clinicName: 'Pending Dental',
      status: 'pending_payment',
    } as any);

    const res = await service.checkUserRegistrationEntitlement('u1');

    expect(res.canOnboard).toBe(false);
    expect(res.status).toBe('pending');
    expect(res.paidIntentId).toBe('intent-pending-456');
  });

  it('blocks onboarding if user has no intent at all', async () => {
    vi.mocked(db.query.memberships.findFirst).mockResolvedValueOnce(null as any);
    vi.mocked(db.query.registrationIntents.findFirst).mockResolvedValueOnce(null as any);
    vi.mocked(db.query.registrationIntents.findFirst).mockResolvedValueOnce(null as any);

    const res = await service.checkUserRegistrationEntitlement('u1');

    expect(res.canOnboard).toBe(false);
    expect(res.hasActiveClinic).toBe(false);
    expect(res.status).toBe('unpaid');
    expect(res.paidIntentId).toBeNull();
  });

  it('claimIntentForOrganization throws if intent is not paid or already claimed', async () => {
    const mockTx = {
      query: {
        registrationIntents: {
          findFirst: vi.fn().mockResolvedValueOnce({
            id: 'intent-unpaid',
            userId: 'u1',
            status: 'pending_payment',
            organizationId: null,
          }),
        },
      },
      update: vi.fn(),
    } as any;

    await expect(
      service.claimIntentForOrganization(mockTx, 'intent-unpaid', 'org-new', 'u1'),
    ).rejects.toThrow('Registration intent is not paid');
  });
});
