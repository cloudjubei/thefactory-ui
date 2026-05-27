import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createEntity,
  deleteEntities,
  deleteEntity,
  listEntities,
  updateEntity,
  type Entity,
  type EntityInput,
  type EntityPatch,
} from '../api/generated'
import { useApi } from '../api/ApiContext'
import { useActiveProject } from './ProjectsContext'
import { ProjectResourceCache } from '../utils/projectResourceCache'
import { REVALIDATE_TIMEOUT_MS, acceptOkOr304, readEtagHeader } from '../utils/swrFetch'

/** SWR cache keyed by projectId. Module-scope so it survives provider
 *  re-mounts and lets switching back to a previously-seen project render
 *  instantly (no spinner). */
const entitiesCache = new ProjectResourceCache<Entity[]>(16)

export type EntitiesContextValue = {
  isLoaded: boolean
  loadError: Error | null
  entities: Entity[]
  createEntity: (input: Omit<EntityInput, 'projectId'>) => Promise<Entity>
  updateEntity: (id: string, patch: EntityPatch) => Promise<Entity>
  deleteEntity: (id: string) => Promise<void>
  /**
   * Drops entities belonging to the active project. Pass `types` to scope the
   * delete to one or more types; otherwise every entity in the project is
   * removed.
   */
  clearProjectEntities: (opts?: { types?: string[] }) => Promise<void>
  refresh: () => Promise<void>
}

const EntitiesContext = createContext<EntitiesContextValue | null>(null)

const EMPTY_ENTITIES: Entity[] = []

export function EntitiesProvider({ children }: { children: ReactNode }) {
  const { ws } = useApi()
  const { projectId } = useActiveProject()

  const [entities, setEntities] = useState<Entity[]>(EMPTY_ENTITIES)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  // AbortController per refresh: project switch (or StrictMode's double-
  // invoke of the load effect) aborts the previous request. Without this
  // every project switch leaks an in-flight slow query, eating browser
  // connection slots and the backend pg pool.
  const abortRef = useRef<AbortController | null>(null)
  // Generation counter — second guard against stale responses landing in
  // state after the controller's abort hasn't propagated yet.
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
      setEntities(EMPTY_ENTITIES)
      setIsLoaded(true)
      setLoadError(null)
      clearTimeout(timeoutId)
      return
    }
    const cached = entitiesCache.get(reqProjectId)
    try {
      const res = await listEntities({
        query: { projectIds: reqProjectId },
        headers: cached?.etag ? { 'If-None-Match': cached.etag } : undefined,
        signal: controller.signal,
        validateStatus: acceptOkOr304,
        throwOnError: true,
      })
      if (gen !== refreshGenRef.current || controller.signal.aborted) return
      if (res.status !== 304) {
        const data = (res.data ?? []) as Entity[]
        const etag = readEtagHeader(res.headers)
        setEntities(data)
        entitiesCache.set(reqProjectId, data, etag)
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

  // On project switch, hydrate from cache if we have one (no spinner) and
  // kick off a revalidate in the background. Cache miss falls back to the
  // spinner until the first 200.
  useEffect(() => {
    setLoadError(null)
    if (!projectId) {
      setEntities(EMPTY_ENTITIES)
      setIsLoaded(true)
      void refresh()
      return
    }
    const cached = entitiesCache.get(projectId)
    if (cached) {
      setEntities(cached.data)
      setIsLoaded(true)
    } else {
      setEntities(EMPTY_ENTITIES)
      setIsLoaded(false)
    }
    void refresh()
    return () => abortRef.current?.abort()
  }, [projectId, refresh])

  useEffect(() => ws.on('entities:updated', () => void refresh()), [ws, refresh])

  const requireProject = useCallback(() => {
    if (!projectId) throw new Error('No active project — cannot mutate entities')
    return projectId
  }, [projectId])

  const createEntityImpl = useCallback(
    async (input: Omit<EntityInput, 'projectId'>) => {
      const { data } = await createEntity({
        body: { ...input, projectId: requireProject() },
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireProject, refresh],
  )

  const updateEntityImpl = useCallback(
    async (id: string, patch: EntityPatch) => {
      const { data } = await updateEntity({
        path: { id },
        body: patch,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [refresh],
  )

  const deleteEntityImpl = useCallback(
    async (id: string) => {
      await deleteEntity({ path: { id }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const clearProjectEntities = useCallback(
    async (opts?: { types?: string[] }) => {
      const types = opts?.types?.filter((t) => t.trim().length > 0)
      await deleteEntities({
        query: {
          projectIds: requireProject(),
          ...(types && types.length > 0 ? { types: types.join(',') } : {}),
        },
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh],
  )

  const value = useMemo<EntitiesContextValue>(
    () => ({
      isLoaded,
      loadError,
      entities,
      createEntity: createEntityImpl,
      updateEntity: updateEntityImpl,
      deleteEntity: deleteEntityImpl,
      clearProjectEntities,
      refresh,
    }),
    [
      isLoaded,
      loadError,
      entities,
      createEntityImpl,
      updateEntityImpl,
      deleteEntityImpl,
      clearProjectEntities,
      refresh,
    ],
  )

  return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>
}

export function useEntities(): EntitiesContextValue {
  const ctx = useContext(EntitiesContext)
  if (!ctx) throw new Error('useEntities must be used within EntitiesProvider')
  return ctx
}
