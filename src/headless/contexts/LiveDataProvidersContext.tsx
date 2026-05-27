import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createLiveDataProvider,
  deleteLiveDataProvider,
  fetchLiveDataProvider,
  getLiveDataPayload,
  listLiveDataProviders,
  updateLiveDataProvider,
} from '../api'
import type {
  LiveDataPayload,
  LiveDataProvider,
  LiveDataProviderCreateInput,
  LiveDataProviderEditInput,
  LiveDataUpdatedEvent,
} from '../api'
import { useApi } from '../api/ApiContext'
import { useActiveProject } from './ProjectsContext'
import { ProjectResourceCache } from '../utils/projectResourceCache'
import { REVALIDATE_TIMEOUT_MS, acceptOkOr304, readEtagHeader } from '../utils/swrFetch'

/** SWR cache keyed by projectId — instant render on switch back. */
const liveDataCache = new ProjectResourceCache<LiveDataProvider[]>(16)

export type LiveDataProvidersContextValue = {
  isLoaded: boolean
  loadError: Error | null
  /** Project-scoped + globals visible from the active project. */
  providers: LiveDataProvider[]
  createProvider: (input: LiveDataProviderCreateInput) => Promise<LiveDataProvider>
  updateProvider: (id: string, patch: LiveDataProviderEditInput) => Promise<LiveDataProvider>
  deleteProvider: (id: string) => Promise<void>
  /** Kicks a refresh; resolves with the freshly-fetched payload. */
  fetchProvider: (id: string) => Promise<LiveDataPayload>
  /** Reads the last cached payload for `id`; resolves to `null` on 404. */
  getProviderPayload: (id: string) => Promise<LiveDataPayload | null>
  refresh: () => Promise<void>
}

const LiveDataProvidersContext = createContext<LiveDataProvidersContextValue | null>(null)

const EMPTY: LiveDataProvider[] = []

function isLiveDataUpdatedEvent(v: unknown): v is LiveDataUpdatedEvent {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Partial<LiveDataUpdatedEvent>
  return typeof e.providerId === 'string' && typeof e.status === 'string'
}

export function LiveDataProvidersProvider({ children }: { children: ReactNode }) {
  const { ws } = useApi()
  const { projectId } = useActiveProject()

  const [providers, setProviders] = useState<LiveDataProvider[]>(EMPTY)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  // AbortController per refresh — project switch / StrictMode double-invoke
  // aborts the previous request so it can't hold a slot or land stale.
  const abortRef = useRef<AbortController | null>(null)
  const refreshGenRef = useRef(0)
  const refresh = useCallback(async () => {
    const gen = ++refreshGenRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), REVALIDATE_TIMEOUT_MS)
    const reqProjectId = projectId
    if (!reqProjectId) {
      if (gen !== refreshGenRef.current) return
      setProviders(EMPTY)
      setIsLoaded(true)
      setLoadError(null)
      clearTimeout(timeoutId)
      return
    }
    const cached = liveDataCache.get(reqProjectId)
    try {
      const res = await listLiveDataProviders({
        query: { projectId: reqProjectId },
        headers: cached?.etag ? { 'If-None-Match': cached.etag } : undefined,
        signal: controller.signal,
        validateStatus: acceptOkOr304,
        throwOnError: true,
      })
      if (gen !== refreshGenRef.current || controller.signal.aborted) return
      if (res.status !== 304) {
        const data = (res.data ?? []) as LiveDataProvider[]
        const etag = readEtagHeader(res.headers)
        setProviders(data)
        liveDataCache.set(reqProjectId, data, etag)
      }
      setLoadError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      if (gen !== refreshGenRef.current) return
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      clearTimeout(timeoutId)
      if (gen === refreshGenRef.current && !controller.signal.aborted) {
        setIsLoaded(true)
      }
    }
  }, [projectId])

  useEffect(() => {
    setLoadError(null)
    if (!projectId) {
      setProviders(EMPTY)
      setIsLoaded(true)
    } else {
      const cached = liveDataCache.get(projectId)
      if (cached) {
        setProviders(cached.data)
        setIsLoaded(true)
      } else {
        setProviders(EMPTY)
        setIsLoaded(false)
      }
    }
    void refresh()
    return () => abortRef.current?.abort()
  }, [projectId, refresh])

  // Apply incremental status updates so a long-running fetch flips the row's
  // `isUpdating` flag in real time. The terminal `fresh` / `error` status
  // also triggers a list reload to pick up `lastUpdated` and any payload
  // metadata the server bumped.
  useEffect(
    () =>
      ws.on('liveData:updated', (raw) => {
        if (!isLiveDataUpdatedEvent(raw)) return
        setProviders((current) =>
          current.map((p) =>
            p.id === raw.providerId ? { ...p, isUpdating: raw.status === 'fetching' } : p,
          ),
        )
        if (raw.status !== 'fetching') void refresh()
      }),
    [ws, refresh],
  )

  const createProviderImpl = useCallback<LiveDataProvidersContextValue['createProvider']>(
    async (input) => {
      const { data } = await createLiveDataProvider({ body: input, throwOnError: true })
      await refresh()
      return data
    },
    [refresh],
  )

  const updateProviderImpl = useCallback<LiveDataProvidersContextValue['updateProvider']>(
    async (id, patch) => {
      const { data } = await updateLiveDataProvider({
        path: { id },
        body: patch,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [refresh],
  )

  const deleteProviderImpl = useCallback<LiveDataProvidersContextValue['deleteProvider']>(
    async (id) => {
      await deleteLiveDataProvider({ path: { id }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const fetchProviderImpl = useCallback<LiveDataProvidersContextValue['fetchProvider']>(
    async (id) => {
      // Optimistic flag flip so the row shows "Updating…" without waiting on
      // the WS round-trip. The terminal broadcast clears it via `refresh()`.
      setProviders((current) => current.map((p) => (p.id === id ? { ...p, isUpdating: true } : p)))
      const { data } = await fetchLiveDataProvider({ path: { id }, throwOnError: true })
      return data
    },
    [],
  )

  const getProviderPayloadImpl = useCallback<LiveDataProvidersContextValue['getProviderPayload']>(
    async (id) => {
      const res = await getLiveDataPayload({ path: { id } })
      if (res.error) return null
      return res.data ?? null
    },
    [],
  )

  const value = useMemo<LiveDataProvidersContextValue>(
    () => ({
      isLoaded,
      loadError,
      providers,
      createProvider: createProviderImpl,
      updateProvider: updateProviderImpl,
      deleteProvider: deleteProviderImpl,
      fetchProvider: fetchProviderImpl,
      getProviderPayload: getProviderPayloadImpl,
      refresh,
    }),
    [
      isLoaded,
      loadError,
      providers,
      createProviderImpl,
      updateProviderImpl,
      deleteProviderImpl,
      fetchProviderImpl,
      getProviderPayloadImpl,
      refresh,
    ],
  )

  return (
    <LiveDataProvidersContext.Provider value={value}>{children}</LiveDataProvidersContext.Provider>
  )
}

export function useLiveDataProviders(): LiveDataProvidersContextValue {
  const ctx = useContext(LiveDataProvidersContext)
  if (!ctx) throw new Error('useLiveDataProviders must be used within LiveDataProvidersProvider')
  return ctx
}
