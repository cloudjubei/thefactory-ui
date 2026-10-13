import type { ParsedReference, ResourceLink } from 'thefactory-tools/types'

/**
 * The group whose notes a chat's references reach: a group chat's own group,
 * or a project chat's MAIN group — the same group whose notes its agents read.
 * A chat over every project (the general chat) reaches none.
 */
export function referenceGroupId(
  scope: { projectId?: string | null; groupId?: string | null } | undefined,
  projects: readonly { id: string; mainGroupId?: string | null }[],
): string | undefined {
  if (scope?.groupId) return scope.groupId
  if (!scope?.projectId) return undefined
  return projects.find((p) => p.id === scope.projectId)?.mainGroupId ?? undefined
}

/**
 * Whether a chat's references load only as they are needed: a chat over every
 * project (the general chat) reaches all of them, so it reads a project's
 * references when one of its chips shows or a reference is typed — not every
 * project's on open.
 */
export function isLazyReferenceScope(
  scope: { projectId?: string | null; groupId?: string | null } | undefined,
): boolean {
  return scope !== undefined && !scope.projectId && !scope.groupId
}

/** The projects of a scope whose references to read: all of them, or a lazy scope's wanted ones. */
export function referenceProjectsToLoad(
  scopeIds: readonly string[],
  lazy: boolean,
  wanted: ReadonlySet<string>,
): string[] {
  return lazy ? scopeIds.filter((id) => wanted.has(id)) : [...scopeIds]
}

/** The project a reference or link names, if it names one. */
export function referencedProjectId(item: ParsedReference | ResourceLink): string | undefined {
  if ('type' in item) {
    const named = item.type === 'reference' ? item.reference : item.typed
    return 'projectId' in named ? named.projectId : undefined
  }
  if (item.kind === 'chat') return item.context.projectId ?? undefined
  return 'projectId' in item ? item.projectId : undefined
}
