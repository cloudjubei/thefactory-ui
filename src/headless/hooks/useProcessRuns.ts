import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import { listProcessRuns } from '../api'
import { useApi, useAuth } from '../api'
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
  /** Every run for the scope, newest first (by `startedAt`). */
  runs: ProcessRun[]
  /** The runs that still need the person or are working (`isProcessRunCurrent`), newest first. */
  current: ProcessRun[]
  /** The runs that are done — landed, let go, or with nothing to bring in — newest first. */
  history: ProcessRun[]
  /** Count of runs actively working (`running`). */
  running: number
  /** Count of runs stopped for the user (`parked`) — a decision is pending. */
  parked: number
  refresh: () => Promise<void>
}

const byStartedDesc = (a: ProcessRun, b: ProcessRun) => (b.startedAt ?? 0) - (a.startedAt ?? 0)

/** One scope's list as this instance holds it — `runs` undefined until a read or the cache has it. */
type ScopedRuns = { key: string; runs: ProcessRun[] | undefined; settled: boolean }

function cachedScope(key: string): ScopedRuns {
  const runs = processRunListCache.get(key)
  return { key, runs, settled: runs !== undefined }
}

/**
 * Every process run for a scope, kept live.
 *
 * The list route has no `status` filter, so Current/History is split HERE by
 * `splitProcessRunsByCurrent` — one fetch, both lists. Liveness is the same `process:run-update`
 * event the single-run hook uses: it carries the whole record, so a step change
 * upserts in place rather than re-fetching (which would flicker the list). A run
 * that changes status stays in the list and simply moves between `current` and
 * `history`, so a run finishing is visible rather than vanishing.
 *
 * Pass a `projectId` to scope to one project (the Processes tab); omit it for
 * every project the user can see (the nav badge, which sums across projects).
 * `rootOnly` keeps it to the runs a chat launched — a child run drilled into is
 * reached through its parent, never double-counted here.
 *
 * What it last read for a scope outlives the view (`processRunListCache`): a
 * return to the tab paints that list at once, loaded, and re-reads behind it.
 */
export function useProcessRuns(projectId?: string): UseProcessRuns {
  const { token } = useAuth()
  const { ws } = useApi()
  const key = processRunListKey(projectId)
  const [scoped, setScoped] = useState<ScopedRuns>(() => cachedScope(key))
  const [loadError, setLoadError] = useState<Error | null>(null)
  const current = scoped.key === key ? scoped : cachedScope(key)
  const runs = useMemo(() => current.runs ?? [], [current.runs])
  const isLoaded = current.settled

  const updateRuns = useCallback(
    (next: (prev: ProcessRun[]) => ProcessRun[], settles: boolean) =>
      setScoped((prev) => {
        const base = prev.key === key ? prev : cachedScope(key)
        return { key, runs: next(base.runs ?? []), settled: settles || base.settled }
      }),
    [key],
  )

  // Only a list that has been read whole is kept: a live event landing before
  // the first read would otherwise be remembered as the scope's entire history.
  useEffect(() => {
    if (scoped.settled && scoped.runs) processRunListCache.set(scoped.key, scoped.runs)
  }, [scoped])

  const refresh = useCallback(async () => {
    try {
      const { data } = await listProcessRuns({
        query: { rootOnly: true, ...(projectId ? { projectId } : {}) },
        throwOnError: true,
      })
      updateRuns(() => ((data as ProcessRun[] | undefined) ?? []).slice().sort(byStartedDesc), true)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
      setScoped((prev) =>
        prev.key === key ? { ...prev, settled: true } : { ...cachedScope(key), settled: true },
      )
    }
  }, [projectId, key, updateRuns])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    return ws.on('process:run-update', (data: unknown) => {
      const update = data as ProcessRunUpdate
      // A deletion carries no record — just drop the run (and it is the only
      // event that removes one, so it is handled before the upsert guard).
      if (update?.deleted && update.runId) {
        updateRuns((prev) => prev.filter((r) => r.id !== update.runId), false)
        return
      }
      if (!shouldTrackProcessRunUpdate(update, projectId)) return
      updateRuns((prev) => {
        const next = prev.filter((r) => r.id !== update.runId)
        next.push(update.run)
        return next.sort(byStartedDesc)
      }, false)
    })
  }, [ws, token, projectId, updateRuns])

  return useMemo<UseProcessRuns>(() => {
    const { current, history } = splitProcessRunsByCurrent(runs)
    return {
      isLoaded,
      loadError,
      runs,
      current,
      history,
      running: runs.filter((r) => r.status === 'running').length,
      parked: runs.filter((r) => r.status === 'parked').length,
      refresh,
    }
  }, [isLoaded, loadError, runs, refresh])
}
