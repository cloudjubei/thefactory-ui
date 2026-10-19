/**
 * Pure derivations behind the CLI-run review "evidence bundle" — the
 * verification chip, the per-check rows, the verdict banner, the land-failure
 * warning, and the merge outcome. No React, no I/O, no platform APIs: the web
 * and native `CliRunArtifactPanel`s are thin renderings of what this computes,
 * so a badge or a wording change lands on both clients at once.
 */

import { checkBaselineLine, dependencyRevisionsLine } from 'thefactory-tools/utils'

import type {
  CliRunLandFailure,
  CliRunVerdict,
  GitMergeResult,
  RunVerification,
  VerificationCheckStatus,
} from '../api/generated'
import {
  ALREADY_ON_BASE_LINE,
  ALREADY_ON_BASE_MESSAGE,
  ALREADY_ON_BASE_TITLE,
  SHORT_SHA_LENGTH,
  CHECK_STATUS_TONES,
  LAND_FAILURE_LEAD,
  LAND_FAILURE_REASON_LABELS,
  LAND_FAILURE_TITLE,
  NO_SOURCE_CHANGES_TITLE,
  MERGE_BLOCKED_FALLBACK,
  MERGE_FAILED_FALLBACK,
  SHADOW_MERGE_BLOCKED_FALLBACK,
  SHADOW_MERGE_FAILED_FALLBACK,
  VERDICT_AUTHOR_LABELS,
  VERDICT_LABELS,
  VERDICT_TONES,
  CHANGE_REQUEST_MESSAGE_PREFIX,
  LEGACY_CHECK_RECORD_NOTE,
} from './runReviewConstants'
import { checkMethodFor, checkRanInSentence } from './checkMethods'
import type {
  AlreadyOnBaseView,
  ReviewActionInput,
  ReviewActionMode,
  ReviewChangeCounts,
  ReviewCheckGroups,
  ReviewCheckRow,
  ReviewLandFailureSummary,
  ReviewMergeNotice,
  ReviewTone,
  ReviewVerdictSummary,
  RunReviewFacts,
  ViewedFile,
  ViewedFilesProgress,
  TestLayerLines,
} from './runReviewTypes'
import { costChipLabel } from './costDetails'
import type { CostSource } from './costDetailsTypes'
import { checkTestCounts, testCountLabel } from './testCounts'
import { checkTestResults } from './testResults'
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
    candidate.status !== 'error' &&
    candidate.status !== 'unchecked'
  ) {
    return undefined
  }
  if (!Array.isArray(candidate.checks)) return undefined
  return value as RunVerification
}

export function checkTone(status: VerificationCheckStatus): ReviewTone {
  return CHECK_STATUS_TONES[status] ?? 'neutral'
}

/** Per-check rows for the summary head, pre-toned and pre-formatted. */
export function verificationCheckRows(verification: RunVerification | undefined): ReviewCheckRow[] {
  return (verification?.checks ?? []).map((check) => {
    const testCount = checkTestCounts(check)
    return {
      id: check.id,
      label: check.label,
      kind: check.kind,
      status: check.status,
      tone: checkTone(check.status),
      summary: check.summary,
      durationLabel: formatDurationMs(check.durationMs),
      details: trimmedOrUndefined(check.details),
      optional: check.optional === true,
      method: checkMethodFor(check),
      command: trimmedOrUndefined(check.command),
      variant: trimmedOrUndefined(check.variant),
      variantReason: trimmedOrUndefined(check.variantReason),
      modules: check.modules && check.modules.length > 0 ? check.modules : undefined,
      coverageNote: trimmedOrUndefined(check.coverageNote),
      ranInDetail: checkRanInSentence([check]),
      dependencyDetail: dependencyRevisionsLine(check.dependencyRevisions),
      baselineDetail: checkBaselineLine(check),
      testCount,
      testCountLabel: testCountLabel(testCount),
      testResults: checkTestResults(check),
      legacyNote:
        check.kind === 'command' && !check.command?.trim() ? LEGACY_CHECK_RECORD_NOTE : undefined,
    }
  })
}

