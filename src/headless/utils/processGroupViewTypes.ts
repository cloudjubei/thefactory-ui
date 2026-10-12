import type {
  ProcessGroupLeg,
  ProcessGroupParkChoice,
  ProcessIntegrationMode,
  ProcessRunTotals,
} from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** One leg as the group pipeline draws it. */
export interface ProcessGroupLegRow {
  leg: ProcessGroupLeg
  label: string
  tone: ProcessStatusTone
  /** What it waits for, while it waits — a leg at its sign-off, what its merge waits for. */
  waitsFor?: string
  /** What opening its own run is for: signing it off, answering it, or just looking. */
  openLabel: string
  /** It waits at its own sign-off — opening its run is where it is signed off. */
  readyForSignOff: boolean
  /** Its runs' totals, every retry counted. */
  totals?: ProcessRunTotals
  /** Why its prerequisite build failed, when it did. */
  error?: string
  /** Its work can be marked as landed on its base branch outside its run — it stopped, was skipped or did not merge. */
  canMarkLanded: boolean
  /** How its work landed outside its run, once a person marked it. */
  landed?: string
}

/** Resuming an ended group run: what it starts, or why it cannot yet. */
export type ProcessGroupResumeView =
  | { canResume: true; effect: string }
  | { canResume: false; reason: string }

/** A leg's landing check as a person reads it: what proves it, or every reason it does not. */
export interface ProcessGroupLandingCheckView {
  landed: boolean
  lines: string[]
}

/** The chat card of a group run — reports, never decides. */
export interface ProcessGroupCardView {
  title: string
  badge: { label: string; tone: ProcessStatusTone }
  sub: string
  body?: { text: string; tone: ProcessStatusTone }
  cta: string
}

/** What the group run is waiting on the person for, and how they may answer. */
export interface ProcessGroupParkView {
  message: string
  /** The leg the park is about, when it is about one. */
  leg?: ProcessGroupLeg
  choices: ProcessGroupParkChoice[]
  /** The leg a retried merge brings in, with the mode it starts on. */
  toMerge: Array<{ leg: ProcessGroupLeg; mode: ProcessIntegrationMode }>
  /** The merge modes that retry may choose between. */
  modes: readonly ProcessIntegrationMode[]
}
