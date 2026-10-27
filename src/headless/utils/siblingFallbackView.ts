/**
 * Checks that ran again with out-of-tree code at its stable branch, read for
 * the checks step, the run's chat and a merge's result. Pure: no React, no I/O.
 */

import type {
  ProcessLedgerEntry,
  ProcessPlanStep,
  VerificationCheckResult,
  VerificationSiblingFallback,
} from '../api/generated'
import {
  SIBLING_FALLBACK_CHECK_SET_LABELS,
  SIBLING_FALLBACK_CLEARED,
  SIBLING_FALLBACK_FAILURES_LABELS,
  SIBLING_FALLBACK_REPLACED,
  SIBLING_FALLBACK_TITLES,
  SIBLING_FALLBACK_TONES,
} from './siblingFallbackViewConstants'
import type {
  SiblingFallbackCheckSet,
  SiblingFallbackChip,
  SiblingFallbackNoticeState,
  SiblingFallbackView,
} from './siblingFallbackViewTypes'

type FallbackRun = {
  plan?: { steps: readonly Pick<ProcessPlanStep, 'id' | 'kind'>[] }
  ledger: readonly (Pick<ProcessLedgerEntry, 'id' | 'stepId' | 'status'> & {
    siblingFallback?: VerificationSiblingFallback
  })[]
}

const short = (sha: string): string => sha.slice(0, 7)

function chipOf(sibling: VerificationSiblingFallback['siblings'][number]): SiblingFallbackChip {
  return {
    name: sibling.name,
    live: sibling.liveBranch
      ? `${sibling.liveBranch}@${short(sibling.liveSha)}`
      : short(sibling.liveSha),
    pending: sibling.dirty,
    stable: `${sibling.stableBranch}@${short(sibling.stableSha)}`,
    path: sibling.path,
  }
}

/** A fallback as the person reads it: its heading, the host's sentence, each dependency and what failed. Pure. */
export function siblingFallbackView(fallback: VerificationSiblingFallback): SiblingFallbackView {
  const lines =
    fallback.outcome === 'stable-passed'
      ? fallback.liveFailures
      : fallback.outcome === 'stable-failed'
        ? (fallback.stableFailures ?? [])
        : []
  return {
    outcome: fallback.outcome,
    tone: SIBLING_FALLBACK_TONES[fallback.outcome],
    title: SIBLING_FALLBACK_TITLES[fallback.outcome],
    message: fallback.message,
    chips: fallback.siblings.map(chipOf),
    failures:
      fallback.outcome !== 'unavailable' && lines.length > 0
        ? { label: SIBLING_FALLBACK_FAILURES_LABELS[fallback.outcome], lines }
        : undefined,
    notReplaced: (fallback.notReplaced ?? [])
      .filter((n) => !fallback.message.includes(n.reason))
      .map((n) => `${n.name}: ${n.reason}`),
  }
}

/**
 * The two runs a fallback attempt holds, the one its result reports first: the
 * stable run when it passed, else the run against the pending changes. None
 * without a second run to switch to. Pure.
 */
export function siblingFallbackCheckSets(
  latest:
    | { checks?: VerificationCheckResult[]; siblingFallback?: VerificationSiblingFallback }
    | undefined,
): SiblingFallbackCheckSet[] {
  const fallback = latest?.siblingFallback
  const reported = latest?.checks ?? []
  const set = (
    id: 'stable' | 'live',
    checks: VerificationCheckResult[],
  ): SiblingFallbackCheckSet => ({
    id,
    label: SIBLING_FALLBACK_CHECK_SET_LABELS[id],
    checks,
  })
  if (fallback?.outcome === 'stable-passed' && fallback.liveChecks) {
    return [set('stable', reported), set('live', fallback.liveChecks)]
  }
  if (fallback?.outcome === 'stable-failed' && fallback.stableChecks) {
    return [set('live', reported), set('stable', fallback.stableChecks)]
  }
  return []
}

/** The newest finished attempt of any checks step of a run. Pure. */
export function newestChecksEntryId(run: FallbackRun): string | undefined {
  const checkSteps = new Set(
    (run.plan?.steps ?? []).filter((s) => s.kind === 'check').map((s) => s.id),
  )
  for (let i = run.ledger.length - 1; i >= 0; i--) {
    const entry = run.ledger[i]
    if (entry && checkSteps.has(entry.stepId) && entry.status === 'done') return entry.id
  }
  return undefined
}

/**
 * Where a run-chat notice about the checks attempt `entryId` stands on the run
 * as it is now: current while that attempt is the run's newest finished
 * checks attempt, superseded once a newer one finished. Pure.
 */
export function siblingFallbackNoticeState(
  run: FallbackRun | undefined,
  entryId: string,
): SiblingFallbackNoticeState {
  const entry = run?.ledger.find((e) => e.id === entryId)
  if (!run || !entry?.siblingFallback) return { state: 'unknown' }
  const view = siblingFallbackView(entry.siblingFallback)
  const newest = newestChecksEntryId(run)
  if (!newest || newest === entryId) return { state: 'current', view }
  const newer = run.ledger.find((e) => e.id === newest)
  return {
    state: 'superseded',
    view,
    line: newer?.siblingFallback ? SIBLING_FALLBACK_REPLACED : SIBLING_FALLBACK_CLEARED,
  }
}
