import type { ProcessRun } from 'thefactory-tools/types'
import {
  processBaseMovedNote,
  processBaseUpdateSummary,
  processRunParkChoices,
} from 'thefactory-tools/utils'

import { PROCESS_BASE_MOVED_COPY } from './processBaseMovedViewConstants'
import type { ProcessBaseMovedView } from './processBaseMovedViewTypes'

/**
 * What a run's "Base branch" section in "More about this run" shows: its
 * one-line headline, that the base has moved on and what that means, the
 * choice to bring it in while its park offers that, and the newest time it
 * was brought in. `undefined` when there is nothing to say.
 * Pure: no React, no I/O.
 */
export function processBaseMovedView(
  run: Pick<ProcessRun, 'park' | 'plan' | 'ledger' | 'workBranch' | 'baseMoved' | 'baseUpdates'>,
): ProcessBaseMovedView | undefined {
  const offered = processRunParkChoices(run).find((c) => c.choice === 'update-base')
  const choice =
    offered?.choice === 'update-base' ? { ...offered, choice: offered.choice } : undefined
  const updates = run.baseUpdates ?? []
  const newest = updates.at(-1)
  const lastUpdate = newest ? processBaseUpdateSummary(newest) : undefined
  if (run.baseMoved && run.baseMoved.commits > 0) {
    const note = processBaseMovedNote(run.baseMoved)
    return {
      note,
      headline: note,
      meaning: PROCESS_BASE_MOVED_COPY.meaning(run.baseMoved.commits),
      choice,
      lastUpdate,
    }
  }
  if (!newest) return undefined
  return {
    note: undefined,
    headline: PROCESS_BASE_MOVED_COPY.broughtIn(newest.baseRef, updates.length),
    meaning: undefined,
    choice,
    lastUpdate,
  }
}
