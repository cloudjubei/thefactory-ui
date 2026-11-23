import type { ProcessRun } from 'thefactory-tools/types'

import type { ProcessRunEntry } from './processRunEntryTypes'

/**
 * Where a run's pipeline opens. A feature's run is part of its story run, so it
 * opens inside that run, drilled into — the breadcrumb leads back up — however
 * it was reached. A top run, a variant (shown beside its siblings) and a run
 * not yet loaded open where they were asked for. Pure.
 */
export function processRunEntryOf(
  run: Pick<ProcessRun, 'id' | 'parentRunId' | 'variant'> | undefined,
  runId: string,
): ProcessRunEntry {
  if (!run || run.variant || !run.parentRunId) return { rootId: runId, stack: [] }
  return { rootId: run.parentRunId, stack: [run.id] }
}
