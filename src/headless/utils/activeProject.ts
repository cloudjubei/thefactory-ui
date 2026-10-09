type DatedProject = { id: string; updatedAt?: string; createdAt?: string }

function pickMostRecent<P extends DatedProject>(projects: readonly P[]): P | undefined {
  return [...projects].sort((a, b) => {
    const at = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
    const bt = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
    return bt - at
  })[0]
}

/**
 * The active project once the list is known: the current one while it is still a project,
 * otherwise the most recently updated. Read against the CURRENT id, never one captured earlier,
 * so a project chosen in the same commit (a deep link) is not replaced by the fallback.
 */
export function resolveActiveProjectId(
  current: string | undefined,
  projects: readonly DatedProject[],
): string | undefined {
  if (current && projects.some((p) => p.id === current)) return current
  return pickMostRecent(projects)?.id
}
