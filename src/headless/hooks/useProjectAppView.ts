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
 *   - Auto-rotates the token `REFRESH_LEAD_MS` before expiry so the
 *     surface never serves a 401. Rotation only stores the fresh URL in a
 *     ref — it must never touch `url`/`key`, otherwise every scheduled
 *     rotation would remount the surface and reset the embedded app.
 *   - Increments `key` (publishing the freshest minted URL alongside it)
 *     whenever the consumer should remount its iframe / WebView — on
 *     `files:changed` for this project (the agent edited a file; the App
 *     view should reflect it). The `files:changed` path is debounced to a
 *     single bump per burst so a fast cascade of agent writes doesn't
 *     thrash the iframe (a quality improvement over the un-debounced
 *     pattern in `FilesContext`).
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
/** Back off this long before retrying after a failed mint, so a transient grant error doesn't stop rotation. */
const MINT_RETRY_MS = 30_000
/** Coalesce `files:changed` events into a single key bump per burst. */
const FILES_CHANGED_DEBOUNCE_MS = 250

export function useProjectAppView(projectId: string | undefined): UseProjectAppView {
  const { token } = useAuth()
  const { ws, apiBaseUrl } = useApi()

  const [url, setUrl] = useState<string | undefined>(undefined)
  const [key, setKey] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const latestUrlRef = useRef<string | undefined>(undefined)
  const latestExpiresAtRef = useRef<string | undefined>(undefined)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Bumped on every projectId change / unmount; an in-flight mint compares the
  // epoch it captured and bails if it resolved into a stale render, so a late
  // grant for a previous project can't poison the ref or re-arm its timer.
  const epochRef = useRef(0)

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

  const mint = useCallback(async (): Promise<boolean> => {
    if (!projectId || !apiBaseUrl) return false
    const epoch = epochRef.current
    try {
      const { data } = await grantProjectAppViewToken({
        path: { projectId },
        throwOnError: true,
      })
      if (epochRef.current !== epoch) return false
      latestUrlRef.current = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/view/index.html?viewToken=${encodeURIComponent(data.token)}`
      latestExpiresAtRef.current = data.expiresAt
      setError(null)

      // Schedule the next mint just before the token expires.
      clearRefreshTimer()
      const delay = computeRefreshDelayMs({ expiresAt: data.expiresAt, leadMs: REFRESH_LEAD_MS })
      if (delay !== null) {
        refreshTimerRef.current = setTimeout(() => void mint(), delay)
      }
      return true
    } catch (err) {
      if (epochRef.current !== epoch) return false
      setError(err instanceof Error ? err : new Error(String(err)))
      // A transient grant failure must not kill rotation: back off + retry.
      clearRefreshTimer()
      refreshTimerRef.current = setTimeout(() => void mint(), MINT_RETRY_MS)
      return false
    }
  }, [projectId, apiBaseUrl, clearRefreshTimer])

  const applyToConsumer = useCallback(() => {
    if (latestUrlRef.current === undefined) return
    setUrl(latestUrlRef.current)
    setKey((k) => k + 1)
  }, [])

  // A remount must never load a token that's expired (or within the refresh lead
  // window): re-mint first when the stored one is stale, then publish it. A `null`
  // delay (unparseable expiry) or `0` (inside the lead window) both count as stale.
  const applyLatest = useCallback(async () => {
    const expiresAt = latestExpiresAtRef.current
    const delay = expiresAt ? computeRefreshDelayMs({ expiresAt, leadMs: REFRESH_LEAD_MS }) : null
    const fresh = latestUrlRef.current !== undefined && (delay ?? 0) > 0
    if (!fresh && !(await mint())) return
    applyToConsumer()
  }, [mint, applyToConsumer])

  const refresh = useCallback(async () => {
    if (await mint()) applyToConsumer()
  }, [mint, applyToConsumer])

  // Initial mint + mount when projectId + auth + baseUrl are all ready. On a
  // projectId change the cleanup bumps the epoch (orphaning any in-flight mint)
  // and clears the previous project's URL so its surface can't briefly show.
  useEffect(() => {
    if (!token || !projectId || !apiBaseUrl) return
    void refresh()
    return () => {
      epochRef.current += 1
      clearRefreshTimer()
      latestUrlRef.current = undefined
      latestExpiresAtRef.current = undefined
      setUrl(undefined)
    }
  }, [token, projectId, apiBaseUrl, refresh, clearRefreshTimer])

  // Debounced remount on this project's file changes, on the freshest
  // minted URL so a late remount doesn't load an already-expired token.
  useEffect(() => {
    if (!projectId) return
    const unsub = ws.on<{ projectId?: string }>('files:changed', (event) => {
      if (event.projectId !== projectId) return
      clearDebounceTimer()
      debounceTimerRef.current = setTimeout(() => {
        void applyLatest()
        debounceTimerRef.current = null
      }, FILES_CHANGED_DEBOUNCE_MS)
    })
    return () => {
      unsub()
      clearDebounceTimer()
    }
  }, [ws, projectId, clearDebounceTimer, applyLatest])

  return { url, key, refresh, error }
}
