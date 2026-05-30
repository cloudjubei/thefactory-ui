import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
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
  children: ReactNode
}

export function ApiProvider({ apiBaseUrl, wsBaseUrl, children }: ApiProviderProps) {
  const { token, markUnauthorized, clearUnauthorized } = useAuth()
  const [wsState, setWsState] = useState<WsConnectionState>('idle')

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

  const value = useMemo<ApiContextValue>(
    () => ({ ws, wsState, apiBaseUrl }),
    [ws, wsState, apiBaseUrl],
  )
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export function useApi(): ApiContextValue {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error('useApi must be used within ApiProvider')
  return ctx
}