/**
 * The line under a check's command: the variant it ran on and why, the modules
 * it covered, how many tests it ran, where it ran, the code outside the
 * checkout it built against, and how a failure compares with the base —
 * "Variant debug (the default variant) · Modules app, library · 14 tests · Ran
 * on the host — why · Built against thefactory-tools at 1a2b3c4 with
 * uncommitted changes · Already failing at the base 28cf012 …".
 * `undefined` when the check said none of them.
 */
export function reviewCheckMeta(
  row: Pick<
    ReviewCheckRow,
    | 'variant'
    | 'variantReason'
    | 'modules'
    | 'testCountLabel'
    | 'ranInDetail'
    | 'dependencyDetail'
    | 'baselineDetail'
  >,
): string | undefined {
  const variant = row.variant
    ? `Variant ${row.variant}${row.variantReason ? ` (${row.variantReason})` : ''}`
    : undefined
  const parts = [
    variant,
    row.modules && row.modules.length > 0 ? `Modules ${row.modules.join(', ')}` : undefined,
    row.testCountLabel,
    row.ranInDetail,
    row.dependencyDetail,
    row.baselineDetail,
  ].filter((part): part is string => part !== undefined)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

/**
 * What a test layer's block says under its command, so the Tests tab states a
 * total once: a lone layer leaves its summary to the totals bar above it, and
 * no layer repeats in its meta the count its own summary already gives.
 */
export function testLayerLines(
  layer: Pick<
    ReviewCheckRow,
    | 'summary'
    | 'testCount'
    | 'variant'
    | 'variantReason'
    | 'modules'
    | 'testCountLabel'
    | 'ranInDetail'
    | 'dependencyDetail'
    | 'baselineDetail'
  >,
  layerCount: number,
): TestLayerLines {
  const counted = layer.testCount !== undefined
  const summarySaysCount = counted && layer.summary.includes(String(layer.testCount!.total))
  return {
    summary: counted && layerCount === 1 ? undefined : layer.summary,
    meta: reviewCheckMeta(
      summarySaysCount || (counted && layerCount === 1)
        ? { ...layer, testCountLabel: undefined }
        : layer,
    ),
  }
}

/** The checks that ran — a skipped one ran nothing, so it gives a Tests or Build tab nothing to list. */
export function ranReviewChecks(rows: readonly ReviewCheckRow[]): ReviewCheckRow[] {
  return rows.filter((row) => row.status !== 'skipped')
}

/**
 * A run's check rows, split the way its chips are: whatever rolls up into the
 * Tests chip goes to the Tests tab — a project's unit-test COMMAND as much as a
 * `tests` check — and everything else to the Build tab. Split by kind instead,
 * a green Tests chip opened a tab its check was not in.
 */
export function reviewCheckGroups(verification: RunVerification | undefined): ReviewCheckGroups {
  const rows = verificationCheckRows(verification)
  return {
    tests: rows.filter((row) => row.method === 'tests'),
    build: rows.filter((row) => row.method !== 'tests'),
  }
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
  if (failure.reason === 'already-on-base') {
    return {
      tone: 'neutral',
      title: ALREADY_ON_BASE_TITLE(trimmedOrUndefined(failure.baseRef)),
      message: ALREADY_ON_BASE_MESSAGE,
    }
  }
  const reason = LAND_FAILURE_REASON_LABELS[failure.reason] ?? failure.reason
  const detail = trimmedOrUndefined(failure.message)
  return {
    tone: 'warning',
    title: failure.reason === 'no-source-changes' ? NO_SOURCE_CHANGES_TITLE : LAND_FAILURE_TITLE,
    message: `${LAND_FAILURE_LEAD} — ${detail ? `${reason} — ${detail}` : reason}.`,
  }
}

/**
 * The one line a run shows when its base already holds its change — nothing
 * failed, and nothing is left to review — naming the commit that holds it when
 * the record says. `undefined` for any other run. Pure.
 */
export function alreadyOnBaseView(
  failure: CliRunLandFailure | undefined,
): AlreadyOnBaseView | undefined {
  if (failure?.reason !== 'already-on-base') return undefined
  const sha = trimmedOrUndefined(failure.landedBy?.sha)?.slice(0, SHORT_SHA_LENGTH)
  const subject = trimmedOrUndefined(failure.landedBy?.subject)
  return {
    text: ALREADY_ON_BASE_LINE(trimmedOrUndefined(failure.baseRef), sha),
    ...(sha ? { sha } : {}),
    ...(subject ? { subject } : {}),
  }
}

/**
 * A merge attempt's outcome. Conflicts and hard failures read as danger; a
 * policy refusal (`aborted`, nothing merged) reads as a warning the user can
 * clear by re-running checks.
 */
export function mergeNotice(
  result: GitMergeResult | undefined,
  opts: { shadow?: boolean } = {},
): ReviewMergeNotice | undefined {
  if (!result || result.ok) return undefined
  const conflictCount = result.conflicts?.length ?? 0
  const conflicts = `${conflictCount} conflict${conflictCount === 1 ? '' : 's'}`
  if (conflictCount > 0) {
    return {
      tone: 'danger',
      message: opts.shadow
        ? `${conflicts} with edits made in the project folder since the work began`
        : `${conflicts} — resolve in the Git tab`,
      blocked: false,
    }
  }
  if (result.aborted) {
    return {
      tone: 'warning',
      message:
        trimmedOrUndefined(result.message) ??
        (opts.shadow ? SHADOW_MERGE_BLOCKED_FALLBACK : MERGE_BLOCKED_FALLBACK),
      blocked: true,
    }
  }
  return {
    tone: 'danger',
    message:
      trimmedOrUndefined(result.message) ??
      (opts.shadow ? SHADOW_MERGE_FAILED_FALLBACK : MERGE_FAILED_FALLBACK),
    blocked: false,
  }
}

export function reviewActionMode(input: ReviewActionInput): ReviewActionMode {
  if (input.verdict) return 'decided'
  if (input.hasReviewBranch) return 'actions'
  // A story run executes each feature in its own sub-run. Those carry a captured
  // diff but are deliberately never landed — the story's consolidated review is
  // the single place the work lands. Offering them the direct-apply path would
  // put N ungated ways to land fragments of the same work beside one gated way
  // to land all of it.
  if (input.partOfStoryRun) return 'none'
  if (
    input.landFailureReason === 'already-on-base' ||
    input.landFailureReason === 'no-source-changes'
  ) {
    return 'none'
  }
  return 'apply'
}

/** Reject / request-changes both require a non-blank reason. */
export function isReviewReasonValid(reason: string): boolean {
  return reason.trim().length > 0
}

/**
 * Cost + duration for the summary head; each side drops out when unrecorded.
 * The cost label is the charge alone — the cost itself rides along so the chip
 * can open its details.
 */
export function runReviewFacts(input: {
  cost: CostSource | undefined
  durationMs: number | undefined
}): RunReviewFacts {
  const durationLabel =
    input.durationMs == null ? undefined : trimmedOrUndefined(formatDurationMs(input.durationMs))
  return { costLabel: costChipLabel(input.cost), durationLabel, cost: input.cost }
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

/**
 * Which of a run's changed files the user has viewed at the commit the change is
 * at now — one viewed at an older commit has changed since, so it is unread.
 */
export function viewedFilesProgress(
  changedPaths: readonly string[],
  viewedFiles: readonly ViewedFile[] | undefined,
  headSha: string | undefined,
): ViewedFilesProgress {
  const atHead = new Set(
    (viewedFiles ?? [])
      .filter((f) => headSha !== undefined && f.headSha === headSha)
      .map((f) => f.path),
  )
  const viewed = new Set(changedPaths.filter((p) => atHead.has(p)))
  return {
    viewed,
    count: viewed.size,
    total: changedPaths.length,
    all: changedPaths.length > 0 && viewed.size === changedPaths.length,
  }
}
