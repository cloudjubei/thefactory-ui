import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Synchronous key-value storage shape. Wraps `localStorage` on web,
 * `MMKV.getString`/`set` on native, an Electron `safeStorage`-backed
 * preload bridge on desktop. The `subscribe` slot is optional — only web's
 * cross-tab `storage` event populates it; MMKV / safeStorage consumers may
 * skip it.
 */
export interface SyncKVStorage {
  get(key: string): string | null
  set(key: string, value: string): void
  /** Optional cross-context listener. Returns an unsubscribe function. */
  subscribe?(key: string, listener: (next: string | null) => void): () => void
}

/**
 * `useState` with sync-KV persistence. Reads the seed value from storage on
 * mount, persists every committed change (deferred so the mount read isn't
 * echoed back), and re-hydrates from `subscribe` when the value changes
 * out-of-band (e.g. a second tab editing the same key).
 *
 * Consumers supply `read` and `write` so the deep-merge / parse / serialize
 * logic stays type-specific and out of this hook.
 */
export function useStorageBackedState<T>(
  storage: SyncKVStorage,
  key: string,
  read: (raw: string | null) => T,
  write: (state: T) => string,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => read(storage.get(key)))

  // Skip the mount-time write — initial state IS what we just read from
  // storage, no need to echo it back.
  const initialRef = useRef(true)
  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false
      return
    }
    try {
      storage.set(key, write(state))
    } catch {
      /* storage unavailable or quota exceeded */
    }
  }, [state, key, storage, write])

  // Pick up out-of-band changes (cross-tab `storage` events, multi-window
  // edits) without tearing the hook down.
  useEffect(() => {
    if (!storage.subscribe) return
    return storage.subscribe(key, (next) => setState(read(next)))
  }, [key, storage, read])

  return [state, setState]
}
