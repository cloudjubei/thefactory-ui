import type { ProcessRun } from 'thefactory-tools/types'

import type { StatusSemanticKey } from './status'

/**
 * A story/feature's live PROCESS state, overlaid on its stored status.
 *
 * A story is "Done" as a record long before its process has been signed off, and
 * the stored status can't express "waiting for you at the sign-off gate" or link
 * anywhere. This derives, from the story's process run, the word to show and the
 * run to jump to:
 *   - parked at the sign-off gate  → Review   (go decide the sign-off)
 *   - running / pending            → Crunching (watch the ongoing run)
 *   - parked for any other reason, or failed → Blocked (it is stuck; go unstick it)
 * A finished (succeeded / cancelled) or absent run yields no overlay — the stored
 * status stands and the row shows its normal Run affordance.
 */
export type ProcessStatusOverlay = {
  label: string
  semantic: StatusSemanticKey
  /** The process run to open — the whole-story pipeline. */
  runId: string
}

export function processStatusOverlay(
  run: Pick<ProcessRun, 'id' | 'status' | 'park'> | undefined,
): ProcessStatusOverlay | undefined {
  if (!run) return undefined
  switch (run.status) {
    case 'running':
    case 'pending':
      return { label: 'Crunching', semantic: 'working', runId: run.id }
    case 'parked':
      return run.park?.reason === 'gate'
        ? { label: 'Review', semantic: 'review', runId: run.id }
        : { label: 'Blocked', semantic: 'stuck', runId: run.id }
    case 'failed':
      return { label: 'Blocked', semantic: 'stuck', runId: run.id }
    default:
      // succeeded / cancelled — the process is over; the stored status stands.
      return undefined
  }
}
