import type { ProcessFeatureClosureStatus } from 'thefactory-tools/types'

/** One feature row of "Settle its features": what it is now, what the run did, and the person's pick. */
export interface ProcessRunClosureRow {
  featureId: string
  title: string
  /** Its status now. */
  currentStatus: string
  /** What it is left as unless the person changes it. */
  suggested: ProcessFeatureClosureStatus
  why: string
  work: string[]
  /** The person's pick. */
  status: ProcessFeatureClosureStatus
  /** Why it is blocked — required with `blocked`. */
  reason: string
}

/** A status a row can be left as, with the words the picker shows. */
export interface ProcessRunClosureOption {
  status: ProcessFeatureClosureStatus
  label: string
}
