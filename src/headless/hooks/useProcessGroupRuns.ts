import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProcessGroupRun } from 'thefactory-tools/types'
import { listProcessGroupRuns, useApi, useAuth } from '../api'
import type { ProcessGroupRunUpdate } from './useProcessGroupRun'
import { isProcessRunActive } from '../utils/processRunCurrent'
import { compareRunsNewestFirst } from '../utils/processRunOrder'

/**
 * Whether a live `process:group-run-update` belongs in a list scoped to
 * `groupId` (every group's, when unscoped). Pure.
 */
export function shouldTrackProcessGroupRunUpdate(
  update: ProcessGroupRunUpdate,
  groupId?: string,
): update is ProcessGroupRunUpdate & { groupRunId: string; run: ProcessGroupRun } {
  if (!update?.run || !update.groupRunId) return false
  return !groupId || update.run.groupId === groupId
}

export type UseProcessGroupRuns = {
  isLoaded: boolean
  loadError: Error | null
  /** Every group run for the scope, newest first. */
  runs: ProcessGroupRun[]
  /** The live ones, newest first. */
  current: ProcessGroupRun[]
  /** The finished ones, newest first. */
  history: ProcessGroupRun[]
  /** Count of group runs stopped for the user — a decision is pending. */
  parked: number
  refresh: () => Promise<void>
}

/** Every group run of a group (or of every group), kept live. */
export function useProcessGroupRuns(groupId?: string): UseProcessGroupRuns {
  const { token } = useAuth()
  const { ws } = useApi()
  const [runs, setRuns] = useState<ProcessGroupRun[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await listProcessGroupRuns({
        query: groupId ? { groupId } : {},
        throwOnError: true,
      })
      setRuns(((data as ProcessGroupRun[] | undefined) ?? []).slice().sort(compareRunsNewestFirst))
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [groupId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    return ws.on('process:group-run-update', (data: unknown) => {
      const update = data as ProcessGroupRunUpdate
      if (update?.deleted && update.groupRunId) {
        setRuns((prev) => prev.filter((r) => r.id !== update.groupRunId))
        return
      }
      if (!shouldTrackProcessGroupRunUpdate(update, groupId)) return
      setRuns((prev) =>
        [...prev.filter((r) => r.id !== update.groupRunId), update.run].sort(
          compareRunsNewestFirst,
        ),
      )
    })
  }, [ws, token, groupId])

  return useMemo<UseProcessGroupRuns>(() => {
    const current = runs.filter(isProcessRunActive)
    return {
      isLoaded,
      loadError,
      runs,
      current,
      history: runs.filter((r) => !isProcessRunActive(r)),
      parked: runs.filter((r) => r.status === 'parked').length,
      refresh,
    }
  }, [isLoaded, loadError, runs, refresh])
}
