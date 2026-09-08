/**
 * Sliding Window In-Memory Rate Limiter
 * Per spec (08_SECURITY_PRIVACY_AND_AUDIT.md Section 3 & 02_PHASES_AND_ROADMAP.md Phase 9).
 */

export type RateLimitCategory = 'auth' | 'messaging' | 'export' | 'mutation' | 'api';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const CATEGORY_LIMITS: Record<RateLimitCategory, RateLimitConfig> = {
  auth: { maxRequests: 5, windowSeconds: 60 }, // 5 login attempts per minute (brute-force defense)
  messaging: { maxRequests: 20, windowSeconds: 60 }, // 20 outbound messages per minute (anti-spam)
  export: { maxRequests: 3, windowSeconds: 3600 }, // 3 full archive exports per hour
  mutation: { maxRequests: 120, windowSeconds: 60 }, // 120 mutations per minute
  api: { maxRequests: 300, windowSeconds: 60 }, // 300 general read requests per minute
};

interface WindowEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, WindowEntry>();

// Periodic garbage collection every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      // Remove timestamps older than 1 hour
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < 3600 * 1000);
      if (entry.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  error?: string;
}

/**
 * Check rate limit for a client key and action category.
 */
export function checkRateLimit(
  identifier: string,
  category: RateLimitCategory = 'mutation'
): RateLimitResult {
  const now = Date.now();
  const config = CATEGORY_LIMITS[category] || CATEGORY_LIMITS.mutation;
  const windowMs = config.windowSeconds * 1000;
  const storeKey = `${category}:${identifier}`;

  let entry = memoryStore.get(storeKey);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(storeKey, entry);
  }

  // Filter timestamps within current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0] || now;
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
      error: `Too many requests for ${category}. Rate limit exceeded. Try again in ${resetSeconds}s.`,
    };
  }

  // Allow and record
  entry.timestamps.push(now);
  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining,
    resetSeconds: config.windowSeconds,
  };
}

/**
 * Reset memory store (used in test fixtures).
 */
export function resetRateLimits(): void {
  memoryStore.clear();
}
