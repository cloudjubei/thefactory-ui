import type { ProcessRun } from 'thefactory-tools/types'
import { RUN_CARRIED_OUT_CHANGES_TITLE } from './runCarriedOutChangesViewConstants'
import {
  RUN_PENDING_CHANGE_ADDED,
  RUN_PENDING_CHANGE_REWORKED,
} from './runPendingChangesViewConstants'
import type { RunCarriedOutChangesView } from './runCarriedOutChangesViewTypes'

/**
 * The feature edits a run carried out itself, oldest first, each by feature and kind — shown on
 * the sign-off beside the changes still waiting. `undefined` when it carried out none.
 */
export function runCarriedOutChangesView(run: ProcessRun): RunCarriedOutChangesView | undefined {
  const done = run.carriedOutChanges ?? []
  if (done.length === 0) return undefined
  return {
    title: RUN_CARRIED_OUT_CHANGES_TITLE,
    items: done.map(({ change }) => ({
      id: change.id,
      featureId: change.featureId,
      name: change.title,
      kindWord:
        change.kind === 'feature-added' ? RUN_PENDING_CHANGE_ADDED : RUN_PENDING_CHANGE_REWORKED,
      summary: change.summary,
    })),
  }
}
