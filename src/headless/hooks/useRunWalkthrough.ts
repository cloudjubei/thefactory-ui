import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { loomWalkthroughView } from '../utils/runWalkthrough'
import type { LoomWalkthroughActions, LoomWalkthroughView } from '../utils/runWalkthroughTypes'
import { RunWalkthroughStore } from './runWalkthroughStore'

const RUN_UPDATE_EVENT = 'process:run-update'

export type UseRunWalkthrough = LoomWalkthroughActions & {
  /** What its tab shows; undefined until read, and for a run with nothing to record. */
  view: LoomWalkthroughView | undefined
}

/**
 * A run's Loom walkthrough, kept current as proof is filed: filing pushes the run.
 * Use the leg's run id, as a group run has no items of its own.
 */
export function useRunWalkthrough(runId: string | undefined): UseRunWalkthrough {
  const { token } = useAuth()
  const { ws, apiBaseUrl, sendFileFromUri } = useApi()
  const sender = useRef({ apiBaseUrl, token, sendFileFromUri })
  sender.current = { apiBaseUrl, token, sendFileFromUri }
  const store = useMemo(() => new RunWalkthroughStore(runId ?? '', () => sender.current), [runId])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  useEffect(() => {
    if (token && runId) void store.refresh()
  }, [token, runId, store])

  useEffect(() => {
    if (!token || !runId) return
    const offRun = ws.on(RUN_UPDATE_EVENT, (data: unknown) => {
      if ((data as { runId?: string })?.runId === runId) void store.refresh()
    })
    const offReconnect = ws.onReconnect(() => void store.refresh())
    return () => {
      offRun()
      offReconnect()
    }
  }, [ws, token, runId, store])

  return useMemo(
    () => ({
      view: loomWalkthroughView(state),
      attachLink: store.attachLink,
      attachFile: store.attachFile,
    }),
    [state, store],
  )
}
