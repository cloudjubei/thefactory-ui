import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createLlmConfig,
  deleteLlmConfig,
  getActiveRunnerKind as apiGetActiveRunnerKind,
  listLlmConfigs,
  setActiveRunnerKind as apiSetActiveRunnerKind,
  updateLlmConfig,
  type CliReasoningEffort,
  type CliTool,
  type GetLlmConfigResponse,
  type LlmConfigCreateInput,
  type LlmConfigEditInput,
} from '../api/generated'
import { useAuth } from '../api/AuthContext'
import type { SyncKVStorage } from '../hooks/useStorageBackedState'

/** CLI-agent selection for background activities — mirrors the `runActivity` `cliModel` body. */
export type ActivityCliModel = {
  /** CLI tool that runs the activity. */
  cli: CliTool
  /** CLI model id; omitted = the CLI default. */
  modelId?: string
  /** Reasoning effort; omitted = the CLI default. */
  effort?: CliReasoningEffort
  /** Stored CLI auth-cache id; omitted = the active login for the CLI. */
  credentialId?: string
}

export type LLMConfigsContextValue = {
  isLoaded: boolean
  loadError: Error | null
  configs: GetLlmConfigResponse[]
  activeChatConfigId: string | null
  activeChatConfig: GetLlmConfigResponse | null
  setActiveChat: (id: string) => void
  recentChatConfigs: GetLlmConfigResponse[]
  activeAgentRunConfigId: string | null
  activeAgentRunConfig: GetLlmConfigResponse | null
  setActiveAgentRun: (id: string) => void
  recentAgentRunConfigs: GetLlmConfigResponse[]
  /**
   * Which runner the Run button (feature/story agents) uses: `'api'` (an LLM
   * config) or `'cli'` (a CLI agent). Per-user-global, backend-persisted via
   * {@link apiGetActiveRunnerKind}. The API + CLI picks are remembered SEPARATELY
   * ({@link activeAgentRunConfig} + {@link activeAgentRunCliModel}); this only
   * records which is active. Defaults to `'api'`.
   */
  activeRunnerKind: 'api' | 'cli'
  /** Switch the Run button between API and CLI — the ONLY thing that flips it (settings never do). */
  setActiveRunnerKind: (kind: 'api' | 'cli') => void
  /** CLI pick for agent runs when {@link activeRunnerKind} is `'cli'`; null = none chosen yet. */
  activeAgentRunCliModel: ActivityCliModel | null
  /** Set (or clear) the agent-run CLI pick; does NOT touch the API config selection. */
  setActiveAgentRunCliModel: (model: ActivityCliModel | null) => void
  /** Recently-used agent-run CLI picks, most-recent first. */
  recentAgentRunCliModels: ActivityCliModel[]
  activeActivityConfigId: string | null
  activeActivityConfig: GetLlmConfigResponse | null
  /** Make `id` the active activity config; clears any activity CLI selection. */
  setActiveActivity: (id: string) => void
  recentActivityConfigs: GetLlmConfigResponse[]
  /** CLI-agent selection for activities; non-null = activities run on the CLI, not the active config. */
  activeActivityCliModel: ActivityCliModel | null
  /** Set (or clear, with `null`) the activity CLI selection; the active config is left untouched. */
  setActiveActivityCliModel: (model: ActivityCliModel | null) => void
  /** Recently-selected activity CLI agent+model picks, most-recent first (max {@link RECENTS_LIMIT}). */
  recentActivityCliModels: ActivityCliModel[]
  createConfig: (input: LlmConfigCreateInput) => Promise<GetLlmConfigResponse>
  updateConfig: (id: string, patch: LlmConfigEditInput) => Promise<GetLlmConfigResponse>
  deleteConfig: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const ACTIVE_CHAT_LS_KEY = 'thefactory-overseer-web:activeChatConfigId'
const ACTIVE_AGENT_RUN_LS_KEY = 'thefactory-overseer-web:activeAgentRunConfigId'
const ACTIVE_ACTIVITY_LS_KEY = 'thefactory-overseer-web:activeActivityConfigId'
const ACTIVE_ACTIVITY_CLI_MODEL_LS_KEY = 'thefactory-overseer-web:activeActivityCliModel'
const RECENT_ACTIVITY_CLI_MODEL_LS_KEY = 'thefactory-overseer-web:recentActivityCliModels'
const ACTIVE_AGENT_RUN_CLI_MODEL_LS_KEY = 'thefactory-overseer-web:activeAgentRunCliModel'
const RECENT_AGENT_RUN_CLI_MODEL_LS_KEY = 'thefactory-overseer-web:recentAgentRunCliModels'
const RECENT_CHAT_LS_KEY = 'thefactory-overseer-web:recentChatConfigIds'
const RECENT_AGENT_RUN_LS_KEY = 'thefactory-overseer-web:recentAgentRunConfigIds'
const RECENT_ACTIVITY_LS_KEY = 'thefactory-overseer-web:recentActivityConfigIds'
const RECENTS_LIMIT = 6

function readRecents(storage: SyncKVStorage, key: string): string[] {
  try {
    const raw = storage.get(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

function writeRecents(storage: SyncKVStorage, key: string, ids: string[]) {
  try {
    storage.set(key, JSON.stringify(ids))
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

function pushRecent(prev: string[], id: string): string[] {
  const next = [id, ...prev.filter((x) => x !== id)]
  return next.slice(0, RECENTS_LIMIT)
}

const CLI_TOOLS: readonly CliTool[] = ['claude-code', 'cursor-agent', 'codex']

function readCliModel(storage: SyncKVStorage, key: string): ActivityCliModel | null {
  try {
    const raw = storage.get(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActivityCliModel | null
    if (!parsed || typeof parsed !== 'object' || typeof parsed.cli !== 'string') return null
    if (!CLI_TOOLS.includes(parsed.cli)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCliModel(storage: SyncKVStorage, key: string, model: ActivityCliModel | null) {
  try {
    storage.set(key, JSON.stringify(model))
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

/** Identity of a CLI pick for recents dedup: a CLI tool + its model (effort/credential are incidental). */
function cliModelKey(model: ActivityCliModel): string {
  return `${model.cli}:${model.modelId ?? ''}`
}

function readRecentCliModels(storage: SyncKVStorage, key: string): ActivityCliModel[] {
  try {
    const raw = storage.get(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is ActivityCliModel =>
        !!m && typeof m === 'object' && typeof m.cli === 'string' && CLI_TOOLS.includes(m.cli),
    )
  } catch {
    return []
  }
}

function writeRecentCliModels(storage: SyncKVStorage, key: string, models: ActivityCliModel[]) {
  try {
    storage.set(key, JSON.stringify(models))
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

function pushRecentCliModel(prev: ActivityCliModel[], model: ActivityCliModel): ActivityCliModel[] {
  const key = cliModelKey(model)
  const next = [model, ...prev.filter((m) => cliModelKey(m) !== key)]
  return next.slice(0, RECENTS_LIMIT)
}

const LLMConfigsContext = createContext<LLMConfigsContextValue | null>(null)

export type LLMConfigsProviderProps = {
  /** Storage adapter (web: localStorage; desktop: safeStorage bridge). */
  storage: SyncKVStorage
  children: ReactNode
}

export function LLMConfigsProvider({ storage, children }: LLMConfigsProviderProps) {
  const { token } = useAuth()
  const [configs, setConfigs] = useState<GetLlmConfigResponse[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [activeChatConfigId, setActiveChatConfigIdState] = useState<string | null>(() =>
    storage.get(ACTIVE_CHAT_LS_KEY),
  )
  const [activeAgentRunConfigId, setActiveAgentRunConfigIdState] = useState<string | null>(() =>
    storage.get(ACTIVE_AGENT_RUN_LS_KEY),
  )
  const [activeActivityConfigId, setActiveActivityConfigIdState] = useState<string | null>(() =>
    storage.get(ACTIVE_ACTIVITY_LS_KEY),
  )
  const [activeActivityCliModel, setActiveActivityCliModelState] =
    useState<ActivityCliModel | null>(() => readCliModel(storage, ACTIVE_ACTIVITY_CLI_MODEL_LS_KEY))
  const [recentActivityCliModels, setRecentActivityCliModels] = useState<ActivityCliModel[]>(() =>
    readRecentCliModels(storage, RECENT_ACTIVITY_CLI_MODEL_LS_KEY),
  )
  // Agent-run (Run button) runner selection. `activeRunnerKind` is backend-
  // persisted (hydrated below); the API config + CLI pick are remembered
  // separately, both client-side, like the activity selection above.
  const [activeRunnerKind, setActiveRunnerKindState] = useState<'api' | 'cli'>('api')
  // Once the user explicitly flips the runner kind, the (async, fire-and-forget)
  // backend hydration below must not clobber their choice if it resolves later.
  const runnerKindTouchedRef = useRef(false)
  const [activeAgentRunCliModel, setActiveAgentRunCliModelState] =
    useState<ActivityCliModel | null>(() =>
      readCliModel(storage, ACTIVE_AGENT_RUN_CLI_MODEL_LS_KEY),
    )
  const [recentAgentRunCliModels, setRecentAgentRunCliModels] = useState<ActivityCliModel[]>(() =>
    readRecentCliModels(storage, RECENT_AGENT_RUN_CLI_MODEL_LS_KEY),
  )
  const [recentChatIds, setRecentChatIds] = useState<string[]>(() =>
    readRecents(storage, RECENT_CHAT_LS_KEY),
  )
  const [recentAgentRunIds, setRecentAgentRunIds] = useState<string[]>(() =>
    readRecents(storage, RECENT_AGENT_RUN_LS_KEY),
  )
  const [recentActivityIds, setRecentActivityIds] = useState<string[]>(() =>
    readRecents(storage, RECENT_ACTIVITY_LS_KEY),
  )

  const setActiveChat = useCallback(
    (id: string) => {
      setActiveChatConfigIdState(id)
      try {
        storage.set(ACTIVE_CHAT_LS_KEY, id)
      } catch {
        // ignore storage errors (private mode, etc.)
      }
      setRecentChatIds((prev) => {
        const next = pushRecent(prev, id)
        writeRecents(storage, RECENT_CHAT_LS_KEY, next)
        return next
      })
    },
    [storage],
  )

  const setActiveAgentRun = useCallback(
    (id: string) => {
      setActiveAgentRunConfigIdState(id)
      try {
        storage.set(ACTIVE_AGENT_RUN_LS_KEY, id)
      } catch {
        // ignore storage errors (private mode, etc.)
      }
      setRecentAgentRunIds((prev) => {
        const next = pushRecent(prev, id)
        writeRecents(storage, RECENT_AGENT_RUN_LS_KEY, next)
        return next
      })
    },
    [storage],
  )

  const setActiveActivity = useCallback(
    (id: string) => {
      setActiveActivityConfigIdState(id)
      try {
        storage.set(ACTIVE_ACTIVITY_LS_KEY, id)
      } catch {
        // ignore storage errors (private mode, etc.)
      }
      setActiveActivityCliModelState(null)
      writeCliModel(storage, ACTIVE_ACTIVITY_CLI_MODEL_LS_KEY, null)
      setRecentActivityIds((prev) => {
        const next = pushRecent(prev, id)
        writeRecents(storage, RECENT_ACTIVITY_LS_KEY, next)
        return next
      })
    },
    [storage],
  )

  const setActiveActivityCliModel = useCallback(
    (model: ActivityCliModel | null) => {
      setActiveActivityCliModelState(model)
      writeCliModel(storage, ACTIVE_ACTIVITY_CLI_MODEL_LS_KEY, model)
      if (model) {
        setRecentActivityCliModels((prev) => {
          const next = pushRecentCliModel(prev, model)
          writeRecentCliModels(storage, RECENT_ACTIVITY_CLI_MODEL_LS_KEY, next)
          return next
        })
      }
    },
    [storage],
  )

  // Flip the Run button between API and CLI — the ONLY place activeRunnerKind
  // changes (optimistic local update + fire-and-forget backend persist).
  // Settings → LLM intentionally never calls this, so changing the API agent
  // there never knocks a CLI-active Run button back to API.
  const setActiveRunnerKind = useCallback((kind: 'api' | 'cli') => {
    runnerKindTouchedRef.current = true
    setActiveRunnerKindState(kind)
    void apiSetActiveRunnerKind({ body: { kind }, throwOnError: false }).catch(() => {})
  }, [])

  const setActiveAgentRunCliModel = useCallback(
    (model: ActivityCliModel | null) => {
      setActiveAgentRunCliModelState(model)
      writeCliModel(storage, ACTIVE_AGENT_RUN_CLI_MODEL_LS_KEY, model)
      if (model) {
        setRecentAgentRunCliModels((prev) => {
          const next = pushRecentCliModel(prev, model)
          writeRecentCliModels(storage, RECENT_AGENT_RUN_CLI_MODEL_LS_KEY, next)
          return next
        })
      }
    },
    [storage],
  )

  const refresh = useCallback(async () => {
    try {
      const { data } = await listLlmConfigs({ throwOnError: true })
      setConfigs(data)
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
    // Hydrate the per-user-global runner kind (api|cli) from the backend;
    // undefined means never chosen → keep the 'api' default.
    void apiGetActiveRunnerKind({ throwOnError: false })
      .then((res) => {
        const kind = res.data?.activeRunnerKind
        // Don't overwrite a choice the user already made while this was in flight.
        if (!runnerKindTouchedRef.current && (kind === 'api' || kind === 'cli')) {
          setActiveRunnerKindState(kind)
        }
      })
      .catch(() => {})
  }, [token, refresh])

  const createConfig = useCallback(
    async (input: LlmConfigCreateInput) => {
      const { data } = await createLlmConfig({ body: input, throwOnError: true })
      await refresh()
      return data
    },
    [refresh],
  )

  const updateConfig = useCallback(
    async (id: string, patch: LlmConfigEditInput) => {
      const { data } = await updateLlmConfig({
        path: { id },
        body: patch,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [refresh],
  )

  const deleteConfig = useCallback(
    async (id: string) => {
      await deleteLlmConfig({ path: { id }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const activeChatConfig =
    (activeChatConfigId && configs.find((c) => c.id === activeChatConfigId)) || null
  const activeAgentRunConfig =
    (activeAgentRunConfigId && configs.find((c) => c.id === activeAgentRunConfigId)) || null
  const activeActivityConfig =
    (activeActivityConfigId && configs.find((c) => c.id === activeActivityConfigId)) || null

  const recentChatConfigs = useMemo<GetLlmConfigResponse[]>(() => {
    const map = new Map(configs.map((c) => [c.id, c] as const))
    const items = recentChatIds
      .map((id) => map.get(id))
      .filter((c): c is GetLlmConfigResponse => Boolean(c))
    const base = items.length > 0 ? items : configs
    return base.slice(0, RECENTS_LIMIT)
  }, [configs, recentChatIds])

  const recentAgentRunConfigs = useMemo<GetLlmConfigResponse[]>(() => {
    const map = new Map(configs.map((c) => [c.id, c] as const))
    const items = recentAgentRunIds
      .map((id) => map.get(id))
      .filter((c): c is GetLlmConfigResponse => Boolean(c))
    const base = items.length > 0 ? items : configs
    return base.slice(0, RECENTS_LIMIT)
  }, [configs, recentAgentRunIds])

  const recentActivityConfigs = useMemo<GetLlmConfigResponse[]>(() => {
    const map = new Map(configs.map((c) => [c.id, c] as const))
    const items = recentActivityIds
      .map((id) => map.get(id))
      .filter((c): c is GetLlmConfigResponse => Boolean(c))
    const base = items.length > 0 ? items : configs
    return base.slice(0, RECENTS_LIMIT)
  }, [configs, recentActivityIds])

  const value = useMemo<LLMConfigsContextValue>(
    () => ({
      isLoaded,
      loadError,
      configs,
      activeChatConfigId,
      activeChatConfig,
      setActiveChat,
      recentChatConfigs,
      activeAgentRunConfigId,
      activeAgentRunConfig,
      setActiveAgentRun,
      recentAgentRunConfigs,
      activeActivityConfigId,
      activeActivityConfig,
      setActiveActivity,
      recentActivityConfigs,
      activeActivityCliModel,
      setActiveActivityCliModel,
      recentActivityCliModels,
      activeRunnerKind,
      setActiveRunnerKind,
      activeAgentRunCliModel,
      setActiveAgentRunCliModel,
      recentAgentRunCliModels,
      createConfig,
      updateConfig,
      deleteConfig,
      refresh,
    }),
    [
      isLoaded,
      loadError,
      configs,
      activeChatConfigId,
      activeChatConfig,
      setActiveChat,
      recentChatConfigs,
      activeAgentRunConfigId,
      activeAgentRunConfig,
      setActiveAgentRun,
      recentAgentRunConfigs,
      activeActivityConfigId,
      activeActivityConfig,
      setActiveActivity,
      recentActivityConfigs,
      activeActivityCliModel,
      setActiveActivityCliModel,
      recentActivityCliModels,
      activeRunnerKind,
      setActiveRunnerKind,
      activeAgentRunCliModel,
      setActiveAgentRunCliModel,
      recentAgentRunCliModels,
      createConfig,
      updateConfig,
      deleteConfig,
      refresh,
    ],
  )

  return <LLMConfigsContext.Provider value={value}>{children}</LLMConfigsContext.Provider>
}

export function useLLMConfigs(): LLMConfigsContextValue {
  const ctx = useContext(LLMConfigsContext)
  if (!ctx) throw new Error('useLLMConfigs must be used within LLMConfigsProvider')
  return ctx
}
