import { useGroupTickets } from '../../../headless'
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
}

/** A group's Tickets tab: its Jira tickets, to discuss, take or review. */
export function GroupTicketsScreen({
  groupId,
  onOpenStory,
  onOpenChat,
  onOpenSettings,
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
    closeReview,
    editReview,
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
        onOpenStory={onOpenStory}
        onOpenSettings={onOpenSettings}
        onRetry={() => void refresh()}
        onLoadMore={(name) => void loadMore(name)}
      />
      {reviewBox ? (
        <ColleagueReviewPasteBox
          box={reviewBox}
          onChange={editReview}
          onStart={() => open(startReview())}
          onClose={closeReview}
        />
      ) : null}
    </div>
  )
}
