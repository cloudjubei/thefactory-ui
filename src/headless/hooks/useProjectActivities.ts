import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { listActivities } from '../api/generated'
import { useApi } from '../api/ApiContext'
import {
  activitiesSnapshot,
  liveRunningForScope,
  pausedForScope,
  replaceActivityScope,
  subscribeActivities,
  upsertActivityRun,
} from './activitiesStore'

export interface ProjectActivitiesState {
  /** Live-running activities for `projectId` — feeds its App-tab badge count. */
  runningCount: number
  /** True while an activity is live-running for `projectId` — drives the spinner. */
  working: boolean
  /** True while an activity is `running` but not live (resumable) for `projectId`. */
  paused: boolean
  /** Live-running count for ANY scope (for sidebar project rows). */
  liveForScope: (scope: string | undefined) => number
  /** Paused (running-but-not-live) count for ANY scope. */
  pausedForScope: (scope: string | undefined) => number
}

/** Seed one project's activities into the store (carrying the server's `isLive`). */
async function seedProjectActivities(projectId: string): Promise<void> {
  try {
    const res = await listActivities({ path: { projectId }, throwOnError: true })
    replaceActivityScope(projectId, res.data.activities ?? [])
  } catch {
    // Best-effort: leave the store as-is on a transient failure.
  }
}

/**
 * Live view of background activities. Subscribes to `activity:updated` for EVERY
 * project (so the sidebar can spin a non-active project's row), seeds the given
 * `projectId` from the list endpoint, and exposes per-scope live/paused readers.
 * A run that emits is `live`; a `running` run the server reports `isLive:false`
 * (orphaned after a restart) is *paused* — shown with the paused icon, resumable.
 */
export function useProjectActivities(projectId: string | undefined): ProjectActivitiesState {
  const { ws } = useApi()
  const snapshot = useSyncExternalStore(subscribeActivities, activitiesSnapshot)

  useEffect(() => ws.on('activity:updated', (run) => upsertActivityRun(run as object)), [ws])

  useEffect(() => {
    if (projectId) void seedProjectActivities(projectId)
  }, [projectId])

  const liveForScope = useCallback(
    (scope: string | undefined) => liveRunningForScope(snapshot, scope),
    [snapshot],
  )
  const pausedForScopeFn = useCallback(
    (scope: string | undefined) => pausedForScope(snapshot, scope),
    [snapshot],
  )
  const runningCount = liveForScope(projectId)
  return {
    runningCount,
    working: runningCount > 0,
    paused: pausedForScopeFn(projectId) > 0,
    liveForScope,
    pausedForScope: pausedForScopeFn,
  }
}

/**
 * Seed activities for a set of projects (so the sidebar shows live spinners +
 * paused icons on EVERY project's row, not just the active one). Call once with
 * the full project list; re-seeds when the set changes.
 */
export function useSeedActivities(projectIds: ReadonlyArray<string>): void {
  const key = projectIds.join(',')
  useEffect(() => {
    for (const pid of projectIds) void seedProjectActivities(pid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
