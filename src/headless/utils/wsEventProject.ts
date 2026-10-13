/**
 * Whether a socket event is about `projectId` — so a view of one project
 * re-reads on its own project's changes, not on every project's. An event that
 * names its project (`projectId`, or a `projectIds` list) concerns only those;
 * one that names none, or a view with no project, lets it through.
 */
export function wsEventConcernsProject(data: unknown, projectId: string | undefined): boolean {
  if (!projectId || typeof data !== 'object' || data === null) return true
  const event = data as { projectId?: unknown; projectIds?: unknown }
  if (typeof event.projectId === 'string') return event.projectId === projectId
  if (Array.isArray(event.projectIds)) return event.projectIds.includes(projectId)
  return true
}
