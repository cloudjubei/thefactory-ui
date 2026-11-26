import type { ReactNode } from 'react'
import { ScrollView } from 'react-native'

import {
  launchAgentPickMetadata,
  reviewStartedDestination,
  useGroupTickets,
  useLaunchAgentPick,
  type ColleagueReviewStarted,
  type LaunchModelChipSlot,
  type TicketRunOpen,
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
  /** Open a run's page in its project: the run working a ticket, or the run a round started as a run is reviewed in. */
  onOpenRun: (projectId: string, runId: string) => void
  /** The app's file picker, for a review's screenshots and files; without it only the text goes. */
  pickFiles?: () => Promise<ChatAttachmentFile[]>
  /** Open a ticket's page: what a press on its row does. */
  onOpenTicket: (ticketKey: string) => void
  /** The app's model chip — the agent a review round runs on. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
}

/** Open a started round where it is reviewed: its run, which has no chat of the ticket's, else its review chat. */
export function openStartedReview(
  started: ColleagueReviewStarted,
  onOpenChat: (context: ChatContext) => void,
  onOpenRun: (projectId: string, runId: string) => void,
): void {
  const to = reviewStartedDestination(started)
  if (to.kind === 'run') onOpenRun(to.projectId, to.runId)
  else onOpenChat(to.context)
}

/** Open the run working a ticket: a project's run on its page, a group run on its group story. */
export function openTicketRun(
  open: TicketRunOpen,
  onOpenStory: (groupStoryId: string) => void,
  onOpenRun: (projectId: string, runId: string) => void,
): void {
  if (open.kind === 'group-run') onOpenStory(open.groupStoryId)
  else onOpenRun(open.projectId, open.runId)
}

/** Native peer of web's `GroupTicketsScreen`: a group's Jira tickets by tab, to open, discuss, take or review, each saying the run working it, live. */
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
          onOpenRun={(open) => openTicketRun(open, onOpenStory, onOpenRun)}
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
