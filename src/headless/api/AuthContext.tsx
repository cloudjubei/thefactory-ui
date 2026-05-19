import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Token-storage adapter. Implementations:
 *   - web: `localStorage.getItem('thefactory.bearerToken')` + an env-var fallback for first-launch
 *   - desktop: `safeStorage` IPC bridge
 *   - mobile: `expo-secure-store` / MMKV
 *
 * `subscribe` is optional — only the web adapter populates it (cross-tab
 * `storage` events). Native consumers can skip it.
 */
export interface TokenStorage {
  read(): string | null
  write(token: string | null): void
  subscribe?(listener: (next: string | null) => void): () => void
}

export interface AuthContextValue {
  token: string | null
  /** True if the API returned 401 for the current token. */
  unauthorized: boolean
  setToken: (token: string | null) => void
  clearToken: () => void
  markUnauthorized: () => void
  clearUnauthorized: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export interface AuthProviderProps {
  storage: TokenStorage
  children: ReactNode
}

export function AuthProvider({ storage, children }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(() => storage.read())
  const [unauthorized, setUnauthorized] = useState(false)

  const setToken = useCallback(
    (next: string | null) => {
      storage.write(next)
      setTokenState(next)
      setUnauthorized(false)
    },
    [storage],
  )

  const clearToken = useCallback(() => setToken(null), [setToken])
  const markUnauthorized = useCallback(() => setUnauthorized(true), [])
  const clearUnauthorized = useCallback(() => setUnauthorized(false), [])

  useEffect(() => {
    if (!storage.subscribe) return
    return storage.subscribe((next) => {
      setTokenState(next)
      setUnauthorized(false)
    })
  }, [storage])

  const value = useMemo<AuthContextValue>(
    () => ({ token, unauthorized, setToken, clearToken, markUnauthorized, clearUnauthorized }),
    [token, unauthorized, setToken, clearToken, markUnauthorized, clearUnauthorized],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
