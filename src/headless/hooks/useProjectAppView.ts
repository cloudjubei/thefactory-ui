import { useCallback, useEffect, useRef, useState } from 'react'
import { grantProjectAppViewToken } from '../api/generated'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { computeRefreshDelayMs } from '../utils/viewTokenSchedule'

/**
 * Drives the App-view surface for one project:
 *   - Mints a signed `viewToken` via `POST /api/v1/projects/:id/view/grant`
 *     (the iframe / WebView can't inject auth headers on sub-resource
 *     loads, so a query-param token is the transport — see the App-view
 *     auth decision in the financial-planner plan §A).
 *   - Builds the absolute URL the iframe / WebView points at.
 *   - Auto-refreshes the token `REFRESH_LEAD_MS` before expiry so the
 *     surface never serves a 401.
 *   - Increments `key` whenever the consumer should remount its iframe /
 *     WebView — on token rotation AND on `files:changed` for this project
 *     (the agent edited a file; the App view should reflect it). The
 *     `files:changed` path is debounced to a single bump per burst so a
 *     fast cascade of agent writes doesn't thrash the iframe (a quality
 *     improvement over the un-debounced pattern in `FilesContext`).
 */
export interface UseProjectAppView {
  /** URL the consumer should point an iframe / WebView at. `undefined` until the first token is granted. */
  url: string | undefined
  /** Increments whenever the consumer should remount its iframe / WebView. */
  key: number
  /** Force a fresh token mint + key bump. */
  refresh: () => Promise<void>
  /** Last grant error, or `null` after a successful mint. */
  error: Error | null
}

/** Refresh the token this many ms before its declared expiry. */
const REFRESH_LEAD_MS = 60_000
/** Coalesce `files:changed` events into a single key bump per burst. */
const FILES_CHANGED_DEBOUNCE_MS = 250

export function useProjectAppView(projectId: string | undefined): UseProjectAppView {
  const { token } = useAuth()
  const { ws, apiBaseUrl } = useApi()

  const [url, setUrl] = useState<string | undefined>(undefined)
  const [key, setKey] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!projectId || !apiBaseUrl) return
    try {
      const { data } = await grantProjectAppViewToken({
        path: { projectId },
        throwOnError: true,
      })
      const next = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/view/index.html?viewToken=${encodeURIComponent(data.token)}`
      setUrl(next)
      setKey((k) => k + 1)
      setError(null)

      // Schedule the next mint just before the token expires.
      clearRefreshTimer()
      const delay = computeRefreshDelayMs({ expiresAt: data.expiresAt, leadMs: REFRESH_LEAD_MS })
      if (delay !== null) {
        refreshTimerRef.current = setTimeout(() => void refresh(), delay)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }, [projectId, apiBaseUrl, clearRefreshTimer])

  // Initial mint when projectId + auth + baseUrl are all ready.
  useEffect(() => {
    if (!token || !projectId || !apiBaseUrl) return
    void refresh()
    return clearRefreshTimer
  }, [token, projectId, apiBaseUrl, refresh, clearRefreshTimer])

  // Debounced key bump on this project's file changes.
  useEffect(() => {
    if (!projectId) return
    const unsub = ws.on<{ projectId?: string }>('files:changed', (event) => {
      if (event.projectId !== projectId) return
      clearDebounceTimer()
      debounceTimerRef.current = setTimeout(() => {
        setKey((k) => k + 1)
        debounceTimerRef.current = null
      }, FILES_CHANGED_DEBOUNCE_MS)
    })
    return () => {
      unsub()
      clearDebounceTimer()
    }
  }, [ws, projectId, clearDebounceTimer])

  return { url, key, refresh, error }
}
