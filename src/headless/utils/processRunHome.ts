import type { ProcessRun } from 'thefactory-tools/types'

/**
 * What a run's row says about where it is from, in the list of a project that
 * is not its home: the home project's title, or its id when the title is not
 * known. Nothing for a run listed under its own project. Pure.
 */
export function processRunHomeLabel(
  run: Pick<ProcessRun, 'projectId'>,
  listedProjectId: string,
  projects: readonly { id: string; title: string }[] | undefined,
): string | undefined {
  if (run.projectId === listedProjectId) return undefined
  return projects?.find((project) => project.id === run.projectId)?.title ?? run.projectId
}
