import type { ProcessStatusTone } from './processView'

/** Where a step stands against the one the work is on now. */
export type StepsStripPhase = 'done' | 'current' | 'upcoming'

/** One step, feature or done-when criterion a steps strip shows. */
export type StepsStripEntry = {
  key: string
  label: string
  phase: StepsStripPhase
  /** The status tone its dot and, while current, its text are drawn in. */
  tone: ProcessStatusTone
  /** The attempt pill — `attempt 3 of 3` — shown only once a step was retried. */
  attempt?: string
}

/** One thing on the strip, left to right. */
export type StepsStripItem =
  | {
      kind: 'done'
      key: string
      /** `✓ 8 done`, or `✓ 8/12` on a narrow strip. Opens the full list. */
      label: string
      count: number
    }
  | {
      kind: 'step'
      key: string
      entry: StepsStripEntry
      /** The step the work is on: drawn bolder, with room for a longer name. */
      emphasis: boolean
    }
  | {
      kind: 'more'
      key: string
      /** `+3 more`, or `+3` on a narrow strip. Opens the full list. */
      label: string
      count: number
    }

/** What a steps strip draws. */
export type StepsStripView = {
  items: StepsStripItem[]
  /** True when steps were folded into chips — the chips open the full list. */
  folded: boolean
}

export type StepsStripOptions = {
  /** A narrow strip folds always and keeps only the done count, the current step and the rest. */
  narrow?: boolean
}

/** A strip with its heading — `Steps`, `Features`, `Done when` — and what it lists. */
export type StepsStripModel = {
  label: string
  entries: StepsStripEntry[]
}
