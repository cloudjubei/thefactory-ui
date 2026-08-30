/**
 * Pure derivations behind the CLI-run review "evidence bundle" — the
 * verification chip, the per-check rows, the verdict banner, the land-failure
 * warning, and the merge outcome. No React, no I/O, no platform APIs: the web
 * and native `CliRunArtifactPanel`s are thin renderings of what this computes,
 * so a badge or a wording change lands on both clients at once.
 */

import type {
  CliRunLandFailure,
  CliRunVerdict,
  GitMergeResult,
  RunVerification,
  VerificationCheckStatus,
} from '../api/generated'
import {
  CHECK_STATUS_TONES,
  LAND_FAILURE_REASON_LABELS,
  LAND_FAILURE_TITLE,
  MERGE_BLOCKED_FALLBACK,
  MERGE_FAILED_FALLBACK,
  NO_CHECKS_DETAIL,
  NOT_VERIFIED_DETAIL,
  VERDICT_AUTHOR_LABELS,
  VERDICT_LABELS,
  VERDICT_TONES,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
  CHANGE_REQUEST_MESSAGE_PREFIX,
} from './runReviewConstants'
import type {
  ReviewActionInput,
  ReviewActionMode,
  ReviewChangeCounts,
  ReviewCheckRow,
  ReviewLandFailureSummary,
  ReviewMergeNotice,
  ReviewTone,
  ReviewVerdictSummary,
  RunReviewFacts,
  VerificationHeadline,
  VerificationHeadlineStatus,
} from './runReviewTypes'
import { formatDurationMs } from './time'

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Narrow the `verify` endpoint's response. The route answers
 * `RunVerification | null` (null when the project configures no checks), which
 * codegen widens to `unknown` — this is the single place that re-establishes
 * the contract, so no caller casts blind.
 */
export function asRunVerification(value: unknown): RunVerification | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<RunVerification>
  if (
    candidate.status !== 'passed' &&
    candidate.status !== 'failed' &&
    candidate.status !== 'error'
  ) {
    return undefined
  }
  if (!Array.isArray(candidate.checks)) return undefined
  return value as RunVerification
}

export function checkTone(status: VerificationCheckStatus): ReviewTone {
  return CHECK_STATUS_TONES[status] ?? 'neutral'
}

/** The coloured verification chip: one status, its tone, and the tallies. */
export function verificationHeadline(
  verification: RunVerification | undefined,
): VerificationHeadline {
  const checks = verification?.checks ?? []
  const passed = checks.filter((c) => c.status === 'passed').length
  const failed = checks.filter((c) => c.status === 'failed').length
  const skipped = checks.filter((c) => c.status === 'skipped').length
  const errored = checks.filter((c) => c.status === 'error').length
  const status: VerificationHeadlineStatus = verification?.status ?? 'not-run'

  const parts: string[] = []
  if (passed > 0) parts.push(`${passed} passed`)
  if (failed > 0) parts.push(`${failed} failed`)
  if (errored > 0) parts.push(`${errored} errored`)
  if (skipped > 0) parts.push(`${skipped} skipped`)

  const durationMs = verification
    ? Math.max(0, verification.finishedAt - verification.startedAt)
    : undefined

  return {
    status,
    tone: VERIFICATION_STATUS_TONES[status],
    label: VERIFICATION_STATUS_LABELS[status],
    detail: !verification ? NOT_VERIFIED_DETAIL : parts.join(' · ') || NO_CHECKS_DETAIL,
    passed,
    failed,
    skipped,
    errored,
    total: checks.length,
    durationMs,
    durationLabel:
      durationMs == null ? undefined : trimmedOrUndefined(formatDurationMs(durationMs)),
  }
}

/** Per-check rows for the summary head, pre-toned and pre-formatted. */
export function verificationCheckRows(verification: RunVerification | undefined): ReviewCheckRow[] {
  return (verification?.checks ?? []).map((check) => ({
    id: check.id,
    label: check.label,
    kind: check.kind,
    status: check.status,
    tone: checkTone(check.status),
    summary: check.summary,
    durationLabel: formatDurationMs(check.durationMs),
    details: trimmedOrUndefined(check.details),
    optional: check.optional === true,
  }))
}

