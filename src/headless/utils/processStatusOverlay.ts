import type { ProcessRun } from 'thefactory-tools/types'
import { processRunDecision } from 'thefactory-tools/utils'

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
 * A finished (succeeded / cancelled) or absent run yields no overlay — the stored
 * status stands and the row shows its normal Run affordance. So does a run a
 * person ended — rejected, sent back or abandoned: its features are pending again,
 * and the next step is a new run, not this one.
 */
export type ProcessStatusOverlay = {
  label: string
  semantic: StatusSemanticKey
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
      return { label: 'Crunching', semantic: 'working', runId: run.id }
    case 'parked':
      return isReviewable(run)
        ? { label: 'Reviewable', semantic: 'review', runId: run.id }
        : { label: 'Blocked', semantic: 'stuck', runId: run.id }
    case 'failed':
      return endedByPerson(run) ? undefined : { label: 'Blocked', semantic: 'stuck', runId: run.id }
    default:
      // succeeded / cancelled — the process is over; the stored status stands.
      return undefined
  }
}

function endedByPerson(
  run: Pick<ProcessRun, 'status'> & Partial<Pick<ProcessRun, 'plan' | 'ledger'>>,
) {
  if (!run.plan || !run.ledger) return false
  const decision = processRunDecision({ status: run.status, plan: run.plan, ledger: run.ledger })
  return decision.kind === 'not-accepted' && decision.choice !== undefined
}
