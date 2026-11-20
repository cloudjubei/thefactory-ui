import { BoundedCache } from '../utils/boundedCache'
import type {
  EvidenceLink,
  EvidenceReferenceLoad,
  EvidenceReferenceState,
  EvidenceReferenceStoreOptions,
} from '../utils/evidenceReferenceTypes'

const LOADING: EvidenceReferenceState = { status: 'loading' }
const GONE: EvidenceReferenceState = { status: 'gone' }
const FAILED: EvidenceReferenceState = { status: 'failed' }

/** One evidence item at one moment: its project, its id and the moment. */
export function evidenceReferenceKey(link: EvidenceLink): string {
  return `${link.projectId}|${link.evidenceId}|${link.at ?? ''}`
}

/**
 * Evidence items as read this session, shared by every chip and view showing
 * one: a message citing an item three times reads it once. What is gone stays
 * gone; a failed read is said once and read again at the next ask. A held item
 * is read afresh shortly before its media grant runs out, and shown meanwhile.
 */
export class EvidenceReferenceStore {
  private readonly _load: EvidenceReferenceLoad
  private readonly _options: EvidenceReferenceStoreOptions
  private readonly _held: BoundedCache<EvidenceReferenceState>
  private readonly _reads = new Map<string, Promise<void>>()
  private readonly _listeners = new Map<string, Set<() => void>>()

  constructor(load: EvidenceReferenceLoad, options: EvidenceReferenceStoreOptions) {
    this._load = load
    this._options = options
    this._held = new BoundedCache(options.capacity)
  }

  /** What is known of the item now; on its way while nothing is. */
  snapshot(link: EvidenceLink): EvidenceReferenceState {
    return this._held.get(evidenceReferenceKey(link)) ?? LOADING
  }

  /** Hear every change to the item; returns the way to stop. */
  listen(link: EvidenceLink, onChange: () => void): () => void {
    const key = evidenceReferenceKey(link)
    const listeners = this._listeners.get(key) ?? new Set()
    listeners.add(onChange)
    this._listeners.set(key, listeners)
    return () => {
      listeners.delete(onChange)
      if (listeners.size === 0) this._listeners.delete(key)
    }
  }

  /** Read the item unless what is held still stands; one read for everyone asking now. */
  read(link: EvidenceLink): Promise<void> {
    const key = evidenceReferenceKey(link)
    const held = this._held.get(key)
    if (held && !this._stale(held)) return Promise.resolve()
    const inFlight = this._reads.get(key)
    if (inFlight) return inFlight
    const read = this._load(link)
      .then((item) => this._settle(key, item ? { status: 'ready', item } : GONE))
      .catch(() => {
        if (this._held.get(key)?.status !== 'ready') this._settle(key, FAILED)
      })
      .finally(() => this._reads.delete(key))
    this._reads.set(key, read)
    return read
  }

  /** Forget everything — for a sign-out, and for tests. */
  clear(): void {
    this._held.clear()
    this._reads.clear()
  }

  private _stale(held: EvidenceReferenceState): boolean {
    if (held.status === 'failed') return true
    if (held.status !== 'ready' || !held.item.media) return false
    const expires = Date.parse(held.item.media.expiresAt)
    return Number.isFinite(expires) && expires - this._options.renewBeforeMs <= this._options.now()
  }

  private _settle(key: string, state: EvidenceReferenceState): void {
    this._held.set(key, state)
    for (const listener of this._listeners.get(key) ?? []) listener()
  }
}
