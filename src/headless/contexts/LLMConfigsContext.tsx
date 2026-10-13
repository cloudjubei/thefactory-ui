import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createLlmConfig,
  deleteLlmConfig,
  getActiveRunnerKind as apiGetActiveRunnerKind,
  listLlmConfigs,
  setActiveRunnerKind as apiSetActiveRunnerKind,
  setAgentRunLlmConfig as apiSetAgentRunLlmConfig,
  updateLlmConfig,
  type CliReasoningEffort,
  type CliTool,
  type GetLlmConfigResponse,
  type LlmConfigCreateInput,
  type LlmConfigEditInput,
} from '../api/generated'
import { useApi } from '../api'
import { useAuth } from '../api/AuthContext'
import { AGENT_RUNNER_EVENT, LLM_CONFIGS_EVENT } from '../utils/credentialStoreEventConstants'
import { agentRunnerSelectionUpdate } from '../utils/agentRunnerSelection'
import { activeLlmConfig } from '../utils/modelChip'
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
  /** The config chat turns run on: the one chosen while it exists, else the first ({@link activeLlmConfig}). */
  activeChatConfigId: string | null
  activeChatConfig: GetLlmConfigResponse | null
  setActiveChat: (id: string) => void
  recentChatConfigs: GetLlmConfigResponse[]
  /**
   * The API config agent runs use — the Run button's, a launch card's, every
   * process step's. Backend-persisted and shared by every device: the one
   * chosen while it exists, else the first, exactly as the server resolves it.
   */
  activeAgentRunConfigId: string | null
  activeAgentRunConfig: GetLlmConfigResponse | null
  /** Choose the agent-run API config, here at once and on the server for every run and device. */
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
  const { ws } = useApi()
  const [configs, setConfigs] = useState<GetLlmConfigResponse[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [activeChatConfigId, setActiveChatConfigIdState] = useState<string | null>(() =>
    storage.get(ACTIVE_CHAT_LS_KEY),
  )
  const [activeAgentRunConfigId, setActiveAgentRunConfigIdState] = useState<string | null>(null)
  const [activeActivityConfigId, setActiveActivityConfigIdState] = useState<string | null>(() =>
    storage.get(ACTIVE_ACTIVITY_LS_KEY),
  )
  const [activeActivityCliModel, setActiveActivityCliModelState] =
    useState<ActivityCliModel | null>(() => readCliModel(storage, ACTIVE_ACTIVITY_CLI_MODEL_LS_KEY))
  const [recentActivityCliModels, setRecentActivityCliModels] = useState<ActivityCliModel[]>(() =>
    readRecentCliModels(storage, RECENT_ACTIVITY_CLI_MODEL_LS_KEY),
  )
  // Agent-run selection. The runner kind and the API config are backend-
  // persisted (hydrated below); the CLI pick is client-side, like the activity
  // selection above, and travels with each Run.
  const [activeRunnerKind, setActiveRunnerKindState] = useState<'api' | 'cli'>('api')
  // Count the person's picks, so a backend read that was already out when they
  // picked never overwrites the pick with what the server held before it.
  const runnerKindPicksRef = useRef(0)
  const agentRunConfigPicksRef = useRef(0)
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

  const hydrateAgentRunner = useCallback(async () => {
    const runnerKindPicks = runnerKindPicksRef.current
    const agentRunConfigPicks = agentRunConfigPicksRef.current
    const res = await apiGetActiveRunnerKind({ throwOnError: false }).catch(() => undefined)
    const update = agentRunnerSelectionUpdate(res?.data, {
      runnerKind: runnerKindPicksRef.current !== runnerKindPicks,
      llmConfig: agentRunConfigPicksRef.current !== agentRunConfigPicks,
    })
    if (update.runnerKind) setActiveRunnerKindState(update.runnerKind)
    if (update.llmConfigId !== undefined) setActiveAgentRunConfigIdState(update.llmConfigId)
  }, [])

  const setActiveAgentRun = useCallback(
    (id: string) => {
      agentRunConfigPicksRef.current += 1
      setActiveAgentRunConfigIdState(id)
      setRecentAgentRunIds((prev) => {
        const next = pushRecent(prev, id)
        writeRecents(storage, RECENT_AGENT_RUN_LS_KEY, next)
        return next
      })
      void apiSetAgentRunLlmConfig({ body: { configId: id }, throwOnError: false })
        .then((res) => (res.error ? hydrateAgentRunner() : undefined))
        .catch(() => hydrateAgentRunner())
    },
    [storage, hydrateAgentRunner],
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

  // Flip the Run button between API and CLI — the ONLY place this device
  // changes activeRunnerKind (optimistic local update + backend persist; a
  // refused write re-reads what the server holds). Settings → LLM never calls
  // this, so changing the API agent there never knocks a CLI-active Run button
  // back to API.
  const setActiveRunnerKind = useCallback(
    (kind: 'api' | 'cli') => {
      runnerKindPicksRef.current += 1
      setActiveRunnerKindState(kind)
      void apiSetActiveRunnerKind({ body: { kind }, throwOnError: false })
        .then((res) => (res.error ? hydrateAgentRunner() : undefined))
        .catch(() => hydrateAgentRunner())
    },
    [hydrateAgentRunner],
  )

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
  // Whoever wrote it — another window, an agent's credential form or admin
  // tool — the list refetches, instead of staying the snapshot taken at login.
  useEffect(() => ws.on(LLM_CONFIGS_EVENT, () => void refresh()), [ws, refresh])
  // Another device, or an agent's tool, changed the agent-run choice.
  useEffect(
    () => ws.on(AGENT_RUNNER_EVENT, () => void hydrateAgentRunner()),
    [ws, hydrateAgentRunner],
  )

  useEffect(() => {
    if (!token) return
    void refresh()
    // The server's agent-run choice wins over this device's defaults: a runner
    // never chosen keeps 'api', and the config is the one runs use.
    void hydrateAgentRunner()
  }, [token, refresh, hydrateAgentRunner])

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

  const activeChatConfig = activeLlmConfig(configs, activeChatConfigId)
  const activeAgentRunConfig = activeLlmConfig(configs, activeAgentRunConfigId)
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
      activeChatConfigId: activeChatConfig?.id ?? null,
      activeChatConfig,
      setActiveChat,
      recentChatConfigs,
      activeAgentRunConfigId: activeAgentRunConfig?.id ?? null,
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
      activeChatConfig,
      setActiveChat,
      recentChatConfigs,
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
