import { useCallback, useEffect, useRef, useState } from 'react'
import { listChatToolCatalog } from '../api'
import { useAuth } from '../api/AuthContext'
import type { ChatToolCatalogEntry, ChatToolRunner } from '../utils/chatToolTogglesTypes'

const EMPTY: ChatToolCatalogEntry[] = []

/**
 * The tools a chat on this transport can be OFFERED, as the backend assembles
 * them from the same arrays the runtime registers from. Sourcing the settings
 * list from the chat's own stored allowlist instead — what every client used to
 * do — makes a tool the chat does not already carry impossible to switch on.
 */
export function useChatToolCatalog(runner: ChatToolRunner): {
  catalog: ChatToolCatalogEntry[]
  isLoaded: boolean
  loadError: Error | null
  refresh: () => Promise<void>
} {
  const { token } = useAuth()
  const [catalog, setCatalog] = useState<ChatToolCatalogEntry[]>(EMPTY)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { data } = await listChatToolCatalog({
        query: { runner },
        signal: controller.signal,
        throwOnError: true,
      })
      if (controller.signal.aborted) return
      setCatalog(data)
      setLoadError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (!controller.signal.aborted) setIsLoaded(true)
    }
  }, [runner])

  useEffect(() => {
    if (!token) return
    void refresh()
    return () => abortRef.current?.abort()
  }, [token, refresh])

  return { catalog, isLoaded, loadError, refresh }
}
