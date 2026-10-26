/**
 * How many unread items each project's app holds (`app-unread` records), by
 * project id — one store, so every badge reader shares one count and one fetch.
 * Read via {@link useAppUnreadCounts}.
 */

let byProject: Readonly<Record<string, number>> = {}
const listeners = new Set<() => void>()

/** Record a project's count; a count that did not change tells no one. */
export function setAppUnreadCount(projectId: string, count: number): void {
  if (byProject[projectId] === count) return
  byProject = { ...byProject, [projectId]: count }
  for (const l of listeners) l()
}

export function subscribeAppUnread(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Current snapshot (stable reference until the next change). */
export function appUnreadSnapshot(): Readonly<Record<string, number>> {
  return byProject
}

/** A project's unread items in a snapshot; none for a project not counted yet. */
export function appUnreadForProject(
  snapshot: Readonly<Record<string, number>>,
  projectId: string | undefined,
): number {
  return projectId ? (snapshot[projectId] ?? 0) : 0
}
