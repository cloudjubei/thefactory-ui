import type { ProcessResumeChoice } from 'thefactory-tools/types'

import type { ProcessStatusTone } from './processView'

/** One decision a person made at a story's sign-off, arranged for one render. */
export type ProcessSignoffDecisionView = {
  entryId: string
  /** The attempt's number among the step's attempts — what the row's badge counts. */
  attempt: number
  choice: ProcessResumeChoice
  label: string
  tone: ProcessStatusTone
  /** When it was decided, in ms since the epoch. */
  at: number
  note?: string
  /** How an approval brings the work in, in the words the sign-off offered it. */
  integration?: string
  /** The proof a request for changes required of its fix, in words. */
  requestedProof?: string[]
  /** Who decided it and where, in words; none on a decision recorded before decisions were attributed. */
  decidedBy?: string
  /** For the approval the work came in by: the generated files the merge rebuilt with no one asked again, and where its checks passed. */
  merged?: string
}

/** What was decided at a story's sign-off: the latest decision, then the earlier ones newest first. */
export type ProcessSignoffRecordView = {
  latest: ProcessSignoffDecisionView
  earlier: ProcessSignoffDecisionView[]
}
