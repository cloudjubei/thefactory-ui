import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { ProcessRun, ProcessRunSummary } from 'thefactory-tools/types'
import { listProcessRuns } from '../api'
import { useApi, useAuth } from '../api'
import { LiveResourceStore } from '../utils/liveResourceStore'
import { PROCESS_RUN_LIST_LINGER_MS } from '../utils/processViewCacheConstants'
import { splitProcessRunsByCurrent } from '../utils/processRunCurrent'
import { compareRunsNewestFirst } from '../utils/processRunOrder'
import {
  processRunListCacheKey,
  processRunListMatchesNothing,
  processRunListQuery,
  processRunListRequestFromArg,
  processRunListRequestFromKey,
  processRunUpdateAction,
  type ProcessRunListRequest,
} from '../utils/processRunListQuery'
import { processRunListCache } from './processViewCache'

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
 * instance also ignores other projects' updates, and a story or status filter
 * ignores a run that does not match it. An ending filter is not decided here —
 * that list re-reads. Pure, so the rule is tested once rather than re-derived
 * per socket event.
 */
export function shouldTrackProcessRunUpdate(
  update: ProcessRunUpdate,
  scopedProjectId?: string | ProcessRunListRequest,
): update is ProcessRunUpdate & { runId: string; run: ProcessRun } {
  const request = processRunListRequestFromArg(scopedProjectId)
  return processRunUpdateAction(update, request, false) === 'upsert'
}

export type UseProcessRuns = {
  isLoaded: boolean
  loadError: Error | null
  /** Every run for the scope, newest first (`compareRunsNewestFirst`: one not started yet first), as the list route summarises it. */
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

/**
 * A scope's list after one `process:run-update`: a deleted run dropped, a root
 * run of the scope put in (or replaced) newest first, a run that left a story
 * or status filter taken out. The same list back when the update is not for
 * it — including one an ending filter must re-read rather than guess — so
 * nothing re-renders.
 */
export function applyProcessRunUpdate(
  prev: ProcessRunSummary[] | undefined,
  update: ProcessRunUpdate,
  scopedProjectId: string | ProcessRunListRequest | undefined,
): ProcessRunSummary[] | undefined {
  const request = processRunListRequestFromArg(scopedProjectId)
  const held = Boolean(update.runId && prev?.some((run) => run.id === update.runId))
  const action = processRunUpdateAction(update, request, held)
  if (action === 'drop') return prev?.filter((run) => run.id !== update.runId)
  if (action !== 'upsert' || !update.run) return prev
  const next = (prev ?? []).filter((run) => run.id !== update.runId)
  next.push(update.run)
  return next.sort(compareRunsNewestFirst)
}

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, LiveResourceStore<ProcessRunSummary[]>>()

function processRunListStoreFor(ws: WsLike): LiveResourceStore<ProcessRunSummary[]> {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new LiveResourceStore<ProcessRunSummary[]>({
    load: async (key) => {
      const query = processRunListQuery(processRunListRequestFromKey(key))
      if (processRunListMatchesNothing(query)) return []
      const { data } = await listProcessRuns({ query, throwOnError: true })
      return ((data as ProcessRunSummary[] | undefined) ?? []).slice().sort(compareRunsNewestFirst)
    },
    connect: (key, live) => {
      const request = processRunListRequestFromKey(key)
      const offUpdate = ws.on('process:run-update', (data: unknown) => {
        const update = data as ProcessRunUpdate
        live.patch((prev) => {
          const held = Boolean(update.runId && prev?.some((run) => run.id === update.runId))
          if (processRunUpdateAction(update, request, held) === 'reread') void live.refresh()
          return applyProcessRunUpdate(prev, update, request)
        })
      })
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
 * Pass a project id for that project's runs. Pass nothing for every project
 * the person can see (the nav badge, the chat list). Pass a
 * {@link ProcessRunListRequest} to read a group's projects together, and to
 * narrow by story, status or ending — the list route applies them.
 *
 * Current and History are still split here (`splitProcessRunsByCurrent`): a
 * status is not that split. The list route sends summaries (`ProcessRunSummary`).
 * Liveness is the same `process:run-update` event the single-run hook uses: it
 * carries the record, so a step change upserts in place rather than
 * re-fetching (which would flicker the list). A list narrowed by an ending
 * re-reads instead, because whether a run was abandoned or left unmerged is
 * the route's decision. A run that changes status stays in an unfiltered list
 * and simply moves between `current` and `history`.
 *
 * `rootOnly` keeps it to the runs a chat launched — a child run drilled into is
 * reached through its parent, never double-counted here.
 *
 * Every view showing one scope and filter shares ONE read and ONE live
 * subscription. What was last read outlives the view (`processRunListCache`).
 */
export function useProcessRuns(
  projectIdOrRequest?: string | ProcessRunListRequest,
): UseProcessRuns {
  const request = processRunListRequestFromArg(projectIdOrRequest)
  const { token } = useAuth()
  const { ws } = useApi()
  const store = processRunListStoreFor(ws)
  const key = processRunListCacheKey(request)

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
      running: runs.filter((run) => run.status === 'running').length,
      parked: runs.filter((run) => run.status === 'parked').length,
      refresh,
    }
  }, [snapshot.settled, snapshot.error, runs, refresh])
}
