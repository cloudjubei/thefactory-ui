import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import type { McpServerOwner } from '../utils/mcpServersTypes'
import { McpServersStore } from './mcpServersStore'

export type UseMcpServerSignIn = {
  /** The page a sign-in started here opened, until the card is answered. */
  pendingUrl: string | undefined
  busy: boolean
  /** Why the sign-in could not start. */
  error: string | null
  /** Start the sign-in; resolves the page to open, or nothing when it cannot start. */
  signIn: () => Promise<string | undefined>
}

/**
 * One server's sign-in, as Settings starts it, for a card that has no list of
 * servers to show. The backend answers the card when the sign-in finishes.
 */
export function useMcpServerSignIn(owner: McpServerOwner, serverId: string): UseMcpServerSignIn {
  const { apiBaseUrl } = useApi()
  const key = owner.kind === 'project' ? `project:${owner.projectId}` : `group:${owner.groupId}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => new McpServersStore(owner, () => apiBaseUrl), [key, apiBaseUrl])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  const signIn = useCallback(() => store.signIn(serverId), [store, serverId])
  return { pendingUrl: state.signIns[serverId], busy: state.busy, error: state.error, signIn }
}
