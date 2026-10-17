/**
 * The non-agentic checks a process runs — build, type check, lint, format, unit
 * tests — read for the pipeline and the sign-off, and the developer's own
 * account of the checks it ran before handing over. Pure: no React, no I/O.
 */

import type { ProcessLedgerEntry, ProcessPlanStep } from 'thefactory-tools/types'
import {
  checkBaselineLine,
  dependencyRevisionsLine,
  developerChecksLine,
} from 'thefactory-tools/utils'

import type {
  ReviewEvidenceRef,
  RunVerification,
  VerificationCheckResult,
  VerificationStatus,
} from '../api/generated'
import { checkMethodFor, checkRanInSentence } from './checkMethods'
import type { CheckMethodId } from './checkMethodTypes'
import {
  CHECK_RAN_IN_LABELS,
  DEVELOPER_CHECK_ROLES,
  DEVELOPER_RAN_NO_CHECKS,
  DEVELOPER_VERIFIED_LABEL,
  PROCESS_CHECK_ADVISORY_TONE,
  PROCESS_CHECK_BASELINE_LABELS,
  PROCESS_CHECK_FLAGGED_MARK,
  PROCESS_CHECK_FLAGGED_WORD,
  PROCESS_CHECK_MARKS,
  PROCESS_CHECK_TONES,
  PROCESS_CHECK_WORDS,
} from './processChecksViewConstants'
import type {
  DeveloperChecksNote,
  ProcessCheckRow,
  ProcessChecksResult,
  ProcessCheckWaitingView,
} from './processChecksViewTypes'
import { formatProcessDuration } from './processView'
import { checkTestCounts, testCountLabel } from './testCounts'
import { formatDurationMs } from './time'

type ChecksRun = {
  ledger: readonly Pick<
    ProcessLedgerEntry,
    'id' | 'stepId' | 'status' | 'checks' | 'startedAt' | 'endedAt'
  >[]
  plan?: { steps: readonly Pick<ProcessPlanStep, 'id' | 'kind'>[] }
}

/**
 * What a run's newest finished checks step recorded, or `undefined` when no
 * checks step of it has finished with a result yet.
 */
export function latestProcessChecks(run: ChecksRun | undefined): ProcessChecksResult | undefined {
  if (!run) return undefined
  const checkSteps = new Set(
    (run.plan?.steps ?? []).filter((s) => s.kind === 'check').map((s) => s.id),
  )
  for (let i = run.ledger.length - 1; i >= 0; i--) {
    const entry = run.ledger[i]
    if (!checkSteps.has(entry.stepId) || entry.status !== 'done') continue
    if (!entry.checks || entry.checks.length === 0) continue
    return {
      entryId: entry.id,
      checks: [...entry.checks],
      at: entry.endedAt ?? entry.startedAt,
    }
  }
  return undefined
}

/** What a set of checks came to: only a blocking failure fails it — an advisory one never does. */
export function verificationStatusOf(
  checks: readonly VerificationCheckResult[],
): VerificationStatus {
  const decisive = checks.filter((c) => !c.optional)
  if (decisive.some((c) => c.status === 'failed' || c.status === 'error')) return 'failed'
  if (checks.some((c) => c.status === 'passed')) return 'passed'
  return 'unchecked'
}

/**
 * A run's own verification record with its process's checks step read over it.
 *
 * Per method, the newer source wins: a checks step that finished after the
 * record was stamped replaces the record's results for every method it ran —
 * it ran against the landed head — while a step older than the record only
 * fills the methods the record has none for. Methods only one source ran are
 * kept either way. Once a step's results are in, the record's reason for
 * checking nothing no longer describes it, so it is dropped.
 */
