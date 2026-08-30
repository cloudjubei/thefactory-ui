import type {
  CliRunVerdict,
  VerificationCheckKind,
  VerificationCheckStatus,
  VerificationStatus,
} from '../api/generated'

/**
 * Semantic colour role for a run-review surface. Platform-neutral: web maps it
 * to Tailwind token classes, native to `nativePalette` values — the decision of
 * WHICH role applies is made once, here in headless.
 */
export type ReviewTone = 'positive' | 'warning' | 'danger' | 'neutral'

/** A run's verification status, widened with the "no checks have run" case. */
export type VerificationHeadlineStatus = VerificationStatus | 'not-run'

/** The verification chip above the diff: one status + the per-status tallies. */
export type VerificationHeadline = {
  status: VerificationHeadlineStatus
  tone: ReviewTone
  label: string
  /** `3 passed · 1 failed`, or the not-run explainer. */
  detail: string
  passed: number
  failed: number
  skipped: number
  errored: number
  total: number
  /** Wall-clock span of the verification run; `undefined` when it never ran. */
  durationMs: number | undefined
  /** `durationMs` as a label; `undefined` when it never ran. */
  durationLabel: string | undefined
}

/** One rendered check row under the verification chip. */
export type ReviewCheckRow = {
  id: string
  label: string
  kind: VerificationCheckKind
  status: VerificationCheckStatus
  tone: ReviewTone
  summary: string
  durationLabel: string
  /** Expandable raw output — `undefined` when the check carried none. */
  details: string | undefined
  optional: boolean
}

/** The decided-review banner shown in place of the action row. */
export type ReviewVerdictSummary = {
  tone: ReviewTone
  label: string
  byLabel: string
  notes: string | undefined
}

/** The "changes were produced but never landed" warning. */
export type ReviewLandFailureSummary = {
  title: string
  message: string
}

/** A merge attempt's user-facing outcome (conflicts / policy block / failure). */
export type ReviewMergeNotice = {
  tone: ReviewTone
  message: string
  /** True when the backend refused to merge on policy rather than failing. */
  blocked: boolean
}

/**
 * Which review affordance the panel renders:
 * - `decided` — a verdict exists; show it, the review is over.
 * - `actions` — the run landed on a review branch and is still open.
 * - `none` — no review branch (the no-git direct-apply path).
 */
export type ReviewActionMode = 'decided' | 'actions' | 'none'

export type ReviewActionInput = {
  verdict: CliRunVerdict | undefined
  hasReviewBranch: boolean
}

/** Cost + duration labels for the summary head; `undefined` when unrecorded. */
export type RunReviewFacts = {
  costLabel: string | undefined
  durationLabel: string | undefined
}

/** Per-status file tallies for the "what changed" line. */
export type ReviewChangeCounts = {
  added: number
  modified: number
  deleted: number
  total: number
}
