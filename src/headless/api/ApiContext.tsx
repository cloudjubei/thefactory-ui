import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ProcessDecisionClient } from 'thefactory-tools/types'
import { useAuth } from './AuthContext'
import { askStartupStatus, createBackendStartupProbe } from './backendStartup'
import type { BackendStartup, BackendStartupStatus } from './backendStartupTypes'
import { client as sdkClient } from './generated/client.gen'
import { configureBackendClient } from './bootstrap'
import { WsClient, type WsConnectionState } from './WsClient'

/**
 * Configuration accepted by `configureBackendClient` — exported for callers
 * that want to wire the SDK manually (e.g. a non-React boot path). Inside
 * this package, `ApiProvider` handles the wiring on render.
 */
export interface ConfigureBackendClientOptions {
  baseUrl: string
  getToken: () => string | null
  onUnauthorized: () => void
  onAuthorized: () => void
  /** A call was refused because the backend is still starting; reports its progress. */
  onStarting: (startup: BackendStartup) => void
}

export interface ApiContextValue {
  ws: WsClient
  wsState: WsConnectionState
  /**
   * The configured HTTP base URL (mirror of the `apiBaseUrl` prop on
   * `ApiProvider`). `null` when the SDK hasn't been configured yet.
   * Exposed so consumers can construct URLs the SDK doesn't directly
   * generate — e.g. the App-view iframe `src` that has to be absolute on
   * desktop + mobile because they're cross-origin to the backend.
   */
  apiBaseUrl: string | null
  /** The app this is — what a decision taken in it says it was taken on. */
  client: ProcessDecisionClient
  /**
   * False until the backend says it is ready (`GET /health/startup`, asked every second while a
   * token is set): its initial search-index pass (it refuses every call until then) and its
   * knowledge maps' startup pass have both settled. Apps hold their data layer behind a loading
   * screen meanwhile. Turns false again if a call is refused as "starting" (the backend restarted).
   */
  backendReady: boolean
  /** The backend's startup progress while it is not ready yet, when known. */
  backendStartup: BackendStartup | null
}

const ApiContext = createContext<ApiContextValue | null>(null)

export interface ApiProviderProps {
  /**
   * HTTP base URL for the generated SDK. `null` skips SDK configuration —
   * use this when the backend URL is user-configured and hasn't been
   * supplied yet (e.g. desktop's pre-login state).
   */
  apiBaseUrl: string | null
  /** WebSocket base URL. `null` keeps the socket idle. */
  wsBaseUrl: string | null
  /** The app this is: `web`, `desktop` or `mobile`. */
  client: ProcessDecisionClient
  children: ReactNode
}

const NOT_YET_READY: BackendStartupStatus = { ready: false, startup: null }

export function ApiProvider({ apiBaseUrl, wsBaseUrl, client, children }: ApiProviderProps) {
  const { token, markUnauthorized, clearUnauthorized } = useAuth()
  const [wsState, setWsState] = useState<WsConnectionState>('idle')
  const [startupStatus, setStartupStatus] = useState<BackendStartupStatus>(NOT_YET_READY)
  const startupStatusRef = useRef(startupStatus)
  startupStatusRef.current = startupStatus

  const authRef = useRef({ token, markUnauthorized, clearUnauthorized })
  authRef.current = { token, markUnauthorized, clearUnauthorized }

  // SDK is configured inline (not in a useEffect) so child providers mounted
  // in the same render cycle observe a configured SDK before their effects
  // fire HTTP calls. Effects run child-first, so a useEffect here would lose
  // the race the first time `apiBaseUrl` transitions from null → real.
  // `configureBackendClient` is idempotent (ejects prior interceptors before
  // installing new), so calling it on every change is safe.
  const configuredBaseUrlRef = useRef<string | null>(null)
  if (apiBaseUrl && apiBaseUrl !== configuredBaseUrlRef.current) {
    configureBackendClient({
      baseUrl: apiBaseUrl,
      getToken: () => authRef.current.token,
      onUnauthorized: () => authRef.current.markUnauthorized(),
      onAuthorized: () => authRef.current.clearUnauthorized(),
      onStarting: (startup) => setStartupStatus({ ready: false, startup }),
    })
    configuredBaseUrlRef.current = apiBaseUrl
  }

  const ws = useMemo(
    () =>
      new WsClient({
        baseUrl: wsBaseUrl ?? '',
        getToken: () => authRef.current.token,
        onStateChange: setWsState,
      }),
    [wsBaseUrl],
  )

  useEffect(() => {
    if (!wsBaseUrl || !token) {
      ws.disconnect()
      return
    }
    ws.connect()
    return () => ws.disconnect()
  }, [token, ws, wsBaseUrl])

  useEffect(() => {
    setStartupStatus(NOT_YET_READY)
  }, [apiBaseUrl])

  useEffect(() => {
    if (!apiBaseUrl || !token || startupStatus.ready) return
    const probe = createBackendStartupProbe({
      knownStarting: startupStatusRef.current.startup !== null,
      fetchStatus: () =>
        askStartupStatus(() => sdkClient.get({ url: '/health/startup', throwOnError: true })),
      onChange: setStartupStatus,
    })
    probe.start()
    return () => probe.stop()
  }, [apiBaseUrl, token, startupStatus.ready])

  const value = useMemo<ApiContextValue>(
    () => ({
      ws,
      wsState,
      apiBaseUrl,
      client,
      backendReady: startupStatus.ready,
      backendStartup: startupStatus.startup,
    }),
    [ws, wsState, apiBaseUrl, client, startupStatus],
  )
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

/** The API when an `ApiProvider` is above — `null` where none is (a showcase, a static render). */
export function useOptionalApi(): ApiContextValue | null {
  return useContext(ApiContext)
}

export function useApi(): ApiContextValue {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error('useApi must be used within ApiProvider')
  return ctx
}
