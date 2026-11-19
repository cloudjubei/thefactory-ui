import type { ReactNode } from 'react'
import {
  launchAgentPickMetadata,
  useGroupTicketPage,
  useLaunchAgentPick,
  type LaunchModelChipSlot,
} from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import ColleagueReviewPasteBox from './ColleagueReviewPasteBox'
import GroupTicketPage from './GroupTicketPage'
import { openStartedReview } from './GroupTicketsScreen'

export type GroupTicketPageScreenProps = {
  groupId: string
  ticketKey: string
  /** Back to the Tickets tab; without it the app bar's back stands in. */
  onBack?: () => void
  onOpenStory: (groupStoryId: string) => void
  onOpenPartStory: (projectId: string, storyId: string) => void
  /** Open a run's page: a review run, or the run a round started as. */
  onOpenRun: (projectId: string, runId: string) => void
  /** Open a ticket's chat once it has started, or one of its chats. */
  onOpenChat: (context: ChatContext) => void
  /** The project a round started as a run is in, to open its page. */
  runProjectId?: string
  /** The app's model chip — the agent a review round runs on. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
}

/** A ticket's page, live, with the paste box its Review opens. */
export function GroupTicketPageScreen({
  groupId,
  ticketKey,
  onBack,
  onOpenStory,
  onOpenPartStory,
  onOpenRun,
  onOpenChat,
  runProjectId,
  renderModelChip,
}: GroupTicketPageScreenProps) {
  const { pick, slot } = useLaunchAgentPick()
  const page = useGroupTicketPage(groupId, ticketKey)
  const open = (going: Promise<{ context: ChatContext } | undefined>) => {
    void going.then((started) => {
      if (started) onOpenChat(started.context)
    })
  }
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <GroupTicketPage
        state={page.state}
        starting={page.starting}
        busy={page.busy}
        startError={page.startError}
        reviewing={page.reviewing}
        merge={page.merge}
        onApproveAndMerge={page.approveAndMerge}
        onDiscuss={() => open(page.discuss())}
        onTake={() => open(page.take())}
        onReview={page.review}
        onOpenStory={onOpenStory}
        onOpenPartStory={onOpenPartStory}
        onOpenRun={onOpenRun}
        onOpenChat={onOpenChat}
        onRetry={page.refresh}
        {...(onBack ? { onBack } : {})}
      />
      {page.reviewBox ? (
        <ColleagueReviewPasteBox
          box={page.reviewBox}
          onChange={page.editReview}
          mode={page.reviewMode}
          onModeChange={page.setReviewMode}
          {...(renderModelChip ? { modelChip: renderModelChip(slot) } : {})}
          onStart={() =>
            void page.startReview(launchAgentPickMetadata(pick)).then((started) => {
              if (!started) return
              openStartedReview(
                started,
                onOpenChat,
                runProjectId ? (runId) => onOpenRun(runProjectId, runId) : undefined,
              )
              page.refresh()
            })
          }
          onClose={page.closeReview}
        />
      ) : null}
    </div>
  )
}
