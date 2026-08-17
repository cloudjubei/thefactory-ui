import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  cancelCliAuthLogin,
  checkCliAuthStatus,
  createCliAuthCache,
  deleteCliAuthCache,
  getActiveCliState,
  listCliAgentModels,
  listCliAuthCaches,
  liveCliAgentModels,
  liveCliAgentProbe,
  setActiveCli as apiSetActiveCli,
  setCliDefaultModel as apiSetCliDefaultModel,
  setCliEffort as apiSetCliEffort,
  setCliEnabled as apiSetCliEnabled,
  startCliAuthLogin,
  submitCliAuthLoginInput,
  updateCliAuthCache,
  type CheckCliAuthStatusResponse,
  type CliAuthCacheCreateInput,
  type CliAuthCacheEntry,
  type CliConfigsActiveState,
  type CliReasoningEffort,
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

/** The model catalogue plus the reasoning-effort ladder a CLI accepts, from one probe. */
export type CliProbeResult = { models: ModelInfo[]; efforts: CliReasoningEffort[] }

/** Outcome of a live (account-aware) model fetch — mirrors the backend's discriminated result. */
export type CliLiveModelsResult =
  | { ok: true; durationMs: number; models: ModelInfo[] }
  | { ok: false; durationMs: number; error: string }

