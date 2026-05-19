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
import { WsClient, type WsConnectionState } from './WsClient'

/**
 * Configuration handed to the SDK-specific bootstrap. The HTTP-client
 * configuration lives per-client because the generated hey-api client is
 * not (yet) part of this package — see `thefactory-ui/docs/implementation-plan.md`
 * §B.4. Web / desktop / mobile each pass their own `configure` callback
 * that wires `getToken` + the 401 callbacks into the local SDK instance,
 * and returns a teardown.
 */
export interface ConfigureBackendClientOptions {
  baseUrl: string
  getToken: () => string | null
  onUnauthorized: () => void
  onAuthorized: () => void
}

export type ConfigureBackendClient = (opts: ConfigureBackendClientOptions) => () => void

export interface ApiContextValue {
  ws: WsClient
  wsState: WsConnectionState
}

const ApiContext = createContext<ApiContextValue | null>(null)

export interface ApiProviderProps {
  apiBaseUrl: string
  wsBaseUrl: string
  /** Called once on mount; returns a teardown invoked on unmount. */
  configure: ConfigureBackendClient
  children: ReactNode
}

export function ApiProvider({
  apiBaseUrl,
  wsBaseUrl,
  configure,
  children,
}: ApiProviderProps) {
  const { token, markUnauthorized, clearUnauthorized } = useAuth()
  const [wsState, setWsState] = useState<WsConnectionState>('idle')

  // Current auth is held in a ref so one-time-constructed clients and
  // resolvers can read the latest values without reconstruction.
  const authRef = useRef({ token, markUnauthorized, clearUnauthorized })
  authRef.current = { token, markUnauthorized, clearUnauthorized }

  // The HTTP client is configured during render (not in a useEffect) because
  // React fires useEffects child-first. If we configured in an effect, child
  // data providers would fire their refresh effects — and HTTP calls — before
  // this provider's effect set the axios baseURL, sending the first request
  // to the wrong origin. Inline configuration guarantees the SDK is ready
  // before any child renders or mounts.
  const sdkRef = useRef<{ baseUrl: string; teardown: () => void } | null>(null)
  if (sdkRef.current?.baseUrl !== apiBaseUrl) {
    sdkRef.current?.teardown()
    sdkRef.current = {
      baseUrl: apiBaseUrl,
      teardown: configure({
        baseUrl: apiBaseUrl,
        getToken: () => authRef.current.token,
        onUnauthorized: () => authRef.current.markUnauthorized(),
        onAuthorized: () => authRef.current.clearUnauthorized(),
      }),
    }
  }
  useEffect(
    () => () => {
      sdkRef.current?.teardown()
      sdkRef.current = null
    },
    [],
  )

  const ws = useMemo(
    () =>
      new WsClient({
        baseUrl: wsBaseUrl,
        getToken: () => authRef.current.token,
        onStateChange: setWsState,
      }),
    [wsBaseUrl],
  )

  useEffect(() => {
    if (!token) {
      ws.disconnect()
      return
    }
    ws.connect()
    return () => ws.disconnect()
  }, [token, ws])

  const value = useMemo<ApiContextValue>(() => ({ ws, wsState }), [ws, wsState])
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export function useApi(): ApiContextValue {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error('useApi must be used within ApiProvider')
  return ctx
}
