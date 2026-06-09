import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  cancelCliAuthLogin,
  createCliAuthCache,
  deleteCliAuthCache,
  getActiveCliState,
  listCliAgentModels,
  listCliAuthCaches,
  liveCliAgentProbe,
  setActiveCli as apiSetActiveCli,
  setCliEnabled as apiSetCliEnabled,
  startCliAuthLogin,
  submitCliAuthLoginInput,
  updateCliAuthCache,
  type CliAuthCacheCreateInput,
  type CliAuthCacheEntry,
  type CliConfigsActiveState,
  type CliTool,
  type ModelInfo,
} from '../api/generated'
import { useApi, useAuth } from '../api'
import {
  enabledClis as deriveEnabledClis,
  groupCachesByCli,
  parseCliAuthLoginEvent,
} from '../utils/cliRunner'

export type CliLiveProbeResult =
  | { ok: true; durationMs: number; transcriptHead: string }
  | { ok: false; error: string; durationMs: number }

/** Terminal outcome of an auth-login, keyed by loginId — lets a form leave the streaming pane. */
export type CliAuthLoginResult =
  | { status: 'completed'; credentialId: string }
  | { status: 'error'; error: string }

export type CliConfigsContextValue = {
  isLoaded: boolean
  loadError: Error | null
  caches: CliAuthCacheEntry[]
  cachesByCli: Record<string, CliAuthCacheEntry[]>
  activeState: CliConfigsActiveState
  activeCli: string | null
  activeCliCredentialId: string | null
  enabledClis: string[]
  createCache: (input: CliAuthCacheCreateInput) => Promise<CliAuthCacheEntry>
  updateCache: (id: string, patch: Partial<CliAuthCacheCreateInput>) => Promise<CliAuthCacheEntry>
  deleteCache: (id: string) => Promise<void>
  setActiveCli: (cli: string, credentialId: string) => Promise<void>
  setCliEnabled: (cli: string, enabled: boolean) => Promise<void>
  probeModels: (cli: CliTool) => Promise<ModelInfo[]>
  probeLive: (cli: CliTool, credentialId: string) => Promise<CliLiveProbeResult>
  startAuthLogin: (cli: CliTool, label: string) => Promise<string>
  cancelAuthLogin: (loginId: string) => Promise<void>
  /** Feed a line (e.g. a pasted OAuth code) to a login subprocess's stdin. */
  submitLoginInput: (loginId: string, text: string) => Promise<void>
  /** Accumulated login-subprocess output keyed by loginId (fed by the `cli:auth-login` WS). */
  loginOutput: Record<string, string>
  /** Terminal login outcomes keyed by loginId — present once a login completes or errors. */
  loginResults: Record<string, CliAuthLoginResult>
  refresh: () => Promise<void>
}

const CliConfigsContext = createContext<CliConfigsContextValue | null>(null)

export type CliConfigsProviderProps = {
  children: ReactNode
}

