/** What a {@link LiveResourceStore} holds for one key. */
export type LiveResourceSnapshot<T> = {
  /** The last value read or updated; `undefined` until there is one. */
  data: T | undefined
  /** True once a read finished (or failed), or a remembered value stood in for one. */
  settled: boolean
  /** The last read's failure; cleared by the next good read. */
  error: Error | null
}

/** What a key's live connection may do to the value it keeps current. */
export type LiveResourceHandle<T> = {
  /** Replace the value with what `next` makes of it; returning the same value changes nothing. */
  patch: (next: (prev: T | undefined) => T | undefined) => void
  /** Read the key again (folded into a read already on its way). */
  refresh: () => Promise<void>
}

/** The timer pair a store lingers with — injectable so a test can drive time. */
export type LiveResourceTimers = {
  set: (fn: () => void, ms: number) => unknown
  clear: (handle: unknown) => void
}

export type LiveResourceStoreOptions<T> = {
  /** Read one key whole. */
  load: (key: string) => Promise<T>
  /**
   * Keep a held key current (a socket subscription); returns its disconnect.
   * Called once when a key goes from unheld to held, not per holder.
   */
  connect?: (key: string, handle: LiveResourceHandle<T>) => () => void
  /** How long a key stays live after its last holder let go, so a quick return re-reads nothing. */
  lingerMs: number
  /** A value kept from an earlier visit, painted before the first read. */
  recall?: (key: string) => T | undefined
  /** Keep a settled value for a later visit. */
  remember?: (key: string, data: T) => void
  timers?: LiveResourceTimers
}
