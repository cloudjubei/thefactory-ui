/**
 * A tiny module-level store of background activities, keyed by project scope,
 * fed by `activity:updated` WS events for EVERY project (not just the active
 * one). Lets the sidebar show a spinner on a project's row while its activity
 * runs — even after the user navigates away. Each run also tracks `live`: a
 * `running` run that is NOT live (e.g. orphaned after a server restart) is shown
 * as *paused* (resumable), not as a live spinner. Read via {@link useProjectActivities}.
 */

import { countUnseenFinished } from 'thefactory-tools/utils'

export type ActivityLite = {
  activityId: string
  scope: string
  status: string
  live: boolean
  /** When the run first reached a terminal status (feeds the unseen-results badge). */
  finishedAt?: string
}

let byScope: Record<string, ActivityLite[]> = {}
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

/**
 * Upsert one run, replacing any prior entry with its id. `live` defaults to true
 * (a run that emitted a WS event is, by definition, executing); seeds pass the
 * server's `isLive` so orphaned runs land as paused.
 */
export function upsertActivityRun(
  run: {
    activityId?: unknown
    scope?: unknown
    status?: unknown
    isLive?: unknown
    finishedAt?: unknown
  },
  live = true,
): void {
  if (!run || typeof run.activityId !== 'string' || typeof run.scope !== 'string') return
  const scope = run.scope
  const isLive = typeof run.isLive === 'boolean' ? run.isLive : live
  const lite: ActivityLite = {
    activityId: run.activityId,
    scope,
    status: String(run.status ?? ''),
    live: isLive,
    finishedAt: typeof run.finishedAt === 'string' ? run.finishedAt : undefined,
  }
  const prev = byScope[scope] ?? []
  byScope = {
    ...byScope,
    [scope]: prev.filter((a) => a.activityId !== lite.activityId).concat(lite),
  }
  emit()
}

/** Replace a scope's full list (from a `listActivities` seed, carrying `isLive`). */
export function replaceActivityScope(
  scope: string,
  runs: ReadonlyArray<{
    activityId: string
    status: string
    isLive?: boolean
    finishedAt?: string
  }>,
): void {
  byScope = {
    ...byScope,
    [scope]: runs.map((r) => ({
      activityId: r.activityId,
      scope,
      status: r.status,
      live: r.isLive !== false,
      finishedAt: r.finishedAt,
    })),
  }
  emit()
}

export function subscribeActivities(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Current snapshot (stable reference until the next change). */
export function activitiesSnapshot(): Record<string, ActivityLite[]> {
  return byScope
}

/** Activities `running` AND live for a scope — drives the spinner. */
export function liveRunningForScope(
  snapshot: Record<string, ActivityLite[]>,
  scope: string | undefined,
): number {
  if (!scope) return 0
  return (snapshot[scope] ?? []).filter((a) => a.status === 'running' && a.live).length
}

/** Activities `running` but NOT live for a scope — drives the paused icon. */
export function pausedForScope(
  snapshot: Record<string, ActivityLite[]>,
  scope: string | undefined,
): number {
  if (!scope) return 0
  return (snapshot[scope] ?? []).filter((a) => a.status === 'running' && !a.live).length
}

/** Runs in a scope that finished after `sinceIso` — the unseen-results badge count. */
export function unseenFinishedForScope(
  snapshot: Record<string, ActivityLite[]>,
  scope: string | undefined,
  sinceIso: string | undefined,
): number {
  if (!scope) return 0
  return countUnseenFinished(snapshot[scope] ?? [], sinceIso)
}
