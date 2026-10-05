import type { ProcessRun } from 'thefactory-tools/types'

import { processRunPersonEnding } from './processView'
import { PROCESS_STATUS_OVERLAY_TITLES } from './processStatusOverlayConstants'
import type { StatusSemanticKey } from './status'

/**
 * A story/feature's live PROCESS state, overlaid on its stored status.
 *
 * The stored status says where the work is — Reviewable once verified, Done only
 * once signed off — but it cannot link anywhere. This derives, from the story's
 * process run, the word to show and the run to jump to:
 *   - parked at the sign-off gate  → Reviewable (go decide the sign-off)
 *   - running / pending            → Crunching (watch the ongoing run)
 *   - parked for any other reason, or failed → Blocked (it is stuck; go unstick it)
 *   - ended on a request for changes → Changes requested (open it to send it back)
 * A finished (succeeded / cancelled) or absent run yields no overlay — the stored
 * status stands and the row shows its normal Run affordance. So does a run a
 * person rejected or abandoned: its features are pending again, and the next
 * step is a new run, not this one.
 */
export type ProcessStatusOverlay = {
  label: string
  semantic: StatusSemanticKey
  /** What pressing the chip does, for its tooltip. */
  title: string
  /** The process run to open — the whole-story pipeline. */
  runId: string
}

/**
 * Whether a run is parked at its sign-off gate — the "Reviewable" state, the one
 * that follows "Crunching" and precedes "Done", and the one its verified
 * features are stored in. A gate is always a review point, so this does not
 * require a `storyId` (the pipeline still gates the story sign-off UI on
 * `storyId` separately). Pure.
 */
export function isReviewable(run: Pick<ProcessRun, 'status' | 'park'> | undefined): boolean {
  return run?.status === 'parked' && run.park?.reason === 'gate'
}

export function processStatusOverlay(
  run:
    | (Pick<ProcessRun, 'id' | 'status' | 'park'> & Partial<Pick<ProcessRun, 'plan' | 'ledger'>>)
    | undefined,
): ProcessStatusOverlay | undefined {
  if (!run) return undefined
  switch (run.status) {
    case 'running':
    case 'pending':
      return {
        label: 'Crunching',
        semantic: 'working',
        title: PROCESS_STATUS_OVERLAY_TITLES.working,
        runId: run.id,
      }
    case 'parked':
      return isReviewable(run)
        ? {
            label: 'Reviewable',
            semantic: 'review',
            title: PROCESS_STATUS_OVERLAY_TITLES.review,
            runId: run.id,
          }
        : blocked(run.id)
    case 'failed': {
      const ending =
        run.plan && run.ledger
          ? processRunPersonEnding({ status: run.status, plan: run.plan, ledger: run.ledger })
          : undefined
      if (!ending) return blocked(run.id)
      return ending.choice === 'request-changes'
        ? {
            label: ending.label,
            semantic: 'onhold',
            title: PROCESS_STATUS_OVERLAY_TITLES.changesRequested,
            runId: run.id,
          }
        : undefined
    }
    default:
      // succeeded / cancelled — the process is over; the stored status stands.
      return undefined
  }
}

function blocked(runId: string): ProcessStatusOverlay {
  return { label: 'Blocked', semantic: 'stuck', title: PROCESS_STATUS_OVERLAY_TITLES.stuck, runId }
}