export function withProcessChecks(
  verification: RunVerification | undefined,
  latest: ProcessChecksResult | undefined,
): RunVerification | undefined {
  if (!latest) return verification
  const newer = !verification || latest.at >= verification.finishedAt
  const own = verification?.checks ?? []
  const methodsOf = (checks: readonly VerificationCheckResult[]): Set<CheckMethodId> =>
    new Set(checks.map(checkMethodFor))
  const stepMethods = methodsOf(latest.checks)
  const ownMethods = methodsOf(own)
  const kept = newer ? own.filter((c) => !stepMethods.has(checkMethodFor(c))) : own
  const fromStep = newer
    ? latest.checks
    : latest.checks.filter((c) => !ownMethods.has(checkMethodFor(c)))
  if (fromStep.length === 0) return verification
  const checks = [...kept, ...fromStep]
  if (!verification) {
    return {
      status: verificationStatusOf(checks),
      checks,
      startedAt: latest.at,
      finishedAt: latest.at,
    }
  }
  const { uncheckedReason: _dropped, ...record } = verification
  return {
    ...record,
    status: verificationStatusOf(checks),
    checks,
    finishedAt: Math.max(verification.finishedAt, latest.at),
  }
}

/**
 * The per-command rows a checks step's node lists under it, from its newest
 * attempt — none for any other kind of step, or while the attempt is still
 * running and has recorded nothing.
 */
export function processCheckRows(state: {
  step: Pick<ProcessPlanStep, 'kind'>
  latest?: Pick<ProcessLedgerEntry, 'checks'>
}): ProcessCheckRow[] {
  if (state.step.kind !== 'check') return []
  return (state.latest?.checks ?? []).map((check) => {
    const advisory = check.optional === true
    const concluded = check.status === 'passed' || check.status === 'skipped'
    const flagged = advisory && !concluded
    const summary = check.summary.trim()
    const counts = checkTestCounts(check)
    return {
      id: check.id,
      label: check.label,
      status: check.status,
      mark: flagged ? PROCESS_CHECK_FLAGGED_MARK : PROCESS_CHECK_MARKS[check.status],
      word: flagged ? PROCESS_CHECK_FLAGGED_WORD : PROCESS_CHECK_WORDS[check.status],
      tone: flagged ? PROCESS_CHECK_ADVISORY_TONE : PROCESS_CHECK_TONES[check.status],
      advisory,
      summary: summary.length > 0 ? summary : undefined,
      durationLabel: check.durationMs > 0 ? formatDurationMs(check.durationMs) : undefined,
      ranInLabel: check.ranIn ? CHECK_RAN_IN_LABELS[check.ranIn] : undefined,
      ranInDetail: checkRanInSentence([check]),
      testCountLabel: counts && counts.total > 0 ? testCountLabel(counts) : undefined,
      baselineLabel: check.baseline
        ? PROCESS_CHECK_BASELINE_LABELS[check.baseline.verdict]
        : undefined,
      baselineDetail: checkBaselineLine(check),
      dependencyDetail: dependencyRevisionsLine(check.dependencyRevisions),
    }
  })
}

/**
 * What a sign-off section says about the checks its developer ran before it
 * handed over, read from what the host recorded as they ran. A section whose
 * runs changed the code but ran none says so — that is worth a reviewer
 * knowing; a section no such agent ran says nothing.
 */
export function developerChecksNote(
  evidence: readonly Pick<ReviewEvidenceRef, 'approach' | 'checkRun' | 'createdAt'>[],
  roles: readonly string[],
): DeveloperChecksNote | undefined {
  const line = developerChecksLine(evidence)
  if (line) return { text: `${DEVELOPER_VERIFIED_LABEL}: ${line}`, ran: true }
  return roles.some((role) => DEVELOPER_CHECK_ROLES.includes(role))
    ? { text: DEVELOPER_RAN_NO_CHECKS, ran: false }
    : undefined
}

/**
 * What a running checks step is waiting for before its checks start — its
 * turn behind another check run of the project — and how long it has waited
 * up to `now`; `undefined` for any other step, an attempt that is not running,
 * or one whose checks have started. Pure.
 */
export function processCheckWaitingView(
  state: {
    step: Pick<ProcessPlanStep, 'kind'>
    latest?: Pick<ProcessLedgerEntry, 'status' | 'queued'>
  },
  now: number,
): ProcessCheckWaitingView | undefined {
  const queued = state.latest?.status === 'running' ? state.latest.queued : undefined
  if (state.step.kind !== 'check' || !queued) return undefined
  return { reason: queued.reason, waited: formatProcessDuration(now - queued.since) }
}
