import type { ProcessStatusTone } from './processView'

/** What a step's row on the pipeline shows: one line, and whether it opens. */
export type ProcessStepRowView = {
  /** Skipped, not needed, or not reached: grey, a dashed dot, no time or cost, nothing to open. */
  inert: boolean
  /** The step's result in one short line. */
  result: string | undefined
  /** The line is the step waiting on the person — drawn in the accent. */
  waitingOnYou: boolean
  /** The chevron is there: the step produced something to preview. */
  expandable: boolean
  /** What its preview card shows. */
  preview: ProcessStepPreviewKind
}

/** The kind of preview a step's chevron opens. */
export type ProcessStepPreviewKind =
  | 'code-review'
  | 'report'
  | 'stages'
  | 'checks'
  | 'attempt'
  | 'none'

/** One stage of a feature step's own pipeline, as a chip that opens its view. */
export type ProcessStageChip = {
  stepId: string
  label: string
  mark: string
  tone: ProcessStatusTone
  note: string | undefined
  /** Nothing to open — the stage never ran, or was skipped. */
  inert: boolean
}