export function CliConfigsProvider({ children }: CliConfigsProviderProps) {
  const { token } = useAuth()
  const { ws } = useApi()
  const [caches, setCaches] = useState<CliAuthCacheEntry[]>([])
  const [activeState, setActiveState] = useState<CliConfigsActiveState>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [loginOutput, setLoginOutput] = useState<Record<string, string>>({})
  const [loginResults, setLoginResults] = useState<Record<string, CliAuthLoginResult>>({})

  const refresh = useCallback(async () => {
    try {
      const [{ data: cacheList }, { data: state }] = await Promise.all([
        listCliAuthCaches({ throwOnError: true }),
        getActiveCliState({ throwOnError: true }),
      ])
      setCaches(cacheList)
      setActiveState(state)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(
    () =>
      ws.on('cli:auth-login', (data) => {
        const parsed = parseCliAuthLoginEvent(data)
        if (!parsed) return
        if (parsed.kind === 'chunk') {
          // The chunk already carries the subprocess's own newlines — append verbatim.
          setLoginOutput((prev) => ({
            ...prev,
            [parsed.loginId]: (prev[parsed.loginId] ?? '') + parsed.text,
          }))
          return
        }
        if (parsed.kind === 'completed') {
          setLoginResults((prev) => ({
            ...prev,
            [parsed.loginId]: { status: 'completed', credentialId: parsed.credentialId },
          }))
          void refresh()
          return
        }
        setLoginOutput((prev) => ({
          ...prev,
          [parsed.loginId]: (prev[parsed.loginId] ?? '') + parsed.error + '\n',
        }))
        setLoginResults((prev) => ({
          ...prev,
          [parsed.loginId]: { status: 'error', error: parsed.error },
        }))
      }),
    [ws, refresh],
  )

  const createCache = useCallback(
    async (input: CliAuthCacheCreateInput) => {
      const { data } = await createCliAuthCache({ body: input, throwOnError: true })
      await refresh()
      return data
    },
    [refresh],
  )

  const updateCache = useCallback(
    async (id: string, patch: Partial<CliAuthCacheCreateInput>) => {
      const { data } = await updateCliAuthCache({ path: { id }, body: patch, throwOnError: true })
      await refresh()
      return data
    },
    [refresh],
  )

  const deleteCache = useCallback(
    async (id: string) => {
      await deleteCliAuthCache({ path: { id }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const setActiveCli = useCallback(
    async (cli: string, credentialId: string) => {
      await apiSetActiveCli({ body: { cli: cli as CliTool, credentialId }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const setCliEnabled = useCallback(
    async (cli: string, enabled: boolean) => {
      await apiSetCliEnabled({ body: { cli: cli as CliTool, enabled }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const probeModels = useCallback(async (cli: CliTool) => {
    const { data } = await listCliAgentModels({ query: { cli }, throwOnError: true })
    return data.models
  }, [])

  const probeLive = useCallback(async (cli: CliTool, credentialId: string) => {
    const { data } = await liveCliAgentProbe({ body: { cli, credentialId }, throwOnError: true })
    return data as CliLiveProbeResult
  }, [])

  const startAuthLogin = useCallback(async (cli: CliTool, label: string) => {
    const { data } = await startCliAuthLogin({ body: { cli, label }, throwOnError: true })
    return data.loginId
  }, [])

  const cancelAuthLogin = useCallback(async (loginId: string) => {
    await cancelCliAuthLogin({ path: { loginId }, throwOnError: true })
  }, [])

  const submitLoginInput = useCallback(async (loginId: string, text: string) => {
    await submitCliAuthLoginInput({ path: { loginId }, body: { text }, throwOnError: true })
  }, [])

  const cachesByCli = useMemo(() => groupCachesByCli(caches), [caches])
  const enabledClis = useMemo(() => deriveEnabledClis(activeState), [activeState])

  const value = useMemo<CliConfigsContextValue>(
    () => ({
      isLoaded,
      loadError,
      caches,
      cachesByCli,
      activeState,
      activeCli: activeState.activeCli ?? null,
      activeCliCredentialId: activeState.activeCliCredentialId ?? null,
      enabledClis,
      createCache,
      updateCache,
      deleteCache,
      setActiveCli,
      setCliEnabled,
      probeModels,
      probeLive,
      startAuthLogin,
      cancelAuthLogin,
      submitLoginInput,
      loginOutput,
      loginResults,
      refresh,
    }),
    [
      isLoaded,
      loadError,
      caches,
      cachesByCli,
      activeState,
      enabledClis,
      createCache,
      updateCache,
      deleteCache,
      setActiveCli,
      setCliEnabled,
      probeModels,
      probeLive,
      startAuthLogin,
      cancelAuthLogin,
      submitLoginInput,
      loginOutput,
      loginResults,
      refresh,
    ],
  )

  return <CliConfigsContext.Provider value={value}>{children}</CliConfigsContext.Provider>
}

export function useCliConfigs(): CliConfigsContextValue {
  const ctx = useContext(CliConfigsContext)
  if (!ctx) throw new Error('useCliConfigs must be used within CliConfigsProvider')
  return ctx
}
