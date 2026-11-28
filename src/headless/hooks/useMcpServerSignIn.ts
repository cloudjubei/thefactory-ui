import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import type { McpServerOwner } from '../utils/mcpServersTypes'
import { McpServersStore } from './mcpServersStore'
import { signInSessionsStoreFor } from './useSignInSession'

export type UseMcpServerSignIn = {
  /** The press is on its way. */
  starting: boolean
  /** Why the sign-in could not start, or why it ended unfinished. */
  error: string | null
  /** Open the sign-in inside the app, or show the one open again. */
  signIn: () => void
}

/**
 * One server's sign-in, as Settings starts it, for a card that has no list of
 * servers to show. The backend answers the card when the sign-in finishes.
 */
export function useMcpServerSignIn(owner: McpServerOwner, serverId: string): UseMcpServerSignIn {
  const { ws } = useApi()
  const key = owner.kind === 'project' ? `project:${owner.projectId}` : `group:${owner.groupId}`
  const store = useMemo(
    () => new McpServersStore(owner, signInSessionsStoreFor(ws)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ws],
  )
  useEffect(() => store.retain(), [store])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  const signIn = useCallback(() => void store.signIn(serverId), [store, serverId])
  return {
    starting: state.signIns[serverId]?.step === 'starting',
    error: state.error,
    signIn,
  }
}
