import type { ProcessDroppedChangeAcceptedRow, ProcessRun } from 'thefactory-tools/types'
import { processDroppedChangeAcceptedRows } from 'thefactory-tools/utils'

import { PROCESS_DROPPED_CHANGE_WHO } from './processDroppedChangeConstants'

/**
 * One row per file a merge into the run's work branch was accepted dropping a
 * side of, oldest first, worded for the person who accepted it. Pure.
 */
export function processDroppedChangeRows(
  run: Partial<Pick<ProcessRun, 'droppedChangesAccepted' | 'workBranch'>>,
): ProcessDroppedChangeAcceptedRow[] {
  return processDroppedChangeAcceptedRows(run, PROCESS_DROPPED_CHANGE_WHO)
}
