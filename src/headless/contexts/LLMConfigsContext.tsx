import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createLlmConfig,
  deleteLlmConfig,
  listLlmConfigs,
  updateLlmConfig,
  type GetLlmConfigResponse,
  type LlmConfigCreateInput,
  type LlmConfigEditInput,
} from '../api/generated'
import { useAuth } from '../api/AuthContext'
import type { SyncKVStorage } from '../hooks/useStorageBackedState'

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
  activeActivityConfigId: string | null
  activeActivityConfig: GetLlmConfigResponse | null
  setActiveActivity: (id: string) => void
  recentActivityConfigs: GetLlmConfigResponse[]
  createConfig: (input: LlmConfigCreateInput) => Promise<GetLlmConfigResponse>
  updateConfig: (id: string, patch: LlmConfigEditInput) => Promise<GetLlmConfigResponse>
  deleteConfig: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const ACTIVE_CHAT_LS_KEY = 'thefactory-overseer-web:activeChatConfigId'
const ACTIVE_AGENT_RUN_LS_KEY = 'thefactory-overseer-web:activeAgentRunConfigId'
const ACTIVE_ACTIVITY_LS_KEY = 'thefactory-overseer-web:activeActivityConfigId'
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
      setRecentActivityIds((prev) => {
        const next = pushRecent(prev, id)
        writeRecents(storage, RECENT_ACTIVITY_LS_KEY, next)
        return next
      })
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
