import type { ProcessRun } from 'thefactory-tools/types'
import { PROCESS_RUN_TERMINAL_STATUSES } from 'thefactory-tools/constants'
import { isReviewPushApproval } from './colleagueReviewBranchUpdates'
import { isProcessActionsGate } from './colleagueReviewDecision'
import { processOutsideWaitView } from './processOutsideWait'
import type { ReviewChatSlotKind } from './reviewChatSlotTypes'

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

/**
 * What a review chat shows in its composer's place. While a review run holds
 * the chat, the run's own card whenever it needs the person — its approval,
 * a push to approve, a reply it waited for — and nothing else, as the run
 * starts its own next round. In an inline review, the reply waiting to start
 * the next round. Pure.
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
    return undefined
  }
  if (runHolds) return undefined
  return replyWaits ? 'reply' : undefined
}
