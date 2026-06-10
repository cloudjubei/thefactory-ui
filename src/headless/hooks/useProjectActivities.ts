import { useCallback, useEffect, useMemo, useState } from 'react'
import { listActivities, type ListActivitiesResponses } from '../api/generated'
import { useApi } from '../api/ApiContext'

/** One activity run as returned by the list endpoint (status/steps + provenance). */
export type ActivityRunSummary = ListActivitiesResponses[200]['activities'][number]

export interface ProjectActivitiesState {
  /** Every activity run for the project, most-recently-updated first. */
  activities: ActivityRunSummary[]
  /** How many are currently `running` — feeds the nav badge count. */
  runningCount: number
  /** True while any activity is running — drives the nav spinner. */
  working: boolean
}

/**
 * Live view of a project's background activities. Fetches the list once, then
 * refetches whenever an `activity:updated` WS event for this project arrives — so
 * the nav badge/spinner reflects detached runs that survive navigating away or a
 * server restart. Best-effort: a failed list read just leaves the last list.
 */
export function useProjectActivities(projectId: string | undefined): ProjectActivitiesState {
  const { ws } = useApi()
  const [activities, setActivities] = useState<ActivityRunSummary[]>([])

  const refresh = useCallback(async () => {
    if (!projectId) {
      setActivities([])
      return
    }
    try {
      const res = await listActivities({ path: { projectId }, throwOnError: true })
      setActivities(res.data.activities ?? [])
    } catch {
      // Best-effort: leave the last-known list in place on a transient failure.
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(
    () =>
      ws.on<{ scope?: string }>('activity:updated', (run) => {
        if (!projectId || run?.scope === projectId) void refresh()
      }),
    [ws, refresh, projectId],
  )

  const running = useMemo(() => activities.filter((a) => a.status === 'running'), [activities])
  return { activities, runningCount: running.length, working: running.length > 0 }
}
