import type { ProcessRun } from 'thefactory-tools/types'

import type { CliRunSummary, ReviewEvidenceRef } from '../api/generated'

/** What a story sign-off is joined from, as last read: the story's process runs and its CLI runs. */
export type StorySignoffSources = {
  processRuns: ProcessRun[]
  cliRuns: CliRunSummary[]
}

/** An evidence listing as last read, with the note text already fetched for it. */
export type ReviewEvidenceSnapshot = {
  refs: ReviewEvidenceRef[]
  notes: Record<string, string>
}
