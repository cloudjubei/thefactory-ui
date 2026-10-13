import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { listChatToolCatalog } from '../api'
import { useAuth } from '../api/AuthContext'
import { LiveResourceStore } from '../utils/liveResourceStore'
import { CHAT_TOOL_CATALOG_LINGER_MS } from '../utils/chatToolTogglesConstants'
import type { ChatToolCatalogEntry, ChatToolRunner } from '../utils/chatToolTogglesTypes'

const EMPTY: ChatToolCatalogEntry[] = []

const lastRead = new Map<string, ChatToolCatalogEntry[]>()

const catalogs = new LiveResourceStore<ChatToolCatalogEntry[]>({
  load: async (runner) => {
    const { data } = await listChatToolCatalog({
      query: { runner: runner as ChatToolRunner },
      throwOnError: true,
    })
    return data
  },
  lingerMs: CHAT_TOOL_CATALOG_LINGER_MS,
  recall: (runner) => lastRead.get(runner),
  remember: (runner, catalog) => lastRead.set(runner, catalog),
})

/**
 * The tools a chat on this transport can be OFFERED, as the backend assembles
 * them from the same arrays the runtime registers from. Sourcing the settings
 * list from the chat's own stored allowlist instead — what every client used to
 * do — makes a tool the chat does not already carry impossible to switch on.
 *
 * One read per transport for every chat showing it: the settings panel each
 * open chat mounts shares it, and a chat reopened soon after reads nothing.
 */
export function useChatToolCatalog(runner: ChatToolRunner): {
  catalog: ChatToolCatalogEntry[]
  isLoaded: boolean
  loadError: Error | null
  refresh: () => Promise<void>
} {
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    return catalogs.retain(runner)
  }, [runner, token])

  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => catalogs.listen(runner, listener), [runner]),
    () => catalogs.snapshot(runner),
    () => catalogs.snapshot(runner),
  )
  const refresh = useCallback(() => catalogs.refresh(runner), [runner])

  return useMemo(
    () => ({
      catalog: snapshot.data ?? EMPTY,
      isLoaded: snapshot.settled,
      loadError: snapshot.error,
      refresh,
    }),
    [snapshot, refresh],
  )
}
