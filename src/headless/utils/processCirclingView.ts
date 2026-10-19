import type { ProcessCircling, ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import { processCirclingEvidenceLines, processCirclingReasons } from 'thefactory-tools/utils'

import { PROCESS_CIRCLING_LABEL, PROCESS_CIRCLING_RECOMMENDS } from './processCirclingViewConstants'
import type { ProcessCirclingView } from './processCirclingViewTypes'

/** A flag as it is shown: its name, how it ran out as a sentence, its evidence, and the manager's recommendation when it gave one. Pure. */
export function processCirclingView(
  circling: ProcessCircling | undefined,
  recommendation?: string,
): ProcessCirclingView | undefined {
  if (!circling) return undefined
  const reasons = processCirclingReasons(circling)
  const text = recommendation?.trim()
  return {
    label: PROCESS_CIRCLING_LABEL,
    headline: `${reasons.charAt(0).toUpperCase()}${reasons.slice(1)}.`,
    evidence: processCirclingEvidenceLines(circling),
    ...(text ? { recommendation: { heading: PROCESS_CIRCLING_RECOMMENDS, text } } : {}),
  }
}

/**
 * What the manager recommends for the flagged stop `holder` waits at, read
 * live off the top-level run's record: its hand-off of this stop — or, on a
 * parent's mirror, of the nested run's. Nothing with the manager off, before
 * it handed the stop on, or at a stop not flagged. Pure.
 */
export function processCirclingRecommendation(
  root: Pick<ProcessRun, 'manager'> | undefined,
  holder: Pick<ProcessRun, 'id' | 'park'>,
): string | undefined {
  const park = holder.park
  const escalation = root?.manager?.escalation
  if (!park?.circling || !escalation) return undefined
  const own = escalation.runId === holder.id && escalation.parkedAt === park.parkedAt
  const mirrored = !!park.childRunId && escalation.runId === park.childRunId
  return own || mirrored ? escalation.recommendation : undefined
}

/**
 * The flag on the attempt a run is stopped at — its own park, or its mirror of
 * a nested run's — with the manager's recommendation from `root`, the
 * top-level run that keeps the manager's record. Pure.
 */
export function processParkCirclingView(
  run: Pick<ProcessRun, 'id' | 'park' | 'manager'>,
  root: Pick<ProcessRun, 'manager'> = run,
): ProcessCirclingView | undefined {
  return processCirclingView(run.park?.circling, processCirclingRecommendation(root, run))
}

/**
 * The flag a step's row carries: its newest attempt's, or — for a step whose
 * nested run is stopped on one — the park's mirror of it. Pure.
 */
export function processStepCirclingView(
  run: Pick<ProcessRun, 'park'>,
  stepId: string,
  latest: Pick<ProcessLedgerEntry, 'circling'> | undefined,
): ProcessCirclingView | undefined {
  const mirrored = run.park?.stepId === stepId ? run.park.circling : undefined
  return processCirclingView(latest?.circling ?? mirrored)
}
