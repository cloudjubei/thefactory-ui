import { PROCESS_RUN_TERMINAL_STATUSES } from 'thefactory-tools/constants'
import type { ProcessRun, ProcessRunPendingChange } from 'thefactory-tools/types'
import { processRunChangesStartRefusal } from 'thefactory-tools/utils'
import {
  RUN_PENDING_CHANGES_START_HINT,
  RUN_PENDING_CHANGE_ADDED,
  RUN_PENDING_CHANGE_RERUN,
  RUN_PENDING_CHANGE_REWORKED,
} from './runPendingChangesViewConstants'
import type { RunPendingChangeItem, RunPendingChangesView } from './runPendingChangesViewTypes'

function pendingChangeItem(change: ProcessRunPendingChange): RunPendingChangeItem {
  const { id, summary } = change
  if (change.kind === 'step-rerun') {
    return {
      id,
      featureId: undefined,
      name: RUN_PENDING_CHANGE_RERUN(change.title),
      kindWord: undefined,
      summary,
    }
  }
  return {
    id,
    featureId: change.featureId,
    name: change.title,
    kindWord:
      change.kind === 'feature-added' ? RUN_PENDING_CHANGE_ADDED : RUN_PENDING_CHANGE_REWORKED,
    summary,
  }
}

/**
 * The changes waiting on a run as its pipeline shows them: each by feature and
 * kind, or a step re-run by its step, and the one button that starts exactly
 * those — or why it cannot yet.
 * `undefined` when nothing waits or the run has ended.
 */
export function runPendingChangesView(run: ProcessRun): RunPendingChangesView | undefined {
  const waiting = run.pendingChanges ?? []
  if (waiting.length === 0 || PROCESS_RUN_TERMINAL_STATUSES.includes(run.status)) return undefined
  const refusal = processRunChangesStartRefusal(run)
  const one = waiting.length === 1
  return {
    headline: `${waiting.length} change${one ? '' : 's'} waiting to start`,
    items: waiting.map(pendingChangeItem),
    changeIds: waiting.map((c) => c.id),
    startLabel: one ? 'Start work on this change' : `Start work on ${waiting.length} changes`,
    canStart: refusal === undefined,
    hint: refusal ?? RUN_PENDING_CHANGES_START_HINT,
  }
}
