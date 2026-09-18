import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProcessRun, ProcessRunStatus } from 'thefactory-tools/types'
import { listProcessRuns } from '../api'
import { useApi, useAuth } from '../api'

/**
 * The statuses a run is still LIVE in — "Current" in the Processes view, and the
 * only ones a nav badge counts. Everything else is terminal ("History").
 */
export const PROCESS_RUN_ACTIVE_STATUSES: ReadonlySet<ProcessRunStatus> = new Set([
  'pending',
  'running',
  'parked',
])

/** Whether a run is still live (Current) rather than finished (History). */
export function isProcessRunActive(run: Pick<ProcessRun, 'status'>): boolean {
  return PROCESS_RUN_ACTIVE_STATUSES.has(run.status)
}

export type UseProcessRuns = {
  isLoaded: boolean
  loadError: Error | null
  /** Every run for the scope, newest first (by `startedAt`). */
  runs: ProcessRun[]
  /** The live runs (`pending` | `running` | `parked`), newest first. */
  current: ProcessRun[]
  /** The finished runs (`succeeded` | `failed` | `cancelled`), newest first. */
  history: ProcessRun[]
  /** Count of runs actively working (`running`). */
  running: number
  /** Count of runs stopped for the user (`parked`) — a decision is pending. */
  parked: number
  refresh: () => Promise<void>
}

const byStartedDesc = (a: ProcessRun, b: ProcessRun) => (b.startedAt ?? 0) - (a.startedAt ?? 0)

/**
 * Every process run for a scope, kept live.
 *
 * The list route has no `status` filter, so Current/History is split HERE off
 * `run.status` — one fetch, both lists. Liveness is the same `process:run-update`
 * event the single-run hook uses: it carries the whole record, so a step change
 * upserts in place rather than re-fetching (which would flicker the list). A run
 * that changes status stays in the list and simply moves between `current` and
 * `history`, so a run finishing is visible rather than vanishing.
 *
 * Pass a `projectId` to scope to one project (the Processes tab); omit it for
 * every project the user can see (the nav badge, which sums across projects).
 * `rootOnly` keeps it to the runs a chat launched — a child run drilled into is
 * reached through its parent, never double-counted here.
 */
export function useProcessRuns(projectId?: string): UseProcessRuns {
  const { token } = useAuth()
  const { ws } = useApi()
  const [runs, setRuns] = useState<ProcessRun[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await listProcessRuns({
        query: { rootOnly: true, ...(projectId ? { projectId } : {}) },
        throwOnError: true,
      })
      setRuns(((data as ProcessRun[] | undefined) ?? []).slice().sort(byStartedDesc))
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [projectId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    return ws.on('process:run-update', (data: unknown) => {
      const update = data as { runId?: string; projectId?: string; run?: ProcessRun }
      if (!update?.run || !update.runId) return
      // Scoped instances ignore other projects' updates; the update carries its
      // projectId, so no re-fetch is needed to decide relevance.
      if (projectId && update.projectId && update.projectId !== projectId) return
      if (projectId && update.run.projectId !== projectId) return
      setRuns((prev) => {
        const next = prev.filter((r) => r.id !== update.runId)
        next.push(update.run as ProcessRun)
        return next.sort(byStartedDesc)
      })
    })
  }, [ws, token, projectId])

  return useMemo<UseProcessRuns>(() => {
    const current = runs.filter(isProcessRunActive)
    const history = runs.filter((r) => !isProcessRunActive(r))
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
