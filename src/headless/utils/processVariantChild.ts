import type { ProcessRun } from 'thefactory-tools/types'
import { processStepStates } from 'thefactory-tools/utils'

import type { ProcessVariantChildView, ProcessVariantStepLog } from './processVariantViewTypes'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import { scriptStepLogView } from './scriptStepLogView'
import { processRunStripEntries } from './stepsStrip'

const NO_CHILD: ProcessVariantChildView = { steps: [], stepLogs: [] }

/**
 * What a variant's own run adds to its lane: its steps as strip entries, and
 * for each script step it reached, that step's log from what the run filed —
 * its recording stays with the variant's other recordings. `tiles` are the run's filings, the step logs' text read. Nothing until the
 * run is read. Pure.
 */
export function processVariantChildView(
  child: ProcessRun | undefined,
  tiles: readonly EvidenceTile[],
): ProcessVariantChildView {
  if (!child) return NO_CHILD
  const stepLogs = processStepStates(child).flatMap((state): ProcessVariantStepLog[] =>
    state.step.kind === 'script' && state.latest
      ? [
          {
            stepId: state.step.id,
            title: state.step.name,
            view: { ...scriptStepLogView(tiles, state.latest), recording: undefined },
          },
        ]
      : [],
  )
  return { steps: processRunStripEntries(child), stepLogs }
}
