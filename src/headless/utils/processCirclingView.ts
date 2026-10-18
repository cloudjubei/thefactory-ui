import type {
  ProcessCircling,
  ProcessLedgerEntry,
  ProcessParkChoice,
  ProcessRun,
} from 'thefactory-tools/types'
import { processCirclingEvidenceLines, processCirclingReasons } from 'thefactory-tools/utils'

import {
  PROCESS_CIRCLING_HINT,
  PROCESS_CIRCLING_HINT_AFTER_MANAGER,
  PROCESS_CIRCLING_LABEL,
} from './processCirclingViewConstants'
import type { ProcessCirclingView } from './processCirclingViewTypes'

/** A flag as it is shown: its name, how it ran out as a sentence, its evidence and what a retry needs. Pure. */
export function processCirclingView(
  circling: ProcessCircling | undefined,
): ProcessCirclingView | undefined {
  if (!circling) return undefined
  const reasons = processCirclingReasons(circling)
  return {
    label: PROCESS_CIRCLING_LABEL,
    headline: `${reasons.charAt(0).toUpperCase()}${reasons.slice(1)}.`,
    evidence: processCirclingEvidenceLines(circling),
    hint: circling.afterManager ? PROCESS_CIRCLING_HINT_AFTER_MANAGER : PROCESS_CIRCLING_HINT,
    afterManager: circling.afterManager === true,
  }
}

/** The flag on the attempt a run is stopped at — its own park, or its mirror of a nested run's. Pure. */
export function processParkCirclingView(
  run: Pick<ProcessRun, 'park'>,
): ProcessCirclingView | undefined {
  return processCirclingView(run.park?.circling)
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

/** Whether trying again here first asks what must be different: the attempt went in circles. Pure. */
export function circlingRetryTakesNote(
  choice: Pick<ProcessParkChoice, 'choice' | 'changeRequired'>,
): boolean {
  return choice.choice === 'retry' && choice.changeRequired === true
}
