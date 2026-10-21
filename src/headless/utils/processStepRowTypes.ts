import type { ProcessAcceptedUncheckedView } from './processAcceptedUncheckedTypes'
import type { ProcessStatusTone } from './processView'

/** What a step's row on the pipeline shows: one line, and whether it opens. */
export type ProcessStepRowView = {
  /** Skipped, not needed, or not reached: grey, a dashed dot, no time or cost, nothing to open. */
  inert: boolean
  /** The step's result in one short line. */
  result: string | undefined
  /** The line is the step waiting on the person — drawn in the accent. */
  waitingOnYou: boolean
  /** The run is stopped at this step and the agent manager has the stop — drawn as work going on. */
  managerOnIt: boolean
  /**
   * The run carried the step on past although it was never proven: its chip,
   * and the result line says who accepted what.
   */
  acceptedUnchecked: ProcessAcceptedUncheckedView | undefined
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
  | 'signoff'
  | 'none'

/** One stage of a feature step's own pipeline, as a chip that opens its view. */
export type ProcessStageChip = {
  stepId: string
  label: string
  mark: string
  tone: ProcessStatusTone
  note: string | undefined
  /** Drawn on its tone's tint — a stage someone carried on past rather than one that proved itself. */
  tinted: boolean
  /** What its hover says — who accepted it — when there is more to say than the note. */
  title?: string
  /** Nothing to open — the stage never ran, or was skipped. */
  inert: boolean
}
