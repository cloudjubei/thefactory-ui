import type { ProcessRun, ReviewEvidenceRef } from 'thefactory-tools/types'

import type { CheckMethodState, SignoffVerdict } from './checkMethodTypes'
import type { ProcessStatusTone } from './processView'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import type { ReportProofRow, ReportTile, SignoffReportView } from './signoffReportTypes'
import type { SignoffTally } from './storySignoffTypes'

/** What one run of a tree filed, as `GET /process-runs/:runId/evidence` says, ready to draw. */
export type ProcessRunEvidenceGroupView = {
  runId: string
  parentRunId?: string
  stepId?: string
  label: string
  status: ProcessRun['status']
  variant?: ProcessRun['variant']
  replaced?: true
  evidence: readonly ReviewEvidenceRef[]
  tiles: readonly EvidenceTile[]
}

export type ProcessVariantLaneStatus = 'queued' | 'running' | 'parked' | 'done' | 'stopped'

/** One day of a lane. */
export type ProcessVariantDayCell = {
  day: number
  look: 'lived' | 'today' | 'parked' | 'to-come'
}

/** Where a review stands: filed, under way, or not due. */
export type ProcessVariantReviewLook = 'done' | 'now' | 'wait'

/** Seven days of a lane, and the review after them when one falls there. */
export type ProcessVariantWeek = {
  label: string
  cells: readonly ProcessVariantDayCell[]
  review: ProcessVariantReviewLook | undefined
}

/** A ref or patch of a variant, as a chip. */
export type ProcessVariantFact = {
  key: string
  kind: 'ref' | 'patch'
  text: string
}

/** One variant of a run: what its lane and its section say. */
export type ProcessVariantLane = {
  id: string
  label: string
  stepId: string
  /** The run for it, once it started. */
  runId: string | undefined
  status: ProcessVariantLaneStatus
  badge: { label: string; tone: ProcessStatusTone }
  /** What it is doing, or came to. */
  line: string
  /** `Day 9 of 14`, when the launch said how many. */
  dayLine: string | undefined
  /** How far it got. */
  lived: number
  weeks: readonly ProcessVariantWeek[]
  time: string | undefined
  cost: string | undefined
  facts: readonly ProcessVariantFact[]
  proof: { count: number; total: number }
  /** The walkthrough chip its section wears. */
  chip: { label: string; state: CheckMethodState }
}

/** The lanes of a run. */
export type ProcessVariantLanesView = {
  heading: string
  sub: string
  /** The days each variant lives; absent when the launch names none, and the lanes have no cells. */
  days: number | undefined
  weekLabels: readonly string[]
  lanes: readonly ProcessVariantLane[]
  /** How many have ended, one way or the other. */
  ended: number
}

/** A recording, with whether it counts as proof. */
export type ProcessVariantRecording = {
  tile: EvidenceTile
  proof: boolean
  /** What its badge says. */
  label: string
  title: string
}

/** A review of a variant. */
export type ProcessVariantFindings = {
  key: string
  title: string
  /** Its text as filed. */
  text: string | undefined
}

/** A variant's section of the report. */
export type ProcessVariantSection = {
  lane: ProcessVariantLane
  recordings: readonly ProcessVariantRecording[]
  /** The day being recorded now: nothing to play yet. */
  recordingNow: boolean
  findings: readonly ProcessVariantFindings[]
  /** Why no findings are there. */
  findingsNote: string | undefined
}

/** The report of a run that worked variants, or of any run with no story. */
export type ProcessVariantReportView = {
  /** The final report, as the report panel draws it; absent until it is filed. */
  report: SignoffReportView | undefined
  /** The final report's tile. */
  reportTile: EvidenceTile | undefined
  /** The short post filed beside it. */
  post: EvidenceTile | undefined
  /** Why there is no final report yet; absent once there is. */
  waiting: { sub: string; line: string } | undefined
  tiles: readonly ReportTile[]
  proofRows: readonly ReportProofRow[]
  proof: { count: number; total: number }
  sections: readonly ProcessVariantSection[]
  /** Recordings a run filed under no variant, whatever step filed them. */
  recordings: readonly ProcessVariantRecording[]
  /** The headline of the decision: what the report concluded, else the run's name. */
  headline: string
  /** The badge of the decision, over the recordings that count. */
  verdict: SignoffVerdict
  tally: SignoffTally | undefined
}

/** The two views of a run of variants. */
export type ProcessVariantRunView = 'lanes' | 'report'
