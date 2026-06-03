import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  listDataSources,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  refreshDataSource,
  listProjectDataSubscriptions,
  subscribeProjectDataSource,
  unsubscribeProjectDataSource,
  listSourceRecords,
  type DataSource,
  type DataSourceInput,
  type DataSourcePatch,
  type DataSubscription,
  type DataRecord,
  type RefreshResult,
} from '../api/generated'
import { useApi } from '../api/ApiContext'
import { useActiveProject } from './ProjectsContext'
import type { LiveDataUpdatedEvent } from '../api/sdkTypes'

export type DataSourcesContextValue = {
  isLoaded: boolean
  loadError: Error | null
  /** The global catalogue of data sources. */
  sources: DataSource[]
  /** The active project's subscriptions. */
  subscriptions: DataSubscription[]
  /** Subscribed source ids for the active project, for quick membership checks. */
  subscribedSourceIds: Set<string>
  /** sourceId → true while a refresh is in flight (driven by the `liveData:updated` WS event). */
  refreshing: Record<string, boolean>
  createSource: (input: DataSourceInput) => Promise<DataSource>
  updateSource: (id: string, patch: DataSourcePatch) => Promise<DataSource>
  deleteSource: (id: string) => Promise<void>
  refreshSource: (id: string) => Promise<RefreshResult>
  subscribe: (sourceId: string) => Promise<DataSubscription>
  unsubscribe: (sourceId: string) => Promise<void>
  /** Peek a source's current records directly (Overseer-native, bearer). */
  readSourceRecords: (sourceId: string) => Promise<DataRecord[]>
  refresh: () => Promise<void>
}

const DataSourcesContext = createContext<DataSourcesContextValue | null>(null)
const EMPTY_SOURCES: DataSource[] = []
const EMPTY_SUBS: DataSubscription[] = []

export function DataSourcesProvider({ children }: { children: ReactNode }) {
  const { ws } = useApi()
  const { projectId } = useActiveProject()

  const [sources, setSources] = useState<DataSource[]>(EMPTY_SOURCES)
  const [subscriptions, setSubscriptions] = useState<DataSubscription[]>(EMPTY_SUBS)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})

  const refreshSources = useCallback(async () => {
    const res = await listDataSources({ throwOnError: true })
    setSources((res.data ?? EMPTY_SOURCES) as DataSource[])
  }, [])

  // Tracks the live active project so a subscriptions response from a project
  // the user already switched away from can't clobber the current one.
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  const refreshSubscriptions = useCallback(async () => {
    const reqProjectId = projectId
    if (!reqProjectId) {
      setSubscriptions(EMPTY_SUBS)
      return
    }
    const res = await listProjectDataSubscriptions({
      path: { projectId: reqProjectId },
      throwOnError: true,
    })
    if (projectIdRef.current !== reqProjectId) return
    setSubscriptions((res.data ?? EMPTY_SUBS) as DataSubscription[])
  }, [projectId])

  const refresh = useCallback(async () => {
    try {
      await Promise.all([refreshSources(), refreshSubscriptions()])
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [refreshSources, refreshSubscriptions])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    return ws.on<LiveDataUpdatedEvent>('liveData:updated', (e) => {
      if (!e || typeof e.sourceId !== 'string') return
      setRefreshing((r) => ({ ...r, [e.sourceId]: e.status === 'fetching' }))
      if (e.status !== 'fetching') void refreshSources()
    })
  }, [ws, refreshSources])

  const createSource = useCallback(
    async (input: DataSourceInput) => {
      const res = await createDataSource({ body: input, throwOnError: true })
      await refreshSources()
      return res.data as DataSource
    },
    [refreshSources],
  )

  const updateSource = useCallback(
    async (id: string, patch: DataSourcePatch) => {
      const res = await updateDataSource({ path: { id }, body: patch, throwOnError: true })
      await refreshSources()
      return res.data as DataSource
    },
    [refreshSources],
  )

  const deleteSource = useCallback(
    async (id: string) => {
      await deleteDataSource({ path: { id }, throwOnError: true })
      await refreshSources()
    },
    [refreshSources],
  )

  const refreshSource = useCallback(async (id: string) => {
    // Optimistic; the WS `fetching`/`fresh` events keep this in sync while the
    // server works. `finally` is the safety net so the flag can't dangle if a
    // terminal WS event is missed (disconnect) or the request fails outright.
    setRefreshing((r) => ({ ...r, [id]: true }))
    try {
      const res = await refreshDataSource({ path: { id }, throwOnError: true })
      return res.data as RefreshResult
    } finally {
      setRefreshing((r) => {
        const next = { ...r }
        delete next[id]
        return next
      })
    }
  }, [])

  const subscribe = useCallback(
    async (sourceId: string) => {
      if (!projectId) throw new Error('useDataSources: no active project')
      const res = await subscribeProjectDataSource({
        path: { projectId, sourceId },
        throwOnError: true,
      })
      await refreshSubscriptions()
      return res.data as DataSubscription
    },
    [projectId, refreshSubscriptions],
  )

  const unsubscribe = useCallback(
    async (sourceId: string) => {
      if (!projectId) throw new Error('useDataSources: no active project')
      await unsubscribeProjectDataSource({ path: { projectId, sourceId }, throwOnError: true })
      await refreshSubscriptions()
    },
    [projectId, refreshSubscriptions],
  )

  const readSourceRecords = useCallback(async (sourceId: string) => {
    const res = await listSourceRecords({ path: { id: sourceId }, throwOnError: true })
    return (res.data ?? []) as DataRecord[]
  }, [])

  const subscribedSourceIds = useMemo(
    () => new Set(subscriptions.map((s) => s.sourceId)),
    [subscriptions],
  )

  const value = useMemo<DataSourcesContextValue>(
    () => ({
      isLoaded,
      loadError,
      sources,
      subscriptions,
      subscribedSourceIds,
      refreshing,
      createSource,
      updateSource,
      deleteSource,
      refreshSource,
      subscribe,
      unsubscribe,
      readSourceRecords,
      refresh,
    }),
    [
      isLoaded,
      loadError,
      sources,
      subscriptions,
      subscribedSourceIds,
      refreshing,
      createSource,
      updateSource,
      deleteSource,
      refreshSource,
      subscribe,
      unsubscribe,
      readSourceRecords,
      refresh,
    ],
  )

  return <DataSourcesContext.Provider value={value}>{children}</DataSourcesContext.Provider>
}

export function useDataSources(): DataSourcesContextValue {
  const ctx = useContext(DataSourcesContext)
  if (!ctx) throw new Error('useDataSources must be used within DataSourcesProvider')
  return ctx
}
