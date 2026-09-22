import type { ProcessRun } from 'thefactory-tools/types'

import type { StatusSemanticKey } from './status'

/**
 * A story/feature's live PROCESS state, overlaid on its stored status.
 *
 * A story is "Done" as a record long before its process has been signed off, and
 * the stored status can't express "waiting for you at the sign-off gate" or link
 * anywhere. This derives, from the story's process run, the word to show and the
 * run to jump to:
 *   - parked at the sign-off gate  → Reviewable (go decide the sign-off)
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

/**
 * Whether a run is parked at its sign-off gate — the "Reviewable" state, the one
 * that follows "Crunching" and precedes "Done". Derived, never a stored status.
 * A gate is always a review point, so this does not require a `storyId` (the
 * pipeline still gates the story sign-off UI on `storyId` separately). Pure.
 */
export function isReviewable(run: Pick<ProcessRun, 'status' | 'park'> | undefined): boolean {
  return run?.status === 'parked' && run.park?.reason === 'gate'
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
      return isReviewable(run)
        ? { label: 'Reviewable', semantic: 'review', runId: run.id }
        : { label: 'Blocked', semantic: 'stuck', runId: run.id }
    case 'failed':
      return { label: 'Blocked', semantic: 'stuck', runId: run.id }
    default:
      // succeeded / cancelled — the process is over; the stored status stands.
      return undefined
  }
}
