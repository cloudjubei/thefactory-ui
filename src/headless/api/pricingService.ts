import { getPricing, refreshPricing as refreshPricingApi } from './generated'
import type { ModelPrice } from './generated/types.gen'
import type { PricingSnapshot } from './sdkTypes'

export type { ModelPrice }

/**
 * Process-singleton cache for the backend's `/pricing` snapshot, shared by
 * every screen that needs model prices (chat usage, agent model chip,
 * pricing settings panel). Snapshots older than 24h are treated as stale —
 * still served immediately to keep UI responsive, but the next async
 * accessor refreshes them in the background.
 */
const STALE_MS = 24 * 60 * 60 * 1000

let cache: PricingSnapshot | null = null
let inflight: Promise<PricingSnapshot> | null = null

function emptySnapshot(): PricingSnapshot {
  return { updatedAt: new Date().toISOString(), prices: [] }
}

/** Synchronous accessor for cache-first rendering. */
export function getCachedPricing(): PricingSnapshot | null {
  return cache
}

/** Manually replace the cached snapshot (used by the settings panel after a forced refresh). */
export function setCachedPricing(snapshot: PricingSnapshot): void {
  cache = snapshot
}

/** Null / unparseable `updatedAt` / > 24h old all count as stale. */
export function isPricingStale(snapshot: PricingSnapshot | null): boolean {
  if (!snapshot) return true
  const t = Date.parse(snapshot.updatedAt)
  if (Number.isNaN(t)) return true
  return Date.now() - t > STALE_MS
}

async function fetchPricing(): Promise<PricingSnapshot> {
  if (cache && !isPricingStale(cache)) return cache
  if (inflight) return inflight

  inflight = getPricing({ throwOnError: true })
    .then(({ data }) => {
      cache = data ?? emptySnapshot()
      inflight = null
      return cache
    })
    .catch(() => {
      inflight = null
      cache = cache ?? emptySnapshot()
      return cache
    })

  return inflight
}

/** Async accessor: serves the cache if fresh, otherwise fetches. */
export async function getPricingState(): Promise<PricingSnapshot> {
  return fetchPricing()
}

/** Force a refresh against the backend and replace the cache. Returns the
 * prior snapshot if the refresh fails. */
export async function refreshPricingState(
  provider?: string,
  url?: string,
): Promise<PricingSnapshot> {
  try {
    const { data } = await refreshPricingApi({
      body: { provider, url },
      throwOnError: true,
    })
    cache = data ?? emptySnapshot()
    return cache
  } catch {
    return cache ?? emptySnapshot()
  }
}

function normalizeProvider(s: string) {
  return String(s || '')
    .trim()
    .toLowerCase()
}

function normalizeModel(s: string) {
  const raw = String(s || '')
    .trim()
    .toLowerCase()
  const seg = raw.split(/[/:]/).pop() || raw
  return seg
}

/**
 * Look up a price for a `(provider, model)` pair against the cached
 * snapshot (fetching if empty/stale). Falls back through progressively
 * looser matches: exact → model suffix-contains → provider-contains →
 * model substring on either side.
 */
export async function getPrice(provider?: string, model?: string): Promise<ModelPrice | undefined> {
  const state = await fetchPricing()
  if (!provider || !model) return undefined
  const p = normalizeProvider(provider)
  const m = normalizeModel(model)

  const prices = state.prices || []

  let rec = prices.find((r) => normalizeProvider(r.provider) === p && normalizeModel(r.model) === m)
  if (rec) return rec

  rec = prices.find(
    (r) =>
      normalizeProvider(r.provider) === p && normalizeModel(m).includes(normalizeModel(r.model)),
  )
  if (rec) return rec

  rec = prices.find(
    (r) =>
      normalizeProvider(r.provider) === p && normalizeModel(r.model).includes(normalizeModel(m)),
  )
  if (rec) return rec

  rec = prices.find(
    (r) =>
      normalizeProvider(r.provider).includes(p) &&
      normalizeModel(m).includes(normalizeModel(r.model)),
  )
  if (rec) return rec

  rec = prices.find(
    (r) =>
      normalizeModel(m).includes(normalizeModel(r.model)) ||
      normalizeModel(r.model).includes(normalizeModel(m)),
  )
  return rec
}
