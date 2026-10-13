import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { StoryNote, StoryNoteUpdateInput } from 'thefactory-tools/types'
import {
  addStoryNote,
  createFeature,
  createStory,
  deleteFeature,
  deleteStory,
  getStoriesOrder,
  listStories,
  removeStoryNote,
  reorderStories,
  updateFeature,
  updateStory,
  updateStoryNote,
  type Feature,
  type FeatureCreateInput,
  type FeatureEditInput,
  type GetStoryResponse,
  type StoryCreateInput,
  type StoryEditInput,
} from '../api/generated'
import { useApi } from '../api/ApiContext'
import { useProjects } from './ProjectsContext'
import { ForeignStoriesLoader } from '../utils/ForeignStoriesLoader'
import { ProjectResourceCache } from '../utils/projectResourceCache'
import {
  foreignDependency,
  resolveForeignDependency,
  resolveInLookup,
  storyLookup,
  withoutOwnProject,
} from '../utils/storyDependency'
import { FOREIGN_STORIES_TTL_MS } from '../utils/storyDependencyConstants'
import type {
  DependencyResolution,
  ResolvedFeatureRef,
  ResolvedRef,
  ResolvedStoryRef,
} from '../utils/storyDependencyTypes'
import { REVALIDATE_TIMEOUT_MS, acceptOkOr304, readEtagHeader } from '../utils/swrFetch'
import { wsEventConcernsProject } from '../utils/wsEventProject'
import { InflightRequests } from '../utils/inflightRequests'

/** SWR caches keyed by projectId. Module-scope so they survive provider
 *  re-mounts (e.g. StrictMode double-invoke) and let project switches
 *  hydrate immediately from any data we've seen this session. */
const storiesCache = new ProjectResourceCache<GetStoryResponse[]>()
const orderCache = new ProjectResourceCache<string[]>()

/**
 * Another project's stories in list order, revalidated against the same SWR
 * caches the project in view fills — so opening that project later is
 * instant, and a project seen before costs a 304.
 */
async function fetchProjectStories(projectId: string): Promise<GetStoryResponse[]> {
  const storiesEntry = storiesCache.get(projectId)
  const orderEntry = orderCache.get(projectId)
  const [storiesRes, orderRes] = await Promise.all([
    listStories({
      path: { projectId },
      headers: storiesEntry?.etag ? { 'If-None-Match': storiesEntry.etag } : undefined,
      validateStatus: acceptOkOr304,
      throwOnError: true,
    }),
    getStoriesOrder({
      path: { projectId },
      headers: orderEntry?.etag ? { 'If-None-Match': orderEntry.etag } : undefined,
      validateStatus: acceptOkOr304,
      throwOnError: true,
    }),
  ])
  const stories =
    storiesRes.status === 304 && storiesEntry
      ? storiesEntry.data
      : ((storiesRes.data ?? []) as GetStoryResponse[])
  const order =
    orderRes.status === 304 && orderEntry ? orderEntry.data : ((orderRes.data ?? []) as string[])
  if (storiesRes.status !== 304) {
    storiesCache.set(projectId, stories, readEtagHeader(storiesRes.headers))
  }
  if (orderRes.status !== 304) orderCache.set(projectId, order, readEtagHeader(orderRes.headers))
  const rank = new Map(order.map((id, i) => [id, i]))
  return [...stories].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  )
}

const prefetches = new InflightRequests<void>()

/**
 * Read a project's stories into the cache before it is opened — on a pointer
 * resting on its row — so opening it paints at once and only revalidates. A
 * project already held is left to that revalidate; a failed read is dropped.
 */
export function prefetchProjectStories(projectId: string): Promise<void> {
  if (storiesCache.get(projectId) && orderCache.get(projectId)) return Promise.resolve()
  return prefetches.run(projectId, () =>
    fetchProjectStories(projectId).then(
      () => undefined,
      () => undefined,
    ),
  )
}

