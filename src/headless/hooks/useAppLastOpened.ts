import { useCallback, useEffect, useState } from 'react'

/**
 * Per-project "last opened the app tab" timestamp tracker — the baseline the unseen-results badge
 * counts finished activities against. Mirrors {@link useChatLastRead}: the storage layer is
 * platform-specific (web → `localStorage` + `CustomEvent`; desktop → ditto; RN → native storage +
 * an emitter); this hook owns only the React surface — re-render on external change + a memoised
 * `markOpened`.
 */

export type AppLastOpenedStore = {
  getLastOpened: (projectId: string) => string | undefined
  setLastOpened: (projectId: string, iso: string) => void
  /** Subscribe to any-project change. Returns unsubscribe. */
  subscribe: (cb: () => void) => () => void
}

export type UseAppLastOpenedApi = {
  /** ISO timestamp the user last opened `projectId`'s app tab, if ever. */
  lastOpenedIso: string | undefined
  /** Stamp `projectId`'s app tab as opened now (or at the given ISO) — clears its unseen badge. */
  markOpened: (iso?: string) => void
  /** Synchronous read for any project (for sidebar rows). */
  getLastOpenedForProject: (projectId: string) => string | undefined
}

export function useAppLastOpened(
  projectId: string | undefined,
  store: AppLastOpenedStore,
): UseAppLastOpenedApi {
  const [version, setVersion] = useState(0)

  useEffect(() => store.subscribe(() => setVersion((v) => v + 1)), [store])

  // Read `version` directly (not as a dep) so the synchronous read below re-runs on every change.
  void version

  const lastOpenedIso = projectId ? store.getLastOpened(projectId) : undefined

  const markOpened = useCallback(
    (iso?: string) => {
      if (!projectId) return
      store.setLastOpened(projectId, iso || new Date().toISOString())
      setVersion((v) => v + 1)
    },
    [store, projectId],
  )

  const getLastOpenedForProject = useCallback((pid: string) => store.getLastOpened(pid), [store])

  return { lastOpenedIso, markOpened, getLastOpenedForProject }
}
