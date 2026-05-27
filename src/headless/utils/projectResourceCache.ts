export type CacheEntry<T> = {
  data: T
  etag: string | null
}

/**
 * Per-project, in-memory LRU cache for a single resource (e.g. stories, the
 * git status). Stores `{ data, etag }` per projectId so the consumer can
 * issue `If-None-Match` against the backend on revalidate and short-circuit
 * the body on a 304.
 *
 * Insertion order in `Map` is the natural LRU signal: `get` re-inserts the
 * entry, pushing it to the most-recent end. When the size exceeds
 * `maxEntries`, the oldest key (first in iteration order) is evicted.
 *
 * Not persisted — re-mount or hard refresh clears it. The cache is a
 * per-mount optimization for instant project switches; the backend remains
 * the source of truth via WS invalidation and the explicit revalidate path.
 */
export class ProjectResourceCache<T> {
  private readonly map = new Map<string, CacheEntry<T>>()
  private readonly maxEntries: number

  constructor(maxEntries: number = 16) {
    this.maxEntries = maxEntries
  }

  get(projectId: string): CacheEntry<T> | undefined {
    const entry = this.map.get(projectId)
    if (!entry) return undefined
    // Touch — push to the most-recent end of the iteration order.
    this.map.delete(projectId)
    this.map.set(projectId, entry)
    return entry
  }

  set(projectId: string, data: T, etag: string | null): void {
    if (this.map.has(projectId)) {
      // Re-insert at the most-recent end (also counts as a recency touch).
      this.map.delete(projectId)
    }
    this.map.set(projectId, { data, etag })
    while (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey === undefined) break
      this.map.delete(oldestKey)
    }
  }

  invalidate(projectId: string): void {
    this.map.delete(projectId)
  }

  clear(): void {
    this.map.clear()
  }
}
