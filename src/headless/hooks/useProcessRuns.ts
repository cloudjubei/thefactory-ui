import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { ProcessRun, ProcessRunSummary } from 'thefactory-tools/types'
import { listProcessRuns } from '../api'
import { useApi, useAuth } from '../api'
import { LiveResourceStore } from '../utils/liveResourceStore'
import {
  ALL_PROJECTS_PROCESS_RUN_LIST_KEY,
  PROCESS_RUN_LIST_LINGER_MS,
} from '../utils/processViewCacheConstants'
import { splitProcessRunsByCurrent } from '../utils/processRunCurrent'
import { processRunListCache, processRunListKey } from './processViewCache'

/** A `process:run-update` event as it arrives on the socket. */
export type ProcessRunUpdate = {
  runId?: string
  projectId?: string
  run?: ProcessRun
  /** Set when the run (and its tree) was deleted — the list drops it. */
  deleted?: boolean
}

/**
 * Whether a live `process:run-update` belongs in a `useProcessRuns` list.
 *
 * The list is ROOT runs only (the fetch passes `rootOnly`), so the live handler
 * must apply the SAME rule or it drifts from the fetch: a CHILD run (a feature
 * step's own pipeline, `parentRunId` set) leaking in counted one process as two
 * in the nav badge and stacked a drilled-into child beside its parent. A scoped
 * instance also ignores other projects' updates. Pure, so the rule is tested
 * once rather than re-derived per socket event.
 */
export function shouldTrackProcessRunUpdate(
  update: ProcessRunUpdate,
  scopedProjectId?: string,
): update is ProcessRunUpdate & { runId: string; run: ProcessRun } {
  if (!update?.run || !update.runId) return false
  if (scopedProjectId && update.projectId && update.projectId !== scopedProjectId) return false
  if (scopedProjectId && update.run.projectId !== scopedProjectId) return false
  if (update.run.parentRunId) return false
  return true
}

export type UseProcessRuns = {
  isLoaded: boolean
  loadError: Error | null
  /** Every run for the scope, newest first (by `startedAt`), as the list route summarises it. */
  runs: ProcessRunSummary[]
  /** The runs that still need the person or are working (`isProcessRunCurrent`), newest first. */
  current: ProcessRunSummary[]
  /** The runs that are done — landed, let go, or with nothing to bring in — newest first. */
  history: ProcessRunSummary[]
  /** Count of runs actively working (`running`). */
  running: number
  /** Count of runs stopped for the user (`parked`) — a decision is pending. */
  parked: number
  refresh: () => Promise<void>
}

const byStartedDesc = (a: ProcessRunSummary, b: ProcessRunSummary) =>
  (b.startedAt ?? 0) - (a.startedAt ?? 0)

/**
 * A scope's list after one `process:run-update`: a deleted run dropped, a root
 * run of the scope put in (or replaced) newest first. The same list back when
 * the update is not for it, so nothing re-renders.
 */
export function applyProcessRunUpdate(
  prev: ProcessRunSummary[] | undefined,
  update: ProcessRunUpdate,
  scopedProjectId: string | undefined,
): ProcessRunSummary[] | undefined {
  if (update?.deleted && update.runId) {
    if (!prev?.some((r) => r.id === update.runId)) return prev
    return prev.filter((r) => r.id !== update.runId)
  }
  if (!shouldTrackProcessRunUpdate(update, scopedProjectId)) return prev
  const next = (prev ?? []).filter((r) => r.id !== update.runId)
  next.push(update.run)
  return next.sort(byStartedDesc)
}

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, LiveResourceStore<ProcessRunSummary[]>>()

function projectIdOfKey(key: string): string | undefined {
  return key === ALL_PROJECTS_PROCESS_RUN_LIST_KEY ? undefined : key
}

function processRunListStoreFor(ws: WsLike): LiveResourceStore<ProcessRunSummary[]> {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new LiveResourceStore<ProcessRunSummary[]>({
    load: async (key) => {
      const projectId = projectIdOfKey(key)
      const { data } = await listProcessRuns({
        query: { rootOnly: true, ...(projectId ? { projectId } : {}) },
        throwOnError: true,
      })
      return ((data as ProcessRunSummary[] | undefined) ?? []).slice().sort(byStartedDesc)
    },
    connect: (key, live) => {
      const projectId = projectIdOfKey(key)
      const offUpdate = ws.on('process:run-update', (data: unknown) =>
        live.patch((prev) => applyProcessRunUpdate(prev, data as ProcessRunUpdate, projectId)),
      )
      const offReconnect = ws.onReconnect(() => void live.refresh())
      return () => {
        offUpdate()
        offReconnect()
      }
    },
    lingerMs: PROCESS_RUN_LIST_LINGER_MS,
    recall: (key) => processRunListCache.get(key),
    remember: (key, runs) => processRunListCache.set(key, runs),
  })
  stores.set(ws, store)
  return store
}

/**
 * Every process run for a scope, kept live.
 *
 * The list route has no `status` filter, so Current/History is split HERE by
 * `splitProcessRunsByCurrent` — one fetch, both lists. The list route sends
 * summaries (`ProcessRunSummary`: what rows and badges read, without what only
 * a run's own view opens). Liveness is the same `process:run-update` event the
 * single-run hook uses: it carries the record, so a step change upserts in
 * place rather than re-fetching (which would flicker the list). A run
 * that changes status stays in the list and simply moves between `current` and
 * `history`, so a run finishing is visible rather than vanishing.
 *
 * Pass a `projectId` to scope to one project (the Processes tab); omit it for
 * every project the user can see (the nav badge, which sums across projects).
 * `rootOnly` keeps it to the runs a chat launched — a child run drilled into is
 * reached through its parent, never double-counted here.
 *
 * Every view showing a scope shares ONE read and ONE live subscription — the
 * sidebar, the chat list and an open chat no longer each pull the whole list.
 * What was last read outlives the view (`processRunListCache`): a return paints
 * that list at once, and a scope left only briefly is still live, so it is not
 * read again.
 */
export function useProcessRuns(projectId?: string): UseProcessRuns {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = processRunListStoreFor(ws)
  const key = processRunListKey(projectId)

  useEffect(() => {
    if (!token) return
    return store.retain(key)
  }, [store, key, token])

  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => store.listen(key, listener), [store, key]),
    () => store.snapshot(key),
    () => store.snapshot(key),
  )
  const refresh = useCallback(() => store.refresh(key), [store, key])
  const runs = useMemo(() => snapshot.data ?? [], [snapshot.data])

  return useMemo<UseProcessRuns>(() => {
    const { current, history } = splitProcessRunsByCurrent(runs)
    return {
      isLoaded: snapshot.settled,
      loadError: snapshot.error,
      runs,
      current,
      history,
      running: runs.filter((r) => r.status === 'running').length,
      parked: runs.filter((r) => r.status === 'parked').length,
      refresh,
    }
  }, [snapshot.settled, snapshot.error, runs, refresh])
}
