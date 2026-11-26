import type { ReactNode } from 'react'
import { ScrollView } from 'react-native'

import {
  launchAgentPickMetadata,
  useGroupTicketPage,
  useLaunchAgentPick,
  type LaunchModelChipSlot,
} from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import type { ChatAttachmentFile } from '../../../headless/api/chatAttachmentUploadTypes'
import ColleagueReviewPasteBox from './ColleagueReviewPasteBox'
import GroupTicketPage from './GroupTicketPage'
import { ticketReviewClose } from './ReviewCloseControl'
import { openStartedReview } from './GroupTicketsScreen'
import TicketReviewRunCard from './TicketReviewRunCard'

export type GroupTicketPageScreenProps = {
  groupId: string
  ticketKey: string
  onOpenStory: (groupStoryId: string) => void
  onOpenPartStory: (projectId: string, storyId: string) => void
  /** Open a run's page in its project: a review run, or the run a round started as a run is reviewed in. */
  onOpenRun: (projectId: string, runId: string) => void
  /** Open a ticket's chat once it has started, or one of its chats. */
  onOpenChat: (context: ChatContext) => void
  /** The app's model chip — the agent a review round runs on. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** The app's file picker, for a review's screenshots and files; without it only the text goes. */
  pickFiles?: () => Promise<ChatAttachmentFile[]>
}

/** Native peer of web's `GroupTicketPageScreen`: a ticket's page, live, with the paste box its Review opens, and the run working it on top with the run's own card. */
export function GroupTicketPageScreen({
  groupId,
  ticketKey,
  onOpenStory,
  onOpenPartStory,
  onOpenRun,
  onOpenChat,
  renderModelChip,
  pickFiles,
}: GroupTicketPageScreenProps) {
  const { pick, slot } = useLaunchAgentPick()
  const page = useGroupTicketPage(groupId, ticketKey)
  const open = (going: Promise<{ context: ChatContext } | undefined>) => {
    void going.then((started) => {
      if (started) onOpenChat(started.context)
    })
  }
  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled">
        <GroupTicketPage
          state={page.state}
          starting={page.starting}
          busy={page.busy}
          startError={page.startError}
          reviewing={page.reviewing}
          merge={page.merge}
          onApproveAndMerge={page.approveAndMerge}
          onResolveHere={page.resolveHere}
          onAskDeveloper={page.askDeveloper}
          onDiscuss={() => open(page.discuss())}
          onTake={() => open(page.take())}
          onReview={page.review}
          onOpenStory={onOpenStory}
          onOpenPartStory={onOpenPartStory}
          onOpenRun={onOpenRun}
          onOpenChat={onOpenChat}
          onRetry={page.refresh}
          reviewClose={ticketReviewClose(groupId, ticketKey, page.state)}
          {...(page.reviewRun.kind
            ? { runCard: <TicketReviewRunCard reviewRun={page.reviewRun} /> }
            : {})}
        />
      </ScrollView>
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
              openStartedReview(started, onOpenChat, onOpenRun)
              page.refresh()
            })
          }
          onClose={page.closeReview}
          {...(pickFiles ? { pickFiles } : {})}
        />
      ) : null}
    </>
  )
}
