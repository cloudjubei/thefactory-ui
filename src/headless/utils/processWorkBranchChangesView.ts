import type { ProcessRun } from 'thefactory-tools/types'

/** One change made to a run's work branch from outside the run, as the run shows it. */
export type ProcessWorkBranchChangeRow = {
  id: string
  sha: string
  summary: string
  at: number
}

/** The changes made to a run's work branch from outside it, newest first. Pure. */
export function processWorkBranchChangeRows(
  run: Pick<ProcessRun, 'workBranchChanges'>,
): ProcessWorkBranchChangeRow[] {
  return [...(run.workBranchChanges ?? [])]
    .reverse()
    .map((c) => ({ id: c.id, sha: c.sha, summary: c.summary, at: c.at }))
}

/** What the list of outside changes is called on a run. */
export const PROCESS_WORK_BRANCH_CHANGES_LABEL = 'Changed outside the run — approved by you'
