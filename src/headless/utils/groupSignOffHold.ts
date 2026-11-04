import type { ProcessRun } from 'thefactory-tools/types'
import { isProcessGroupLegHeld } from 'thefactory-tools/utils'

import { GROUP_BUILD_MODE_INPUT_KEY } from './groupSignOffConstants'

/**
 * Whether a run is a leg held at its sign-off for its group's one decision: its
 * own stop asks nothing of anyone. Pure.
 */
export function isHeldForGroupSignOff(
  run: Pick<ProcessRun, 'input' | 'status' | 'park' | 'plan'>,
): boolean {
  return run.input?.[GROUP_BUILD_MODE_INPUT_KEY] === 'on-branch' && isProcessGroupLegHeld(run)
}
