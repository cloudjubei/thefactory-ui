import type { CodeReviewFindingSeverity, ReportProofStatus } from 'thefactory-tools/types'

import type { ReviewEvidenceRef } from '../api/generated'
import type { CheckMethodState } from './checkMethodTypes'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import type { CodeReviewTone } from './signoffCodeReviewTypes'

/** The record a run-through ends with, as it was filed. */
export type RunThroughRecordSections = NonNullable<ReviewEvidenceRef['runThroughSections']>

/** A filing that is an issue a run-through flagged. */
export type RunThroughIssueTile = EvidenceTile & {
  ref: ReviewEvidenceRef & { issue: NonNullable<ReviewEvidenceRef['issue']> }
}

/** How a run-through went, as its chip says it: clean, with issues, or stopped by one. */
export type RunThroughState = Extract<CheckMethodState, 'passed' | 'flagged' | 'failed'>

/** One issue the tester flagged, ready to draw. */
export type RunThroughIssueRow = {
  key: string
  severity: CodeReviewFindingSeverity
  tone: CodeReviewTone
  title: string
  happened: string
  expected: string | undefined
  doing: string | undefined
  view: string | undefined
  /** Seconds into the run's recording, when it was recording. */
  atSec: number | undefined
  /** `atSec` as the player says it: "1:34". */
  time: string | undefined
  /** The screenshot the issue was flagged on, when it was flagged on one. */
  screenshot: EvidenceTile | undefined
}

/** The record the run-through ended with. */
export type RunThroughRecordView = {
  scenario: string
  reachedEnd: boolean
  /** "Reached the end", or "Stopped at …". */
  endLine: string
  summary: string
}

/** A run-through's tab: its record, its issues worst first, and the recording they sit on. */
export type RunThroughReportView = {
  /** Absent while the tester has flagged issues but filed no record yet. */
  record: RunThroughRecordView | undefined
  issues: RunThroughIssueRow[]
  /** "2 major · 1 minor · 1 nit", or "No issues". */
  issuesSummary: string
  state: RunThroughState
  /** Its line in "How it was proven". */
  proof: { text: string; status: ReportProofStatus }
  recording: EvidenceTile | undefined
}