/** Other projects' stories, for the blockers that name them. Module-scope, like the caches. */
const foreignStories = new ForeignStoriesLoader(fetchProjectStories, FOREIGN_STORIES_TTL_MS)

export type StoriesContextValue = {
  /** True once the first fetch for the active project has completed. */
  isLoaded: boolean
  /** Last fetch error; cleared on the next successful refresh. */
  loadError: Error | null
  /** Stories for the active project in display order (1-based index = position + 1).
   *  Order tracks the backend's `order.json` (watched via WS), with any not-yet-
   *  ordered stories appended at the end. */
  stories: GetStoryResponse[]
  getStory: (storyId: string) => GetStoryResponse | undefined
  getFeature: (storyId: string, featureId: string) => Feature | undefined
  /** Display index (1-based) for a story in the current project, or undefined. */
  storyDisplayIndex: (storyId: string) => number | undefined
  /** Display index (1-based) for a feature within its story, or undefined. */
  featureDisplayIndex: (storyId: string, featureId: string) => number | undefined

  /** Resolve a `"storyId"` / `"storyId.featureId"` / `"3"` / `"3.2"` dep
   *  string against the loaded project, or a `"projectId/storyId[.featureId]"`
   *  one against that project's stories — `LOADING` while they are fetched. */
  resolveDependency: (dependency: string) => DependencyResolution
  /** Normalise a display-index ref (e.g. `"3.2"`) to the canonical
   *  `"uuid.uuid"` form. Pass-through for unresolvable inputs. */
  normalizeDependency: (dependency: string) => string
  /** Resolved blockers of a story (or feature). */
  getBlockers: (storyId: string, featureId?: string) => DependencyResolution[]
  /** Stories/features that depend on the given id ("blocks" relation). */
  getBlockersOutbound: (id: string) => ResolvedRef[]

  createStory: (input: StoryCreateInput) => Promise<GetStoryResponse>
  updateStory: (storyId: string, patch: StoryEditInput) => Promise<GetStoryResponse>
  deleteStory: (storyId: string) => Promise<void>

  createFeature: (storyId: string, input: FeatureCreateInput) => Promise<GetStoryResponse>
  updateFeature: (
    storyId: string,
    featureId: string,
    patch: FeatureEditInput,
  ) => Promise<GetStoryResponse>
  deleteFeature: (storyId: string, featureId: string) => Promise<void>

  /** Attach a note to the story, or to one of its features with `featureId`, as the person. */
  addStoryNote: (
    storyId: string,
    input: { label: string; value: string; featureId?: string },
  ) => Promise<StoryNote>
  /** Change a note on the story or any of its features. */
  updateStoryNote: (
    storyId: string,
    noteId: string,
    patch: StoryNoteUpdateInput,
  ) => Promise<StoryNote>
  /** Remove a note from the story or any of its features. */
  removeStoryNote: (storyId: string, noteId: string) => Promise<void>

  /** Moves the story one slot up or down in the project's display order. No-op at the ends. */
  moveStory: (storyId: string, direction: 'up' | 'down') => Promise<void>
  /** Moves a story to an arbitrary 0-based position. No-op when target == current. */
  reorderStory: (storyId: string, toIndex: number) => Promise<void>

  refresh: () => Promise<void>
}

function isUUID(v: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)
}

const StoriesContext = createContext<StoriesContextValue | null>(null)

