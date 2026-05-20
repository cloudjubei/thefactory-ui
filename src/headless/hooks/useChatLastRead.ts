import { useCallback, useEffect, useState } from 'react'

/**
 * Per-chat "last read" timestamp tracker. The storage layer is platform-
 * specific (web → `localStorage` + `CustomEvent`; desktop → ditto; RN →
 * `AsyncStorage` + an `EventEmitter`); this hook owns only the React
 * surface — re-render on external change + memoised `mark` callbacks.
 *
 * The host provides:
 *  - `getLastRead(chatKey)` — synchronous read
 *  - `setLastRead(chatKey, iso)` — synchronous write, must also broadcast
 *    so other instances re-render
 *  - `subscribe(cb)` — registers a listener; returns an unsubscribe. Called
 *    whenever any chat key's value changes (in any tab/window).
 *
 * The hook returns the live value for the supplied `chatKey` and a pair
 * of `markRead*` helpers that write through to storage.
 */

export type ChatLastReadStore = {
  getLastRead: (chatKey: string) => string | undefined
  setLastRead: (chatKey: string, iso: string) => void
  /** Subscribe to any-key change. Returns unsubscribe. */
  subscribe: (cb: () => void) => () => void
}

export type UseChatLastReadApi = {
  /** ISO timestamp of the last assistant message the user has seen, if any. */
  lastReadIso: string | undefined
  /** Mark the chat as read up to the given ISO (defaults to now). */
  markReadByKey: (chatKey: string, iso?: string) => void
  /** Convenience: derive the key from a host-shaped context. */
  markReadByContext: <T>(ctx: T, iso?: string) => void
  /** Reads (synchronously) the stored value for any chat key. */
  getLastReadForKey: (chatKey: string) => string | undefined
}

export type UseChatLastReadOptions = {
  /** Target chat key — `lastReadIso` tracks this one. Pass `undefined`
   *  when the host doesn't have a current chat yet. */
  chatKey: string | undefined
  store: ChatLastReadStore
  /** Used by `markReadByContext` to derive a chat key from the host's
   *  context shape. Typically `getChatContextKey`. */
  contextKey?: <T>(ctx: T) => string
}

export function useChatLastRead({
  chatKey,
  store,
  contextKey,
}: UseChatLastReadOptions): UseChatLastReadApi {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return store.subscribe(() => setVersion((v) => v + 1))
  }, [store])

  // `version` is intentionally read so subsequent calls to `getLastRead`
  // after a `setLastRead` re-evaluate during render. Holding it as a
  // dependency would only memoise the read — referencing it directly
  // forces the read to re-run on every change.
  void version

  const lastReadIso = chatKey ? store.getLastRead(chatKey) : undefined

  const markReadByKey = useCallback(
    (key: string, iso?: string) => {
      store.setLastRead(key, iso || new Date().toISOString())
      setVersion((v) => v + 1)
    },
    [store],
  )

  const markReadByContext = useCallback(
    <T>(ctx: T, iso?: string) => {
      if (!contextKey) return
      store.setLastRead(contextKey(ctx), iso || new Date().toISOString())
      setVersion((v) => v + 1)
    },
    [store, contextKey],
  )

  const getLastReadForKey = useCallback((key: string) => store.getLastRead(key), [store])

  return { lastReadIso, markReadByKey, markReadByContext, getLastReadForKey }
}
