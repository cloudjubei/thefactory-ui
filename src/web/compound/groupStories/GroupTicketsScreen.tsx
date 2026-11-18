import { reviewStartedDestination, useGroupTickets } from '../../../headless'
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
}

/** A group's Tickets tab: its Jira tickets, to discuss, take or review — from an update its Slack thread brought too. */
export function GroupTicketsScreen({
  groupId,
  onOpenStory,
  onOpenChat,
  onOpenSettings,
  onOpenRun,
}: GroupTicketsScreenProps) {
  const {
    view,
    query,
    setQuery,
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
        onDiscuss={(key) => open(discuss(key))}
        onPlan={(key) => open(plan(key))}
        onReview={openReview}
        onDismissOffer={dismissOffer}
        onOpenStory={onOpenStory}
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
          onStart={() =>
            void startReview().then((started) => {
              if (!started) return
              const to = reviewStartedDestination(started)
              if (to.kind === 'run' && onOpenRun) onOpenRun(to.runId)
              else onOpenChat(started.context)
            })
          }
          onClose={closeReview}
        />
      ) : null}
    </div>
  )
}
