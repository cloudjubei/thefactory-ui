import type { ProcessRun } from 'thefactory-tools/types'

import { formatCostUSD } from './costDetails'
import { PROCESS_STEP_SPEND_CHIP, PROCESS_STEP_SPEND_TITLE } from './processStepSpendViewConstants'

/**
 * The run head's chip for the most one step of the run may spend, beside its
 * turn limit — `undefined` for a run whose steps may spend as they need. Pure.
 */
export function processRunStepSpendChip(
  run: Pick<ProcessRun, 'budget'>,
): { label: string; title: string } | undefined {
  const amount = formatCostUSD(run.budget?.stepSpendUsdCap)
  return amount
    ? { label: PROCESS_STEP_SPEND_CHIP(amount), title: PROCESS_STEP_SPEND_TITLE }
    : undefined
}
