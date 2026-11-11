import type { ProcessRun, ReviewEvidenceRef } from 'thefactory-tools/types'

import type { CheckMethodState, SignoffVerdict } from './checkMethodTypes'
import type { ProcessStatusTone } from './processView'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import type { ScriptStepLogView } from './scriptStepLogViewTypes'
import type { ReportProofRow, ReportTile, SignoffReportView } from './signoffReportTypes'
import type { StepsStripEntry } from './stepsStripTypes'
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
  /** What it came to, or the last thing it filed while it works. */
  line: string
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

/** A report a variant filed. */
export type ProcessVariantFindings = {
  key: string
  title: string
  /** Its text as filed. */
  text: string | undefined
}

/** A variant's section of the report. */
export type ProcessVariantSection = {
  lane: ProcessVariantLane
  /** Its recordings, in the order filed. */
  recordings: readonly ProcessVariantRecording[]
  /** Its reports, in the order filed. */
  findings: readonly ProcessVariantFindings[]
  /** Why no reports are there. */
  findingsNote: string | undefined
  /** Everything its run filed, for the step logs of its steps. */
  tiles: readonly EvidenceTile[]
}

/** A script step of a variant's run and its step log. */
export type ProcessVariantStepLog = {
  stepId: string
  title: string
  view: ScriptStepLogView
}

/** What a variant's own run adds to its lane: its steps, and the step logs of its script steps. */
export type ProcessVariantChildView = {
  steps: readonly StepsStripEntry[]
  stepLogs: readonly ProcessVariantStepLog[]
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
