import { describe, it, expect } from 'vitest';
import {
  SUBSCRIPTION_PLANS,
  isFeatureAvailable,
  canAddLocation,
  canAddChair,
  PlanTier,
} from '@/features/subscriptions/domain/plans';

describe('Subscriptions & Commercial Quotas Domain', () => {
  it('defines the three tier specifications accurately', () => {
    expect(SUBSCRIPTION_PLANS.starter).toBeDefined();
    expect(SUBSCRIPTION_PLANS.starter.priceMonthly).toBe(199);
    expect(SUBSCRIPTION_PLANS.starter.maxLocations).toBe(1);
    expect(SUBSCRIPTION_PLANS.starter.maxChairs).toBe(3);

    expect(SUBSCRIPTION_PLANS.growth).toBeDefined();
    expect(SUBSCRIPTION_PLANS.growth.priceMonthly).toBe(399);
    expect(SUBSCRIPTION_PLANS.growth.maxLocations).toBe(3);
    expect(SUBSCRIPTION_PLANS.growth.maxChairs).toBe(10);

    expect(SUBSCRIPTION_PLANS.enterprise).toBeDefined();
    expect(SUBSCRIPTION_PLANS.enterprise.priceMonthly).toBe(799);
    expect(SUBSCRIPTION_PLANS.enterprise.maxLocations).toBe(999);
    expect(SUBSCRIPTION_PLANS.enterprise.maxChairs).toBe(999);
  });

  describe('Feature matrix gating', () => {
    it('gates revenue opportunity engine to growth and enterprise tiers', () => {
      expect(isFeatureAvailable('revenue_opportunity_engine', 'starter')).toBe(false);
      expect(isFeatureAvailable('revenue_opportunity_engine', 'growth')).toBe(true);
      expect(isFeatureAvailable('revenue_opportunity_engine', 'enterprise')).toBe(true);
    });

    it('gates multi-location analytics to enterprise tier only', () => {
      expect(isFeatureAvailable('multi_location_analytics', 'starter')).toBe(false);
      expect(isFeatureAvailable('multi_location_analytics', 'growth')).toBe(false);
      expect(isFeatureAvailable('multi_location_analytics', 'enterprise')).toBe(true);
    });

    it('allows basic clinical and scheduling across all plans', () => {
      const tiers: PlanTier[] = ['starter', 'growth', 'enterprise'];
      for (const tier of tiers) {
        expect(isFeatureAvailable('core_clinical', tier)).toBe(true);
        expect(isFeatureAvailable('basic_scheduling', tier)).toBe(true);
        expect(isFeatureAvailable('invoicing_and_payments', tier)).toBe(true);
      }
    });
  });

  describe('Location quotas', () => {
    it('enforces starter location quota (1 location)', () => {
      const check1 = canAddLocation(0, 'starter');
      expect(check1.allowed).toBe(true);
      expect(check1.reason).toBeUndefined();

      const check2 = canAddLocation(1, 'starter');
      expect(check2.allowed).toBe(false);
      expect(check2.reason).toContain('allows a maximum of 1 branch location(s)');
    });

    it('enforces growth location quota (3 locations)', () => {
      expect(canAddLocation(2, 'growth').allowed).toBe(true);
      const limitCheck = canAddLocation(3, 'growth');
      expect(limitCheck.allowed).toBe(false);
      expect(limitCheck.reason).toContain('allows a maximum of 3 branch location(s)');
    });

    it('permits enterprise scaling to multiple locations', () => {
      expect(canAddLocation(10, 'enterprise').allowed).toBe(true);
      expect(canAddLocation(50, 'enterprise').allowed).toBe(true);
    });
  });

  describe('Operatory chair quotas', () => {
    it('enforces starter chair quota (3 chairs)', () => {
      expect(canAddChair(0, 'starter').allowed).toBe(true);
      expect(canAddChair(2, 'starter').allowed).toBe(true);

      const limitCheck = canAddChair(3, 'starter');
      expect(limitCheck.allowed).toBe(false);
      expect(limitCheck.reason).toContain('allows a maximum of 3 operatory chair(s)');
    });

    it('enforces growth chair quota (10 chairs)', () => {
      expect(canAddChair(9, 'growth').allowed).toBe(true);

      const limitCheck = canAddChair(10, 'growth');
      expect(limitCheck.allowed).toBe(false);
      expect(limitCheck.reason).toContain('allows a maximum of 10 operatory chair(s)');
    });

    it('permits enterprise operatory scale', () => {
      expect(canAddChair(15, 'enterprise').allowed).toBe(true);
      expect(canAddChair(100, 'enterprise').allowed).toBe(true);
    });
  });
});
