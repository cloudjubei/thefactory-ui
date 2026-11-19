import type { ReactNode } from 'react'

import {
  launchAgentPickMetadata,
  processOutsideWaitView,
  REVIEW_REPLY_TEXT,
  useLaunchAgentPick,
  type LaunchModelChipSlot,
  type UseReviewChatSlot,
} from '../../../headless'
import RunOutsideWaitCard from '../process/RunOutsideWaitCard'
import { RunPushApprovalCard, RunReviewDecisionCard } from './ColleagueReviewDecisionCard'
import ReviewReplyComposerCard from './ReviewReplyComposerCard'

export type ReviewChatSlotProps = {
  slot: UseReviewChatSlot
  /** The app's model chip for this chat: the agent an inline round runs on. */
  renderModelChip?: ((picked: LaunchModelChipSlot) => ReactNode) | undefined
  /** Open the run's page. */
  onOpenRun?: ((projectId: string, runId: string) => void) | undefined
}

/**
 * What a review chat shows in its composer's place: its run's decision card,
 * push approval or the reply it waited for — the run's own cards, answered
 * here as on the run's page, with Open run — or, in an inline review, the
 * reply waiting to start the next round. Not now hides it for this view.
 */
export default function ReviewChatSlot({ slot, renderModelChip, onOpenRun }: ReviewChatSlotProps) {
  const { pick, slot: chip } = useLaunchAgentPick()
  const { kind, run, reply } = slot
  if (!kind) return null
  const openRun =
    run && onOpenRun ? (
      <button
        type="button"
        className="text-[12px] text-(--accent-primary) hover:underline"
        onClick={() => onOpenRun(run.projectId, run.id)}
      >
        {REVIEW_REPLY_TEXT.openRun}
      </button>
    ) : null
  const footer = (
    <div className="flex items-center gap-3">
      {openRun}
      <button
        type="button"
        className="ml-auto text-[12px] text-(--text-secondary) hover:underline"
        onClick={slot.notNow}
      >
        {REVIEW_REPLY_TEXT.notNow}
      </button>
    </div>
  )
  const card =
    kind === 'reply' && reply ? (
      <ReviewReplyComposerCard
        view={reply}
        starting={slot.starting}
        error={slot.startError}
        {...(renderModelChip ? { modelChip: renderModelChip(chip) } : {})}
        onStart={() => slot.start(launchAgentPickMetadata(pick))}
        onNotNow={slot.notNow}
      />
    ) : run && kind === 'run-decision' ? (
      <>
        <RunReviewDecisionCard run={run} embedded onAnswer={slot.answerGate} />
        {footer}
      </>
    ) : run && kind === 'run-push' ? (
      <>
        <RunPushApprovalCard run={run} embedded onAnswer={slot.answerGate} />
        {footer}
      </>
    ) : run && kind === 'run-outside' ? (
      <>
        <RunOutsideWaitCard view={processOutsideWaitView(run)!} embedded onCarryOn={slot.carryOn} />
        {footer}
      </>
    ) : null
  if (!card) return null
  return (
    <div className="flex max-h-[65%] min-h-0 shrink flex-col gap-2 overflow-y-auto border-t border-(--border-default) bg-(--surface-raised) px-3 py-3">
      {card}
    </div>
  )
}
