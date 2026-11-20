import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { testSessionDisplay } from '../utils/testSessionView'
import { TEST_SESSION_EVENT } from '../utils/testSessionViewConstants'
import type { LaunchAgentPickMetadata } from '../utils/launchAgentPickTypes'
import type { TestSessionDisplay } from '../utils/testSessionViewTypes'
import { TestSessionStore } from './testSessionStore'

const RUN_UPDATE_EVENT = 'process:run-update'

export type UseTestSession = {
  /** The block to show; undefined until read, and for a run the backend does not know. */
  display: TestSessionDisplay | undefined
  /** Start the session and its helper on the agent picked, shown at once; resolves to whether the backend took it. */
  start: (agent?: LaunchAgentPickMetadata) => Promise<boolean>
  /** Stop the session, shown at once; resolves to whether the backend took it. */
  stop: () => Promise<boolean>
}

/**
 * A run's "Test with me" session at its sign-off, kept current as the session changes and the
 * run moves on. A leg of a group run shares its group's session.
 */
export function useTestSession(runId: string | undefined): UseTestSession {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = useMemo(() => new TestSessionStore(runId ?? ''), [runId])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  useEffect(() => {
    if (token && runId) void store.refresh()
  }, [token, runId, store])

  useEffect(() => {
    if (!token || !runId) return
    const offSession = ws.on(TEST_SESSION_EVENT, store.onUpdate)
    const offRun = ws.on(RUN_UPDATE_EVENT, (data: unknown) => {
      if ((data as { runId?: string } | null)?.runId === runId) void store.refresh()
    })
    const offReconnect = ws.onReconnect(() => void store.refresh())
    return () => {
      offSession()
      offRun()
      offReconnect()
    }
  }, [ws, token, runId, store])

  return useMemo(
    () => ({ display: testSessionDisplay(state), start: store.start, stop: store.stop }),
    [state, store],
  )
}
