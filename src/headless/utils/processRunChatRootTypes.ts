import type { ProcessRun } from 'thefactory-tools/types'

/** What climbing a run tree reads of each run: who it is, its project, and the run it is nested in. */
export type ProcessRunTreeLink = Pick<ProcessRun, 'id' | 'projectId'> & {
  parentRunId?: string | null
}

/** Reads one run of the tree by id — `undefined` when it is gone. */
export type ProcessRunTreeReader = (runId: string) => Promise<ProcessRunTreeLink | undefined>