export function verdictSummary(verdict: CliRunVerdict): ReviewVerdictSummary {
  return {
    tone: VERDICT_TONES[verdict.decision] ?? 'neutral',
    label: VERDICT_LABELS[verdict.decision] ?? verdict.decision,
    byLabel: VERDICT_AUTHOR_LABELS[verdict.by] ?? verdict.by,
    notes: trimmedOrUndefined(verdict.notes),
  }
}

export function landFailureSummary(failure: CliRunLandFailure): ReviewLandFailureSummary {
  const reason = LAND_FAILURE_REASON_LABELS[failure.reason] ?? failure.reason
  const detail = trimmedOrUndefined(failure.message)
  return {
    title: LAND_FAILURE_TITLE,
    message: detail ? `${reason} — ${detail}` : reason,
  }
}

/**
 * A merge attempt's outcome. Conflicts and hard failures read as danger; a
 * policy refusal (`aborted`, nothing merged) reads as a warning the user can
 * clear by re-running checks.
 */
export function mergeNotice(result: GitMergeResult | undefined): ReviewMergeNotice | undefined {
  if (!result || result.ok) return undefined
  const conflictCount = result.conflicts?.length ?? 0
  if (conflictCount > 0) {
    return {
      tone: 'danger',
      message: `${conflictCount} conflict${conflictCount === 1 ? '' : 's'} — resolve in the Git tab`,
      blocked: false,
    }
  }
  if (result.aborted) {
    return {
      tone: 'warning',
      message: trimmedOrUndefined(result.message) ?? MERGE_BLOCKED_FALLBACK,
      blocked: true,
    }
  }
  return {
    tone: 'danger',
    message: trimmedOrUndefined(result.message) ?? MERGE_FAILED_FALLBACK,
    blocked: false,
  }
}

export function reviewActionMode(input: ReviewActionInput): ReviewActionMode {
  if (input.verdict) return 'decided'
  return input.hasReviewBranch ? 'actions' : 'none'
}

/** Reject / request-changes both require a non-blank reason. */
export function isReviewReasonValid(reason: string): boolean {
  return reason.trim().length > 0
}

/**
 * Run cost as a label. Sub-cent runs keep four decimals so a `$0.0012` run
 * doesn't collapse to `$0.00`.
 */
export function formatCostUSD(costUSD: number | undefined): string | undefined {
  if (costUSD == null || !Number.isFinite(costUSD) || costUSD < 0) return undefined
  if (costUSD > 0 && costUSD < 0.01) return `$${costUSD.toFixed(4)}`
  return `$${costUSD.toFixed(2)}`
}

/** Cost + duration for the summary head; each side drops out when unrecorded. */
export function runReviewFacts(input: {
  costUSD: number | undefined
  durationMs: number | undefined
}): RunReviewFacts {
  const durationLabel =
    input.durationMs == null ? undefined : trimmedOrUndefined(formatDurationMs(input.durationMs))
  return { costLabel: formatCostUSD(input.costUSD), durationLabel }
}

/** Per-status tallies for the artifact's file list ("what changed"). */
export function reviewChangeCounts(
  files: ReadonlyArray<{ status: 'added' | 'modified' | 'deleted' }> | undefined,
): ReviewChangeCounts {
  const list = files ?? []
  const added = list.filter((f) => f.status === 'added').length
  const modified = list.filter((f) => f.status === 'modified').length
  const deleted = list.filter((f) => f.status === 'deleted').length
  return { added, modified, deleted, total: list.length }
}

/**
 * The chat message a change request sends to the agent, or `undefined` when
 * there is nothing to say.
 *
 * Empty notes send nothing: a bare preface would read as an instruction to
 * change something unspecified, which is worse than staying silent.
 */
export function formatChangeRequestMessage(notes: string): string | undefined {
  const trimmed = notes.trim()
  if (trimmed.length === 0) return undefined
  return `${CHANGE_REQUEST_MESSAGE_PREFIX}\n\n${trimmed}`
}
