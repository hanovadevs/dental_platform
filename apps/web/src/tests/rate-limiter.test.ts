import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from '@/lib/security/rate-limiter';

describe('Sliding Window Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('allows initial requests and decrements remaining capacity', () => {
    const res1 = checkRateLimit('user-1', 'auth');
    expect(res1.allowed).toBe(true);
    expect(res1.limit).toBe(5);
    expect(res1.remaining).toBe(4);

    const res2 = checkRateLimit('user-1', 'auth');
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it('blocks excessive requests when exceeding maxRequests limit for auth', () => {
    // Auth limit is 5 attempts per minute
    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit('attacker-ip', 'auth');
      expect(res.allowed).toBe(true);
    }

    // 6th attempt should be blocked
    const blocked = checkRateLimit('attacker-ip', 'auth');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetSeconds).toBeGreaterThan(0);
    expect(blocked.error).toContain('Too many requests for auth. Rate limit exceeded.');
  });

  it('isolates different users and IP addresses independently', () => {
    // Exhaust user-1
    for (let i = 0; i < 5; i++) {
      checkRateLimit('ip-alice', 'auth');
    }
    expect(checkRateLimit('ip-alice', 'auth').allowed).toBe(false);

    // ip-bob should still be allowed
    const bobResult = checkRateLimit('ip-bob', 'auth');
    expect(bobResult.allowed).toBe(true);
    expect(bobResult.remaining).toBe(4);
  });

  it('isolates different categories for the same identifier', () => {
    // Exhaust exports (limit 3)
    for (let i = 0; i < 3; i++) {
      checkRateLimit('org-corp', 'export');
    }
    expect(checkRateLimit('org-corp', 'export').allowed).toBe(false);

    // Same org performing mutations should not be blocked
    const mutationResult = checkRateLimit('org-corp', 'mutation');
    expect(mutationResult.allowed).toBe(true);
    expect(mutationResult.limit).toBe(120);
  });

  it('resets cleanly when resetRateLimits is called', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('locked-user', 'auth');
    }
    expect(checkRateLimit('locked-user', 'auth').allowed).toBe(false);

    resetRateLimits();

    const fresh = checkRateLimit('locked-user', 'auth');
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(4);
  });
});
