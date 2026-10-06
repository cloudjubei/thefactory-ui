import type { ReportProofStatus, ReportSections } from 'thefactory-tools/types'

import type { AcceptanceJudgement } from './acceptanceJudgementTypes'
import type { CheckMethodRow, CheckMethodState, ReviewTabId } from './checkMethodTypes'
import type { VerifyReviewStatus } from './processView'
import type { TestCounts } from './testCounts'
import type { CodeReviewTone } from './signoffCodeReviewTypes'
import type { SignoffCostView, SignoffTimeView, SignoffWork } from './signoffWorkTypes'

/** What a tile opens: where the time went, or what the spend was. */
export type ReportTileDetail =
  | { kind: 'time'; view: SignoffTimeView }
  | { kind: 'cost'; view: SignoffCostView }

/** One of the report's four headline tiles: Asked, Delivered, Time, Cost. */
export type ReportTile = {
  key: 'asked' | 'delivered' | 'time' | 'cost'
  label: string
  value: string
  sub: string | undefined
  tone: CodeReviewTone
  /** The breakdown the tile opens, when the runs' work is known. */
  detail?: ReportTileDetail
}

/** One line of how it was proven, and the tab that holds its proof. */
export type ReportProofRow = {
  key: string
  text: string
  status: ReportProofStatus
  mark: string
  tone: CodeReviewTone
  tab: ReviewTabId | undefined
  tabLabel: string | undefined
}

/** One of the report's fixed sections, with the line its header says when folded. */
export type ReportSectionView<T> = {
  title: string
  summary: string
  body: T
  /** Open by default — what needs reading now. */
  open: boolean
  /** Drawn in the attention tone — something waits on the reader. */
  attention: boolean
}

/** The report as an overview: four tiles over Outcome, How it was proven, Decisions made, Needs you. */
export type SignoffReportView = {
  tiles: ReportTile[]
  outcome: ReportSectionView<{ headline: string; detail: string | undefined }> | undefined
  howProven: ReportSectionView<ReportProofRow[]> | undefined
  decisions: ReportSectionView<string[]> | undefined
  needsYou: ReportSectionView<string[]> | undefined
  /** The report as written, when it could not be read as sections — shown as markdown. */
  fallbackMarkdown: string | undefined
  /** The report as filed, for a download. */
  markdown: string | undefined
}

/** What the report overview is built from. */
export type SignoffReportInput = {
  report: { text?: string; ref: { reportSections?: ReportSections } } | undefined
  /** How many features were asked for, and the acceptance criteria they carry. */
  featureCount: number
  criteriaCount: number
  /** The code review's criteria tally — what Delivered says only when nothing asked could be matched. */
  criteriaMet: { met: number; total: number } | undefined
  /** The asked acceptance criteria against what the code review judged of them — Delivered's source. */
  acceptance?: AcceptanceJudgement
  /** How it was proven, from the run's final state — replaces the report's own account when given. */
  proof?: readonly ReportProofRow[]
  /** Features done as asked, when no criteria tally says it. */
  featuresDelivered: { done: number; total: number }
  /** The head's time and cost — what the Time and Cost tiles say when the runs' work is not known. */
  took: { duration: string | undefined; cost: string | undefined }
  /** The time and spend behind the sign-off, step by step and role by role. */
  work?: SignoffWork
  /** The tabs the evidence card has, so a proof line links only to one that exists. */
  tabs: readonly ReviewTabId[]
}

/** What a step's preview says of the report: four small tiles. */
export type ReportPreviewTile = { key: string; label: string; value: string; tone: CodeReviewTone }

/** One of the story run's own steps as a proof line reads it. */
export type SignoffProofStepLine = {
  word: string
  line: string | undefined
  check: CheckMethodState
}

/** What "How it was proven" is built from: where each kind of proof stands at the end of the run. */
export type SignoffProofInput = {
  /** The story-wide check rows — the build-side methods and the tests. */
  checks: readonly Pick<CheckMethodRow, 'id' | 'label' | 'state' | 'detail'>[]
  /** The tests' totals across their layers, when they counted any. */
  testTotals: TestCounts | undefined
  codeReview: SignoffProofStepLine | undefined
  walkthrough: SignoffProofStepLine | undefined
  /** Each verified section's outcome — a feature's or a fix pass's latest verify. */
  verify: readonly { label: string; status: VerifyReviewStatus }[]
  /** The tabs the evidence card has, so a line links only to one that exists. */
  tabs: readonly ReviewTabId[]
}
