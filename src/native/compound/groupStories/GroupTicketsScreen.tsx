import { ScrollView } from 'react-native'

import { reviewStartedDestination, useGroupTickets } from '../../../headless'
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
}

/** Native peer of web's `GroupTicketsScreen`: a group's Jira tickets, to discuss, take or review. */
export function GroupTicketsScreen({
  groupId,
  onOpenStory,
  onOpenChat,
  onOpenSettings,
  onOpenRun,
  pickFiles,
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
    <>
      <ScrollView keyboardShouldPersistTaps="handled">
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
      </ScrollView>
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
          {...(pickFiles ? { pickFiles } : {})}
        />
      ) : null}
    </>
  )
}
