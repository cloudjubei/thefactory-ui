import type {
  CliRunVerdict,
  VerificationCheckKind,
  VerificationCheckStatus,
} from '../api/generated'

/**
 * Semantic colour role for a run-review surface. Platform-neutral: web maps it
 * to Tailwind token classes, native to `nativePalette` values — the decision of
 * WHICH role applies is made once, here in headless.
 */
export type ReviewTone = 'positive' | 'warning' | 'danger' | 'neutral' | 'absent'

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
 * - `apply`   — no review branch, but a captured diff the user may apply
 *              directly (the no-git path).
 * - `none`    — nothing to offer here; this run's work lands somewhere else.
 */
export type ReviewActionMode = 'decided' | 'actions' | 'apply' | 'none'

export type ReviewActionInput = {
  verdict: CliRunVerdict | undefined
  hasReviewBranch: boolean
  /**
   * True when this run is one FEATURE of a story run. Such a sub-run carries its
   * own captured diff but is never landed: the story's consolidated review is the
   * only place its work should land. Without this it matches the no-git path and
   * offers a direct, ungated "Apply to project" for a fragment of the work —
   * bypassing the review branch, the verdict and every verification check.
   */
  partOfStoryRun?: boolean
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

/** One of the three ways to approve, fully described for a button and its confirm dialog. */
export type ApproveActionDescriptor = {
  action: 'leave-branch' | 'create-pr' | 'merge'
  /** Button text. */
  label: string
  /** Hover callout — one line on what this does that the label cannot say. */
  hint: string
  /** Confirm-dialog heading. */
  title: string
  /** Exactly what will happen, in order. Shown as the dialog's body. */
  effects: string[]
  /** Confirm-button text. */
  confirmLabel: string
  /** Why the action cannot be offered, when it cannot. */
  disabledReason?: string
  /** Marks the option that changes nothing shared — badged in the menu. */
  safest?: boolean
  /** Carries a "not proven" marker in the menu on any verdict but `proven`. */
  warnUnlessProven?: boolean
}