export type CliConfigsContextValue = {
  isLoaded: boolean
  loadError: Error | null
  caches: CliAuthCacheEntry[]
  cachesByCli: Record<string, CliAuthCacheEntry[]>
  activeState: CliConfigsActiveState
  activeCli: string | null
  activeCliCredentialId: string | null
  enabledClis: string[]
  /** Per-CLI default model id the user picked in settings (keyed by CLI tool). */
  defaultModel: Record<string, string>
  /** Per-CLI default reasoning effort the user picked in settings (keyed by CLI tool). */
  effort: Record<string, string>
  createCache: (input: CliAuthCacheCreateInput) => Promise<CliAuthCacheEntry>
  updateCache: (id: string, patch: Partial<CliAuthCacheCreateInput>) => Promise<CliAuthCacheEntry>
  deleteCache: (id: string) => Promise<void>
  setActiveCli: (cli: string, credentialId: string) => Promise<void>
  setCliEnabled: (cli: string, enabled: boolean) => Promise<void>
  /** Set (or clear, with `undefined`) the default model for `cli`. */
  setCliDefaultModel: (cli: string, model: string | undefined) => Promise<void>
  /** Set (or clear, with `undefined`) the default reasoning effort for `cli`. */
  setCliEffort: (cli: string, effort: string | undefined) => Promise<void>
  probeModels: (cli: CliTool) => Promise<CliProbeResult>
  /**
   * Fetch the live, account-aware model list (Cursor sandbox / Codex cache).
   * On success the result is cached per `cli:credentialId` and exposed via
   * {@link cachedLiveModels}; failures are returned (not thrown) so the caller
   * can surface a retry while keeping the static list visible.
   */
  probeModelsLive: (cli: CliTool, credentialId: string) => Promise<CliLiveModelsResult>
  /** The last successfully-fetched live model list for `cli:credentialId`, if any. */
  cachedLiveModels: (cli: CliTool, credentialId: string) => ModelInfo[] | undefined
  probeLive: (cli: CliTool, credentialId: string) => Promise<CliLiveProbeResult>
  /**
   * Actively check whether a stored credential is authenticated (the "Check now"
   * action / cursor sandbox probe). Records the result on the credential and
   * refreshes the cache list so the chip + settings reflect it. Returns the status.
   */
  checkAuth: (credentialId: string) => Promise<CheckCliAuthStatusResponse>
  /**
   * Start a CLI login. Pass `credentialId` to RE-AUTHENTICATE that credential in
   * place (same id, so every binding to it keeps working); omit it to create a new
   * credential. Returns the `loginId` to correlate streamed output + the result.
   */
  startAuthLogin: (cli: CliTool, label: string, credentialId?: string) => Promise<string>
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
  // Live model lists keyed by `${cli}:${credentialId}`, populated on a manual
  // refresh and cleared whenever a credential changes (the list is account-aware).
  const [liveModelsCache, setLiveModelsCache] = useState<Record<string, ModelInfo[]>>({})
  // Bumped on every credential mutation so an in-flight live fetch started
  // against the prior credential state can't restore a just-cleared entry.
  const cacheGenerationRef = useRef(0)
  const invalidateLiveModelsCache = useCallback(() => {
    cacheGenerationRef.current += 1
    setLiveModelsCache({})
  }, [])

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
      invalidateLiveModelsCache()
      await refresh()
      return data
    },
    [refresh, invalidateLiveModelsCache],
  )

  const updateCache = useCallback(
    async (id: string, patch: Partial<CliAuthCacheCreateInput>) => {
      const { data } = await updateCliAuthCache({ path: { id }, body: patch, throwOnError: true })
      invalidateLiveModelsCache()
      await refresh()
      return data
    },
    [refresh, invalidateLiveModelsCache],
  )

  const deleteCache = useCallback(
    async (id: string) => {
      await deleteCliAuthCache({ path: { id }, throwOnError: true })
      invalidateLiveModelsCache()
      await refresh()
    },
    [refresh, invalidateLiveModelsCache],
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

  const setCliDefaultModel = useCallback(
    async (cli: string, model: string | undefined) => {
      await apiSetCliDefaultModel({
        body: { cli: cli as CliTool, model: model ?? null },
        throwOnError: true,
      })
      await refresh()
    },
    [refresh],
  )

  const setCliEffort = useCallback(
    async (cli: string, effort: string | undefined) => {
      await apiSetCliEffort({
        body: { cli: cli as CliTool, effort: effort ?? null },
        throwOnError: true,
      })
      await refresh()
    },
    [refresh],
  )

  const probeModels = useCallback(async (cli: CliTool): Promise<CliProbeResult> => {
    const { data } = await listCliAgentModels({ query: { cli }, throwOnError: true })
    return { models: data.models, efforts: data.efforts }
  }, [])

  const probeModelsLive = useCallback(
    async (cli: CliTool, credentialId: string): Promise<CliLiveModelsResult> => {
      const gen = cacheGenerationRef.current
      const { data } = await liveCliAgentModels({ body: { cli, credentialId }, throwOnError: true })
      // Drop the result if a credential mutation invalidated the cache while
      // this fetch was in flight — it was resolved against stale auth state.
      if (data.ok && cacheGenerationRef.current === gen) {
        setLiveModelsCache((prev) => ({ ...prev, [`${cli}:${credentialId}`]: data.models }))
      }
      return data as CliLiveModelsResult
    },
    [],
  )

  const cachedLiveModels = useCallback(
    (cli: CliTool, credentialId: string): ModelInfo[] | undefined => {
      // Never serve an account-aware list for a credential that no longer exists.
      if (!caches.some((c) => c.id === credentialId)) return undefined
      return liveModelsCache[`${cli}:${credentialId}`]
    },
    [liveModelsCache, caches],
  )

  const probeLive = useCallback(async (cli: CliTool, credentialId: string) => {
    const { data } = await liveCliAgentProbe({ body: { cli, credentialId }, throwOnError: true })
    return data as CliLiveProbeResult
  }, [])

  const checkAuth = useCallback(
    async (credentialId: string): Promise<CheckCliAuthStatusResponse> => {
      const { data } = await checkCliAuthStatus({ body: { credentialId }, throwOnError: true })
      // The probe persisted the status on the credential — reload so the chip +
      // settings badge reflect it immediately.
      await refresh()
      return data
    },
    [refresh],
  )

  const startAuthLogin = useCallback(async (cli: CliTool, label: string, credentialId?: string) => {
    const { data } = await startCliAuthLogin({
      body: { cli, label, ...(credentialId ? { credentialId } : {}) },
      throwOnError: true,
    })
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
      defaultModel: activeState.defaultModel ?? {},
      effort: activeState.effort ?? {},
      createCache,
      updateCache,
      deleteCache,
      setActiveCli,
      setCliEnabled,
      setCliDefaultModel,
      setCliEffort,
      probeModels,
      probeModelsLive,
      cachedLiveModels,
      probeLive,
      checkAuth,
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
      setCliDefaultModel,
      setCliEffort,
      probeModels,
      probeModelsLive,
      cachedLiveModels,
      probeLive,
      checkAuth,
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
