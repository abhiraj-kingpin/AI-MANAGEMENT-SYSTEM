interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * A tiny in-process TTL cache for expensive, frequently-repeated reads
 * (analytics.service.ts's dashboard/department-comparison aggregations).
 * The architecture doc's original plan for this kind of thing is a shared
 * Redis cache (so every API instance sees the same entries) — no phase has
 * ever wired Redis into any code (same documented gap as Phase 11's job
 * queue and Phase 16's account lockout), so this is the same "real
 * behavior, smaller blast radius" trade-off applied again: correct for a
 * single process, and still correct (just a lower hit rate, one cache per
 * instance) behind a load balancer with more than one — never *wrong*.
 */
export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Returns the cached value if present and fresh; otherwise computes it, caches it, and returns it. `compute` only ever runs on a miss. */
  async getOrSet<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await compute();
    this.set(key, value, ttlMs);
    return value;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Drops every entry — used by tests, and available for an admin "force-refresh" action if one is ever added. */
  clear(): void {
    this.store.clear();
  }
}

/** Shared instance for analytics.service.ts's cached reads — one process-wide cache, not one per request. */
export const analyticsCache = new MemoryCache();
