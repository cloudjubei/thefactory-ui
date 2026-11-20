import type { ReactNode } from 'react'
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
import ColleagueReviewPasteBox from './ColleagueReviewPasteBox'
import GroupTicketsList from './GroupTicketsList'

export type GroupTicketsScreenProps = {
  groupId: string
  onOpenStory: (groupStoryId: string) => void
  /** Open a ticket's chat, once it has started — its review chat too. */
  onOpenChat: (context: ChatContext) => void
  /** Open Settings → Group, for a group with no Jira. */
  onOpenSettings: () => void
  /** Open the run a round started as a run is reviewed in; without it the review chat opens. */
  onOpenRun?: (runId: string) => void
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

/** Open the run working a ticket: a project's run on its page, a group run on its group story. */
export function openTicketRun(
  open: TicketRunOpen,
  onOpenStory: (groupStoryId: string) => void,
  onOpenRun?: (runId: string) => void,
): void {
  if (open.kind === 'group-run') onOpenStory(open.groupStoryId)
  else onOpenRun?.(open.runId)
}

/**
 * A group's Tickets tab: its Jira tickets by tab, to open, discuss, take or
 * review — from an update its Slack thread brought too — each saying the run
 * working it, live, with a way to open it. The agent picked for a review
 * stays picked for the next one.
 */
export function GroupTicketsScreen({
  groupId,
  onOpenStory,
  onOpenChat,
  onOpenSettings,
  onOpenRun,
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
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
        />
      ) : null}
    </div>
  )
}
