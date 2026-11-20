import type { ProcessRun } from 'thefactory-tools/types'
import { PROCESS_RUN_TERMINAL_STATUSES } from 'thefactory-tools/constants'
import { isReviewPushApproval } from './colleagueReviewBranchUpdates'
import { isProcessActionsGate } from './colleagueReviewDecision'
import { reviewMergeView } from './colleagueReviewMerge'
import type { ReviewMergeJob } from './colleagueReviewMergeTypes'
import { processOutsideWaitView } from './processOutsideWait'
import { processRunBadge } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'
import type { ReviewChatSlotKind, ReviewRunWorkingView } from './reviewChatSlotTypes'
import { TICKET_RUN_NAMES } from './ticketRunStateConstants'

type RunRow = Pick<ProcessRun, 'id' | 'status' | 'chatContextId' | 'ticketReview'>

/** The newest colleague review run of a chat still going, from runs newest first. Pure. */
export function reviewChatLiveRun<R extends RunRow>(
  runs: readonly R[],
  chatContextId: string | undefined,
): R | undefined {
  if (!chatContextId) return undefined
  return runs.find(
    (run) =>
      run.chatContextId === chatContextId &&
      run.ticketReview !== undefined &&
      !PROCESS_RUN_TERMINAL_STATUSES.includes(run.status),
  )
}

/** The step a run works on now, from its plan. */
const currentStep = (run: Pick<ProcessRun, 'cursor' | 'plan'>) =>
  run.plan.steps.find((step) => step.id === run.cursor?.stepId)

/** Whether a run works on a step of its own, off the chat: nothing in the chat shows what it does. */
const worksOffChat = (run: ProcessRun) =>
  run.status === 'running' && currentStep(run) !== undefined && currentStep(run)?.inChat !== true

/**
 * What a review chat shows in its composer's place. While a review run holds
 * the chat, the run's own card whenever it needs the person — its approval,
 * a push to approve, a reply it waited for — and while it works on a step
 * off the chat, its working card, so the chat is never blank while it goes;
 * nothing while its step works in the chat itself. In an inline review, the
 * reply waiting to start the next round. Pure.
 */
export function reviewChatSlotKind(
  run: ProcessRun | undefined,
  replyWaits: boolean,
  runHolds: boolean,
): ReviewChatSlotKind | undefined {
  if (run) {
    if (isReviewPushApproval(run)) return 'run-push'
    if (run.ticketReview && isProcessActionsGate(run)) return 'run-decision'
    if (processOutsideWaitView(run)) return 'run-outside'
    return worksOffChat(run) ? 'run-working' : undefined
  }
  if (runHolds) return undefined
  return replyWaits ? 'reply' : undefined
}

/** When the run's pass at this round began: a merge from before it is an earlier round's. */
function passStart(run: ProcessRun): number {
  const iteration = run.cursor?.iteration
  const starts = run.ledger.filter((e) => e.iteration === iteration).map((e) => e.startedAt)
  return starts.length > 0 ? Math.min(...starts) : run.startedAt
}

/**
 * A review run's working card: the step it is on with its badge, and — once
 * this pass at the round approved and merged — that merge pull request by
 * pull request, staying as it ended while the run carries on. Pure.
 */
export function reviewRunWorkingView(
  run: ProcessRun,
  job: ReviewMergeJob | null | undefined,
  now: number,
): ReviewRunWorkingView {
  const ours =
    job && job.round === run.ticketReview?.round && Date.parse(job.startedAt) >= passStart(run)
  const view = ours ? reviewMergeView({ job, prs: [] }) : undefined
  return {
    name: TICKET_RUN_NAMES.review,
    step: currentStep(run)?.name ?? PROCESS_RUN_WORDS.starting,
    badge: processRunBadge(run, now),
    ...(view ? { merge: { prs: [], view, starting: false } } : {}),
  }
}
