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
