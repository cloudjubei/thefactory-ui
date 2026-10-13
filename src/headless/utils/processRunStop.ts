import {
  processManagerDependencyLabel,
  processRunManagerParkState,
  processRunStopHolder,
} from 'thefactory-tools/utils'
import type { ProcessRun } from 'thefactory-tools/types'

import { PROCESS_RUN_MANAGER_LINE } from './processRunStopConstants'

/** What stopped, as the manager's line names it: what an agent asked, else the step. */
function stopWhat(run: Pick<ProcessRun, 'park' | 'plan'>): string {
  const park = run.park
  if (park?.ask) return park.ask.title
  return run.plan.steps.find((s) => s.id === park?.stepId)?.name ?? park?.message ?? ''
}

/**
 * The line a run says while its agent manager has its stop — looking at what
 * stopped, or holding it until what it waits for is brought in — in place of
 * what it needs from the person. `undefined` once the stop is the person's,
 * or the run is not stopped. Pure.
 */
export function processRunManagerLine(run: ProcessRun, now: number): string | undefined {
  if (processRunStopHolder(run, now) !== 'manager') return undefined
  const hold = run.manager?.hold
  if (hold && processRunManagerParkState(run, now) === 'holding') {
    return PROCESS_RUN_MANAGER_LINE.holding(processManagerDependencyLabel(hold.dependsOn))
  }
  return PROCESS_RUN_MANAGER_LINE.looking(stopWhat(run))
}
