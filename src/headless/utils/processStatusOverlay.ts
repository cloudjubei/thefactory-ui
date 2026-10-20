import type { ProcessRun } from 'thefactory-tools/types'
import { isProcessRunAwaitingIntegration, processRunStopHolder } from 'thefactory-tools/utils'

import { isProcessRunActive } from './processRunCurrent'
import { processRunPersonEnding } from './processView'
import {
  PROCESS_STATUS_OVERLAY_BRINGING_IN,
  PROCESS_STATUS_OVERLAY_NOT_LANDED,
  PROCESS_STATUS_OVERLAY_TITLES,
} from './processStatusOverlayConstants'
import type { StatusSemanticKey } from './status'

/**
 * A story/feature's live PROCESS state, overlaid on its stored status.
 *
 * The stored status says where the work is — Reviewable once verified, Done only
 * once signed off — but it cannot link anywhere. This derives, from the story's
 * process run, the word to show and the run to jump to:
 *   - stopped with its agent manager on it (`processRunStopHolder`) → Working
 *   - parked at the sign-off gate  → Reviewable (go decide the sign-off)
 *   - running / pending            → Working (watch the ongoing run)
 *   - parked for any other reason, or failed → Blocked (it is stuck; go unstick it)
 *   - ended on a request for changes → Changes requested (open it to send it back)
 *   - approved, its work not landed → Not merged (open it to bring it in)
 *   - approved, its work being brought in → Merging (Bringing in without git)
 * A finished (cancelled, or succeeded with its work landed) or absent run yields no overlay — the stored
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
 * that follows "Working" and precedes "Done", and the one its verified
 * features are stored in. A gate is always a review point, so this does not
 * require a `storyId` (the pipeline still gates the story sign-off UI on
 * `storyId` separately). Pure.
 */
export function isReviewable(run: Pick<ProcessRun, 'status' | 'park'> | undefined): boolean {
  return run?.status === 'parked' && run.park?.reason === 'gate'
}

export function processStatusOverlay(
  run:
    | (Pick<ProcessRun, 'id' | 'status' | 'park'> &
        Partial<
          Pick<
            ProcessRun,
            'plan' | 'ledger' | 'workBranch' | 'parentRunId' | 'integration' | 'manager' | 'input'
          >
        >)
    | undefined,
  now: number,
): ProcessStatusOverlay | undefined {
  if (!run) return undefined
  if (processRunStopHolder(run, now) === 'manager') {
    return {
      label: 'Working',
      semantic: 'working',
      title: PROCESS_STATUS_OVERLAY_TITLES.managerOnIt,
      runId: run.id,
    }
  }
  switch (run.status) {
    case 'running':
    case 'pending':
      return {
        label: 'Working',
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
    case 'succeeded':
      return landingOverlay(run)
    default:
      return undefined
  }
}

/**
 * The overlay a story's ROOT process run puts on ONE of its features — the
 * same chip as the story's ({@link processStatusOverlay}), scoped to the
 * feature the run is acting on:
 *   - only a feature in the run's plan (a step whose `subject` is that
 *     feature) ever gets one; any other feature keeps its stored status;
 *   - while the run's cursor is on a feature's step — its pipeline building it,
 *     stopped on it, or the manager on it — ONLY that feature shows it, and the
 *     features still queued behind it show nothing;
 *   - while the cursor is on any other step (walkthrough, code review, the
 *     sign-off gate, merging) the run is acting on all of them, so every plan
 *     feature shows it;
 *   - a run with no cursor — ended, or not yet on its first step — shows on no
 *     feature: its ending (Not merged, Changes requested…) is the story's, on
 *     the story's own chip.
 * Pure.
 */
export function featureProcessOverlay(
  run:
    | (Parameters<typeof processStatusOverlay>[0] & Partial<Pick<ProcessRun, 'cursor'>>)
    | undefined,
  featureId: string,
  now: number,
): ProcessStatusOverlay | undefined {
  if (!run || !planCarriesFeature(run, featureId)) return undefined
  const stepId = run.cursor?.stepId
  if (stepId === undefined) return undefined
  const subject = run.plan?.steps.find((s) => s.id === stepId)?.subject
  if (subject?.kind === 'feature' && subject.id !== featureId) return undefined
  return processStatusOverlay(run, now)
}

/**
 * Whether a feature is in a story's LIVE process run — still pending, running
 * or parked (`isProcessRunActive`, the same statuses {@link processStatusOverlay}
 * reads as Working, Reviewable or Blocked) — and in its plan, by the same
 * membership {@link featureProcessOverlay} uses. Queued, being worked, or behind
 * a story-level step, the run already covers the feature, so nothing offers to
 * run it on its own. An ended run, or a feature it does not carry, leaves the
 * feature's own Run in place. Pure.
 */
export function isFeatureInLiveRun(
  run:
    | (Pick<ProcessRun, 'status'> & Partial<Pick<ProcessRun, 'plan' | 'withdrawnFeatureIds'>>)
    | undefined,
  featureId: string,
): boolean {
  return run !== undefined && isProcessRunActive(run) && planCarriesFeature(run, featureId)
}

function planCarriesFeature(
  run: Partial<Pick<ProcessRun, 'plan' | 'withdrawnFeatureIds'>>,
  featureId: string,
): boolean {
  if (run.withdrawnFeatureIds?.includes(featureId)) return false
  return (run.plan?.steps ?? []).some(
    (s) => s.subject?.kind === 'feature' && s.subject.id === featureId,
  )
}

function blocked(runId: string): ProcessStatusOverlay {
  return { label: 'Blocked', semantic: 'stuck', title: PROCESS_STATUS_OVERLAY_TITLES.stuck, runId }
}

function landingOverlay(
  run: Pick<ProcessRun, 'id' | 'status'> &
    Partial<Pick<ProcessRun, 'plan' | 'ledger' | 'workBranch' | 'parentRunId' | 'integration'>>,
): ProcessStatusOverlay | undefined {
  if (run.integration?.status === 'integrating') {
    return {
      label: run.workBranch?.shadow
        ? PROCESS_STATUS_OVERLAY_BRINGING_IN.shadow
        : PROCESS_STATUS_OVERLAY_BRINGING_IN.git,
      semantic: 'working',
      title: PROCESS_STATUS_OVERLAY_TITLES.landing,
      runId: run.id,
    }
  }
  if (!run.plan || !run.ledger) return undefined
  const awaiting = isProcessRunAwaitingIntegration({ ...run, plan: run.plan, ledger: run.ledger })
  if (!awaiting) return undefined
  return {
    label: run.workBranch?.shadow
      ? PROCESS_STATUS_OVERLAY_NOT_LANDED.shadow
      : PROCESS_STATUS_OVERLAY_NOT_LANDED.git,
    semantic: 'onhold',
    title: PROCESS_STATUS_OVERLAY_TITLES.notLanded,
    runId: run.id,
  }
}
