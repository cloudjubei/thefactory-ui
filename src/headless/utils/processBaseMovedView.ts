import type { ProcessRun } from 'thefactory-tools/types'
import {
  processBaseMovedNote,
  processBaseUpdateSummary,
  processRunParkChoices,
} from 'thefactory-tools/utils'

import type { ProcessBaseMovedView } from './processBaseMovedViewTypes'

/**
 * What a run shows about its base branch, beside its pipeline: that the base
 * has moved on, the choice to bring it in while its park offers that, and the
 * newest time it was brought in. `undefined` when there is nothing to say.
 * Pure: no React, no I/O.
 */
export function processBaseMovedView(
  run: Pick<ProcessRun, 'park' | 'plan' | 'ledger' | 'workBranch' | 'baseMoved' | 'baseUpdates'>,
): ProcessBaseMovedView | undefined {
  const note =
    run.baseMoved && run.baseMoved.commits > 0 ? processBaseMovedNote(run.baseMoved) : undefined
  const offered = processRunParkChoices(run).find((c) => c.choice === 'update-base')
  const choice =
    offered?.choice === 'update-base' ? { ...offered, choice: offered.choice } : undefined
  const newest = run.baseUpdates?.at(-1)
  const lastUpdate = newest ? processBaseUpdateSummary(newest) : undefined
  if (!note && !lastUpdate) return undefined
  return { note, choice, lastUpdate }
}