export function StoriesProvider({ children }: { children: ReactNode }) {
  const { ws } = useApi()
  const { activeProjectId, projects } = useProjects()

  const [storiesRaw, setStoriesRaw] = useState<GetStoryResponse[]>([])
  const [order, setOrder] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  // `latestProjectIdRef` always reflects the currently rendered project.
  // Used as a second guard alongside the gen counter: a mutation callback
  // (`await refresh()` after a story create / update) captures the OLD
  // `refresh` closure when it was enqueued, so on a mid-flight project
  // switch its later increment can outrank the switch-triggered refresh
  // in gen alone. The projectId capture catches that case unconditionally.
  const latestProjectIdRef = useRef(activeProjectId)
  useEffect(() => {
    latestProjectIdRef.current = activeProjectId
  }, [activeProjectId])

  // Held only so a project switch can abort the previous revalidate — frees
  // the browser's per-origin connection slot and stops a hung response from
  // wedging the next request behind it.
  const abortRef = useRef<AbortController | null>(null)

  const refreshGenRef = useRef(0)
  const refresh = useCallback(async () => {
    const gen = ++refreshGenRef.current
    const reqProjectId = activeProjectId
    if (!reqProjectId) {
      setStoriesRaw([])
      setOrder([])
      setIsLoaded(true)
      setLoadError(null)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), REVALIDATE_TIMEOUT_MS)

    const storiesEntry = storiesCache.get(reqProjectId)
    const orderEntry = orderCache.get(reqProjectId)

    try {
      const [storiesRes, orderRes] = await Promise.all([
        listStories({
          path: { projectId: reqProjectId },
          headers: storiesEntry?.etag ? { 'If-None-Match': storiesEntry.etag } : undefined,
          signal: controller.signal,
          validateStatus: acceptOkOr304,
          throwOnError: true,
        }),
        getStoriesOrder({
          path: { projectId: reqProjectId },
          headers: orderEntry?.etag ? { 'If-None-Match': orderEntry.etag } : undefined,
          signal: controller.signal,
          validateStatus: acceptOkOr304,
          throwOnError: true,
        }),
      ])

      if (gen !== refreshGenRef.current || latestProjectIdRef.current !== reqProjectId) return

      if (storiesRes.status !== 304) {
        const data = (storiesRes.data ?? []) as GetStoryResponse[]
        const etag = readEtagHeader(storiesRes.headers)
        setStoriesRaw(data)
        storiesCache.set(reqProjectId, data, etag)
      }
      if (orderRes.status !== 304) {
        const data = (orderRes.data ?? []) as string[]
        const etag = readEtagHeader(orderRes.headers)
        setOrder(data)
        orderCache.set(reqProjectId, data, etag)
      }
      setLoadError(null)
    } catch (err) {
      // Aborts are expected (supersede or timeout) — leave existing state
      // untouched so the cached data stays visible.
      if (controller.signal.aborted) return
      if (gen !== refreshGenRef.current || latestProjectIdRef.current !== reqProjectId) return
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      clearTimeout(timeoutId)
      if (latestProjectIdRef.current === reqProjectId) setIsLoaded(true)
    }
  }, [activeProjectId])

  // When the active project changes, hydrate from the SWR cache if we have
  // one — that's the entire point of the cache: instant render on a project
  // we've already seen, no spinner. Cache miss falls back to the spinner
  // (`isLoaded = false`) while the revalidate populates state for the first
  // time. Either way, we kick off a revalidate so any drift gets reconciled.
  useEffect(() => {
    setLoadError(null)
    if (!activeProjectId) {
      setStoriesRaw([])
      setOrder([])
      setIsLoaded(true)
      void refresh()
      return
    }
    const cachedStories = storiesCache.get(activeProjectId)
    const cachedOrder = orderCache.get(activeProjectId)
    if (cachedStories && cachedOrder) {
      setStoriesRaw(cachedStories.data)
      setOrder(cachedOrder.data)
      setIsLoaded(true)
    } else {
      setStoriesRaw([])
      setOrder([])
      setIsLoaded(false)
    }
    void refresh()
  }, [activeProjectId, refresh])

  // WS-driven invalidation. `stories:updated` covers both story payload
  // changes (create/update/delete) and reorder events — the backend
  // broadcasts the same channel on every mutation in [stories.ts]. We don't
  // pre-clear the cache: the backend's ETag will have moved, so refresh
  // returns 200 (not 304) and overwrites the stale entry naturally.
  useEffect(
    () =>
      ws.on('stories:updated', (data: unknown) => {
        if (wsEventConcernsProject(data, activeProjectId)) void refresh()
      }),
    [ws, refresh, activeProjectId],
  )

  const [foreignVersion, setForeignVersion] = useState(0)
  useEffect(() => foreignStories.subscribe(() => setForeignVersion((v) => v + 1)), [])
  useEffect(
    () =>
      ws.on('stories:updated', (data: unknown) => {
        const projectId = (data as { projectId?: unknown } | undefined)?.projectId
        if (typeof projectId === 'string') foreignStories.invalidate(projectId)
      }),
    [ws],
  )
  const projectNames = useMemo(
    () => new Map(projects.map((p) => [p.id, p.title || p.id])),
    [projects],
  )

  // Apply `order.json` to the raw story list: ids present in `order` come
  // first (in that order), any stories on disk not yet in `order.json`
  // (orphans / freshly added in another client) get appended at the end.
  // Stale ids in `order` with no matching story are silently dropped.
  const stories = useMemo<GetStoryResponse[]>(() => {
    if (storiesRaw.length === 0) return storiesRaw
    const byId = new Map<string, GetStoryResponse>()
    for (const s of storiesRaw) byId.set(s.id, s)
    const out: GetStoryResponse[] = []
    const seen = new Set<string>()
    for (const id of order) {
      const s = byId.get(id)
      if (!s) continue
      out.push(s)
      seen.add(id)
    }
    for (const s of storiesRaw) {
      if (!seen.has(s.id)) out.push(s)
    }
    return out
  }, [storiesRaw, order])

  const storyIndex = useMemo(() => storyLookup(stories), [stories])

  const getStoryFn = useCallback((storyId: string) => storyIndex.byId.get(storyId), [storyIndex])

  const getFeature = useCallback(
    (storyId: string, featureId: string): Feature | undefined =>
      storyIndex.byId.get(storyId)?.features.find((f) => f.id === featureId),
    [storyIndex],
  )

  const storyDisplayIndex = useCallback(
    (storyId: string) => storyIndex.positions.get(storyId),
    [storyIndex],
  )

  const featureDisplayIndex = useCallback(
    (storyId: string, featureId: string) => {
      const story = storyIndex.byId.get(storyId)
      if (!story) return undefined
      const idx = story.features.findIndex((f) => f.id === featureId)
      return idx === -1 ? undefined : idx + 1
    },
    [storyIndex],
  )

  // display-index → uuid maps (mirrors desktop)
  const storyDisplayToId = useMemo(() => {
    const mapping: Record<string, string> = {}
    stories.forEach((s, i) => {
      mapping[`${i + 1}`] = s.id
    })
    return mapping
  }, [stories])
  const featureDisplayToIdByStory = useMemo(() => {
    const mapping: Record<string, Record<string, string>> = {}
    for (const s of stories) {
      const fmap: Record<string, string> = {}
      s.features.forEach((f, idx) => {
        fmap[`${idx}`] = f.id
        fmap[`${idx + 1}`] = f.id
      })
      mapping[s.id] = fmap
    }
    return mapping
  }, [stories])

  const normalizeDependency = useCallback(
    (raw: string): string => {
      if (foreignDependency(raw, activeProjectId)) return raw
      const dependency = withoutOwnProject(raw, activeProjectId)
      const parts = dependency.split('.')
      if (parts.length === 1) {
        const a = parts[0]
        if (isUUID(a) && storyIndex.byId.has(a)) return a
        return storyDisplayToId[a] || dependency
      }
      const a = parts[0]
      const b = parts.slice(1).join('.')
      const storyId = isUUID(a) ? a : storyDisplayToId[a] || a
      const fmap = featureDisplayToIdByStory[storyId] || {}
      const featureId = isUUID(b) ? b : fmap[b] || b
      return `${storyId}.${featureId}`
    },
    [activeProjectId, storyIndex, storyDisplayToId, featureDisplayToIdByStory],
  )

  const resolveDependency = useCallback(
    (dependency: string): DependencyResolution => {
      if (!activeProjectId) {
        return { id: dependency, code: 'EMPTY', message: "Story wasn't found" }
      }
      const foreign = foreignDependency(dependency, activeProjectId)
      if (foreign) {
        foreignStories.request(foreign.projectId)
        return resolveForeignDependency(
          foreign,
          foreignStories.state(foreign.projectId),
          projectNames.get(foreign.projectId) ?? foreign.projectId,
        )
      }
      const normalized = normalizeDependency(dependency)
      const [storyId = '', featureId] = normalized.split('.')
      return resolveInLookup(storyIndex, storyId, featureId, normalized)
    },
    [activeProjectId, normalizeDependency, storyIndex, projectNames, foreignVersion],
  )

  const getBlockers = useCallback(
    (storyId: string, featureId?: string): DependencyResolution[] => {
      if (featureId) {
        const feature = getFeature(storyId, featureId)
        return feature?.blockers?.map((d) => resolveDependency(d)) ?? []
      }
      return storyIndex.byId.get(storyId)?.blockers?.map((d) => resolveDependency(d)) ?? []
    },
    [storyIndex, getFeature, resolveDependency],
  )

  // Outbound = "X is blocked by ME" — every place where my id (or any of my
  // feature ids) appears in someone else's `blockers`. We index this lazily
  // off `stories` so it stays in sync without per-row scans.
  const outboundIndex = useMemo(() => {
    const map = new Map<string, ResolvedRef[]>()
    const push = (key: string, ref: ResolvedRef) => {
      const arr = map.get(key) ?? []
      arr.push(ref)
      map.set(key, arr)
    }
    for (const s of stories) {
      const collectFrom = (deps: ReadonlyArray<string> | undefined, fromRef: ResolvedRef) => {
        if (!deps || deps.length === 0) return
        for (const dep of deps) {
          const normalized = normalizeDependency(dep)
          push(normalized, fromRef)
          // Also index the bare story id for story-level deps so "what
          // blocks story X" lookups hit even when the dep is a feature ref.
          const head = normalized.split('.')[0]
          if (head && head !== normalized) push(head, fromRef)
        }
      }
      const sIndex = storyDisplayIndex(s.id) ?? 0
      const storyRef: ResolvedStoryRef = {
        kind: 'story',
        id: s.id,
        storyId: s.id,
        story: s,
        display: `${sIndex}`,
      }
      collectFrom(s.blockers, storyRef)
      for (const f of s.features) {
        const fIndex = featureDisplayIndex(s.id, f.id) ?? 0
        const featureRef: ResolvedFeatureRef = {
          kind: 'feature',
          id: `${s.id}.${f.id}`,
          storyId: s.id,
          featureId: f.id,
          story: s,
          feature: f,
          display: `${sIndex}.${fIndex}`,
        }
        collectFrom(f.blockers, featureRef)
      }
    }
    return map
  }, [stories, normalizeDependency, storyDisplayIndex, featureDisplayIndex])

  const getBlockersOutbound = useCallback(
    (id: string): ResolvedRef[] => outboundIndex.get(id) ?? [],
    [outboundIndex],
  )

  const requireProject = useCallback(() => {
    if (!activeProjectId) {
      throw new Error('No active project — cannot perform story mutation')
    }
    return activeProjectId
  }, [activeProjectId])

  const createStoryImpl = useCallback(
    async (input: StoryCreateInput) => {
      const { data } = await createStory({
        path: { projectId: requireProject() },
        body: input,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireProject, refresh],
  )

  const updateStoryImpl = useCallback(
    async (storyId: string, patch: StoryEditInput) => {
      const { data } = await updateStory({
        path: { projectId: requireProject(), storyId },
        body: patch,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireProject, refresh],
  )

  const deleteStoryImpl = useCallback(
    async (storyId: string) => {
      await deleteStory({
        path: { projectId: requireProject(), storyId },
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh],
  )

  const createFeatureImpl = useCallback(
    async (storyId: string, input: FeatureCreateInput) => {
      const { data } = await createFeature({
        path: { projectId: requireProject(), storyId },
        body: input,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireProject, refresh],
  )

  const updateFeatureImpl = useCallback(
    async (storyId: string, featureId: string, patch: FeatureEditInput) => {
      const { data } = await updateFeature({
        path: { projectId: requireProject(), storyId, featureId },
        body: patch,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireProject, refresh],
  )

  const deleteFeatureImpl = useCallback(
    async (storyId: string, featureId: string) => {
      await deleteFeature({
        path: { projectId: requireProject(), storyId, featureId },
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh],
  )

  const addStoryNoteImpl = useCallback(
    async (storyId: string, input: { label: string; value: string; featureId?: string }) => {
      const { data } = await addStoryNote({
        path: { projectId: requireProject(), storyId },
        body: input,
        throwOnError: true,
      })
      await refresh()
      return data as StoryNote
    },
    [requireProject, refresh],
  )

  const updateStoryNoteImpl = useCallback(
    async (storyId: string, noteId: string, patch: StoryNoteUpdateInput) => {
      const { data } = await updateStoryNote({
        path: { projectId: requireProject(), storyId, noteId },
        body: patch,
        throwOnError: true,
      })
      await refresh()
      return data as StoryNote
    },
    [requireProject, refresh],
  )

  const removeStoryNoteImpl = useCallback(
    async (storyId: string, noteId: string) => {
      await removeStoryNote({
        path: { projectId: requireProject(), storyId, noteId },
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh],
  )

  const moveStory = useCallback(
    async (storyId: string, direction: 'up' | 'down') => {
      const id = requireProject()
      const fromIndex = stories.findIndex((s) => s.id === storyId)
      if (fromIndex === -1) return
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
      if (toIndex < 0 || toIndex >= stories.length) return
      await reorderStories({
        path: { projectId: id },
        body: { fromIndex, toIndex },
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh, stories],
  )

  const reorderStory = useCallback(
    async (storyId: string, toIndex: number) => {
      const id = requireProject()
      const fromIndex = stories.findIndex((s) => s.id === storyId)
      if (fromIndex === -1) return
      const clamped = Math.max(0, Math.min(stories.length - 1, toIndex))
      if (clamped === fromIndex) return
      await reorderStories({
        path: { projectId: id },
        body: { fromIndex, toIndex: clamped },
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh, stories],
  )

  const value = useMemo<StoriesContextValue>(
    () => ({
      isLoaded,
      loadError,
      stories,
      getStory: getStoryFn,
      getFeature,
      storyDisplayIndex,
      featureDisplayIndex,
      resolveDependency,
      normalizeDependency,
      getBlockers,
      getBlockersOutbound,
      createStory: createStoryImpl,
      updateStory: updateStoryImpl,
      deleteStory: deleteStoryImpl,
      createFeature: createFeatureImpl,
      updateFeature: updateFeatureImpl,
      deleteFeature: deleteFeatureImpl,
      addStoryNote: addStoryNoteImpl,
      updateStoryNote: updateStoryNoteImpl,
      removeStoryNote: removeStoryNoteImpl,
      moveStory,
      reorderStory,
      refresh,
    }),
    [
      isLoaded,
      loadError,
      stories,
      getStoryFn,
      getFeature,
      storyDisplayIndex,
      featureDisplayIndex,
      resolveDependency,
      normalizeDependency,
      getBlockers,
      getBlockersOutbound,
      createStoryImpl,
      updateStoryImpl,
      deleteStoryImpl,
      createFeatureImpl,
      updateFeatureImpl,
      deleteFeatureImpl,
      addStoryNoteImpl,
      updateStoryNoteImpl,
      removeStoryNoteImpl,
      moveStory,
      reorderStory,
      refresh,
    ],
  )

  return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>
}

export function useStories(): StoriesContextValue {
  const ctx = useContext(StoriesContext)
  if (!ctx) throw new Error('useStories must be used within StoriesProvider')
  return ctx
}
