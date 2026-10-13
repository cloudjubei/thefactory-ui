import { createCoalescedRefresh } from './runUpdateRefresh'
import type {
  LiveResourceHandle,
  LiveResourceSnapshot,
  LiveResourceStoreOptions,
  LiveResourceTimers,
} from './liveResourceStoreTypes'

type Entry<T> = {
  snapshot: LiveResourceSnapshot<T>
  listeners: Set<() => void>
  holders: number
  live: boolean
  disconnect: (() => void) | undefined
  lingerTimer: unknown
  refresh: () => Promise<void>
}

const DEFAULT_TIMERS: LiveResourceTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

/**
 * One shared copy of a keyed resource for every view that shows it: a key is
 * read once however many views hold it, kept current by one live connection,
 * and painted at once from what an earlier visit remembered while it is read
 * again. A key stays live for a while after its last holder lets go, so moving
 * between views that show it re-reads nothing. Pure: reading, connecting and
 * remembering are the caller's.
 */
export class LiveResourceStore<T> {
  private readonly _entries = new Map<string, Entry<T>>()
  private readonly _options: LiveResourceStoreOptions<T>
  private readonly _timers: LiveResourceTimers

  constructor(options: LiveResourceStoreOptions<T>) {
    this._options = options
    this._timers = options.timers ?? DEFAULT_TIMERS
  }

  /** The key as held now — the same object until it changes. */
  snapshot(key: string): LiveResourceSnapshot<T> {
    return this._entry(key).snapshot
  }

  /** Be told when the key changes; returns the unlisten. */
  listen(key: string, listener: () => void): () => void {
    const entry = this._entry(key)
    entry.listeners.add(listener)
    return () => {
      entry.listeners.delete(listener)
    }
  }

  /**
   * Hold the key: the first holder reads it and connects it live; later ones
   * share both. Returns the release, which counts once however often it is called.
   */
  retain(key: string): () => void {
    const entry = this._entry(key)
    entry.holders += 1
    if (entry.lingerTimer !== undefined) {
      this._timers.clear(entry.lingerTimer)
      entry.lingerTimer = undefined
    }
    if (!entry.live) {
      entry.live = true
      entry.disconnect = this._options.connect?.(key, this._handle(key))
      void entry.refresh()
    }
    let released = false
    return () => {
      if (released) return
      released = true
      entry.holders -= 1
      if (entry.holders > 0) return
      entry.lingerTimer = this._timers.set(() => this._quiet(key, entry), this._options.lingerMs)
    }
  }

  /** Read the key again, folded into a read already on its way. */
  refresh(key: string): Promise<void> {
    return this._entry(key).refresh()
  }

  private _quiet(key: string, entry: Entry<T>): void {
    entry.lingerTimer = undefined
    if (entry.holders > 0) return
    entry.live = false
    entry.disconnect?.()
    entry.disconnect = undefined
    if (entry.listeners.size === 0) this._entries.delete(key)
  }

  private _handle(key: string): LiveResourceHandle<T> {
    return {
      patch: (next) => this._patch(key, next),
      refresh: () => this.refresh(key),
    }
  }

  private _patch(key: string, next: (prev: T | undefined) => T | undefined): void {
    const entry = this._entry(key)
    const data = next(entry.snapshot.data)
    if (data === entry.snapshot.data) return
    this._set(key, entry, { ...entry.snapshot, data })
  }

  private _set(key: string, entry: Entry<T>, snapshot: LiveResourceSnapshot<T>): void {
    entry.snapshot = snapshot
    if (snapshot.settled && snapshot.data !== undefined)
      this._options.remember?.(key, snapshot.data)
    for (const listener of [...entry.listeners]) listener()
  }

  private _entry(key: string): Entry<T> {
    const existing = this._entries.get(key)
    if (existing) return existing
    const recalled = this._options.recall?.(key)
    const entry: Entry<T> = {
      snapshot: { data: recalled, settled: recalled !== undefined, error: null },
      listeners: new Set(),
      holders: 0,
      live: false,
      disconnect: undefined,
      lingerTimer: undefined,
      refresh: createCoalescedRefresh(async () => {
        try {
          const data = await this._options.load(key)
          this._set(key, entry, { data, settled: true, error: null })
        } catch (err) {
          this._set(key, entry, { ...entry.snapshot, settled: true, error: asError(err) })
        }
      }),
    }
    this._entries.set(key, entry)
    return entry
  }
}
