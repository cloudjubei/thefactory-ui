import type { ReportProofSource, ReportProofStatus } from 'thefactory-tools/types'

import type { CheckMethodId, ReviewTabId } from './checkMethodTypes'
import type { CodeReviewTone } from './signoffCodeReviewTypes'

export const REPORT_SECTION_TITLES = {
  outcome: 'Outcome',
  howProven: 'How it was proven',
  decisions: 'Decisions made',
  needsYou: 'Needs you',
} as const

export const REPORT_TILE_LABELS = {
  asked: 'Asked',
  delivered: 'Delivered',
  proven: 'Proven',
  time: 'Time',
  cost: 'Cost',
} as const

export const REPORT_PROOF_MARK: Record<ReportProofStatus, string> = {
  proven: '✓',
  unproven: '!',
  failed: '✗',
}

export const REPORT_PROOF_TONE: Record<ReportProofStatus, CodeReviewTone> = {
  proven: 'done',
  unproven: 'working',
  failed: 'stuck',
}

/** The evidence tab each kind of proof lives in — verify lives on its feature. */
export const REPORT_PROOF_TAB: Record<ReportProofSource, ReviewTabId | undefined> = {
  tests: 'tests',
  checks: 'build',
  'code-review': 'code-review',
  walkthrough: 'walkthrough',
  verify: undefined,
  other: undefined,
}

export const REPORT_TAB_LABEL: Partial<Record<ReviewTabId, string>> = {
  tests: 'Tests',
  build: 'Build',
  'code-review': 'Code review',
  walkthrough: 'Walkthrough',
}

export const REPORT_NOTHING_NEEDS_YOU = 'Nothing'

/** How long a section's folded summary may run. */
export const REPORT_SUMMARY_MAX = 80

/** How long a proof line may quote a step's own reason. */
export const REPORT_PROOF_LINE_MAX = 140

/** The methods "How it was proven" counts as the checks — everything the Build tab holds. */
export const REPORT_CHECK_METHODS: readonly CheckMethodId[] = [
  'build',
  'types',
  'lint',
  'format',
  'uitests',
]

/** What a proof line calls the story run's own steps. */
export const REPORT_STEP_NAMES = {
  'code-review': 'Code review',
  walkthrough: 'Walkthrough',
} as const
