import type { ReactNode } from 'react'
import { ScrollView } from 'react-native'

import {
  launchAgentPickMetadata,
  reviewStartedDestination,
  useGroupTickets,
  useLaunchAgentPick,
  type ColleagueReviewStarted,
  type LaunchModelChipSlot,
} from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import type { ChatAttachmentFile } from '../../../headless/api/chatAttachmentUploadTypes'
import ColleagueReviewPasteBox from './ColleagueReviewPasteBox'
import GroupTicketsList from './GroupTicketsList'

export type GroupTicketsScreenProps = {
  groupId: string
  onOpenStory: (groupStoryId: string) => void
  /** Open a ticket's chat once it has started — its review chat too. */
  onOpenChat: (context: ChatContext) => void
  onOpenSettings: () => void
  /** Open the run a round started as a run is reviewed in; without it the review chat opens. */
  onOpenRun?: (runId: string) => void
  /** The app's file picker, for a review's screenshots and files; without it only the text goes. */
  pickFiles?: () => Promise<ChatAttachmentFile[]>
  /** Open a ticket's page: what a press on its row does. */
  onOpenTicket: (ticketKey: string) => void
  /** The app's model chip — the agent a review round runs on. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
}

/** Where a started round opens: its run when it is reviewed as one and the host can open runs, else its chat. */
export function openStartedReview(
  started: ColleagueReviewStarted,
  onOpenChat: (context: ChatContext) => void,
  onOpenRun?: (runId: string) => void,
): void {
  const to = reviewStartedDestination(started)
  if (to.kind === 'run' && onOpenRun) onOpenRun(to.runId)
  else onOpenChat(started.context)
}

/** Native peer of web's `GroupTicketsScreen`: a group's Jira tickets by tab, to open, discuss, take or review. */
export function GroupTicketsScreen({
  groupId,
  onOpenStory,
  onOpenChat,
  onOpenSettings,
  onOpenRun,
  pickFiles,
  onOpenTicket,
  renderModelChip,
}: GroupTicketsScreenProps) {
  const { pick, slot } = useLaunchAgentPick()
  const {
    view,
    query,
    setQuery,
    pickTab,
    discuss,
    plan,
    loadMore,
    refresh,
    reviewBox,
    openReview,
    dismissOffer,
    closeReview,
    editReview,
    reviewMode,
    setReviewMode,
    startReview,
  } = useGroupTickets(groupId)
  const open = (going: Promise<{ context: ChatContext } | undefined>) => {
    void going.then((started) => {
      if (started) onOpenChat(started.context)
    })
  }
  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled">
        <GroupTicketsList
          view={view}
          query={query}
          onQueryChange={setQuery}
          onPickTab={pickTab}
          onOpen={onOpenTicket}
          onDiscuss={(key) => open(discuss(key))}
          onPlan={(key) => open(plan(key))}
          onReview={openReview}
          onDismissOffer={dismissOffer}
          onOpenStory={onOpenStory}
          onOpenSettings={onOpenSettings}
          onRetry={() => void refresh()}
          onLoadMore={(name) => void loadMore(name)}
        />
      </ScrollView>
      {reviewBox ? (
        <ColleagueReviewPasteBox
          box={reviewBox}
          onChange={editReview}
          mode={reviewMode}
          onModeChange={setReviewMode}
          {...(renderModelChip ? { modelChip: renderModelChip(slot) } : {})}
          onStart={() =>
            void startReview(launchAgentPickMetadata(pick)).then((started) => {
              if (started) openStartedReview(started, onOpenChat, onOpenRun)
            })
          }
          onClose={closeReview}
          {...(pickFiles ? { pickFiles } : {})}
        />
      ) : null}
    </>
  )
}
