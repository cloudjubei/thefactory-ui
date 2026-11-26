import type { ReactNode } from 'react'

import {
  launchAgentPickMetadata,
  useLaunchAgentPick,
  type LaunchModelChipSlot,
  type UseReviewChatSlot,
} from '../../../headless'
import { TicketRunLine } from '../groupStories/TicketRunState'
import ReviewReplyComposerCard from './ReviewReplyComposerCard'

export type ReviewChatSlotProps = {
  slot: UseReviewChatSlot
  /** The app's model chip for this chat: the agent an inline round runs on. */
  renderModelChip?: ((picked: LaunchModelChipSlot) => ReactNode) | undefined
  /** Open the run's page. */
  onOpenRun?: ((projectId: string, runId: string) => void) | undefined
}

/**
 * What an inline review chat shows by its composer. While the ticket's review
 * goes as a run — which never works in this chat — one line saying the run,
 * with Open run, above the composer; the run's own cards are on its page.
 * With no run, the reply waiting to start the next round, in the composer's
 * place; Not now hides it for this view.
 */
export default function ReviewChatSlot({ slot, renderModelChip, onOpenRun }: ReviewChatSlotProps) {
  const { pick, slot: chip } = useLaunchAgentPick()
  const { runLine, reply } = slot
  if (slot.kind === 'run-link' && runLine) {
    return (
      <div className="flex shrink-0 border-t border-(--border-default) bg-(--surface-raised) px-3 py-2">
        <TicketRunLine
          run={runLine}
          {...(onOpenRun
            ? {
                onOpen: (open) => {
                  if (open.kind === 'run') onOpenRun(open.projectId, open.runId)
                },
              }
            : {})}
        />
      </div>
    )
  }
  if (slot.kind !== 'reply' || !reply) return null
  return (
    <div className="flex max-h-[65%] min-h-0 shrink flex-col gap-2 overflow-y-auto border-t border-(--border-default) bg-(--surface-raised) px-3 py-3">
      <ReviewReplyComposerCard
        view={reply}
        starting={slot.starting}
        error={slot.startError}
        {...(renderModelChip ? { modelChip: renderModelChip(chip) } : {})}
        onStart={() => slot.start(launchAgentPickMetadata(pick))}
        onNotNow={slot.notNow}
      />
    </div>
  )
}
