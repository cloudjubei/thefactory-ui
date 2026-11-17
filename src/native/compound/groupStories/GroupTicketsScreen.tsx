import { ScrollView } from 'react-native'

import { useGroupTickets } from '../../../headless'
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
  /** The app's file picker, for a review's screenshots and files; without it only the text goes. */
  pickFiles?: () => Promise<ChatAttachmentFile[]>
}

/** Native peer of web's `GroupTicketsScreen`: a group's Jira tickets, to discuss, take or review. */
export function GroupTicketsScreen({
  groupId,
  onOpenStory,
  onOpenChat,
  onOpenSettings,
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
          onStart={() => open(startReview())}
          onClose={closeReview}
          {...(pickFiles ? { pickFiles } : {})}
        />
      ) : null}
    </>
  )
}
