import { ScrollView } from 'react-native'

import { useGroupTickets, type TicketPlanStarted } from '../../../headless'
import type { ChatContext } from '../../../headless/api'
import GroupTicketsList from './GroupTicketsList'

export type GroupTicketsScreenProps = {
  groupId: string
  onOpenStory: (groupStoryId: string) => void
  onOpenChat: (context: ChatContext) => void
  onOpenSettings: () => void
}

/** Native peer of web's `GroupTicketsScreen`: a group's Jira tickets, to discuss or take. */
export function GroupTicketsScreen({
  groupId,
  onOpenStory,
  onOpenChat,
  onOpenSettings,
}: GroupTicketsScreenProps) {
  const { view, query, setQuery, discuss, plan, loadMore, refresh } = useGroupTickets(groupId)
  const open = (going: Promise<TicketPlanStarted | undefined>) => {
    void going.then((started) => {
      if (started) onOpenChat(started.context)
    })
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <GroupTicketsList
        view={view}
        query={query}
        onQueryChange={setQuery}
        onDiscuss={(key) => open(discuss(key))}
        onPlan={(key) => open(plan(key))}
        onOpenStory={onOpenStory}
        onOpenSettings={onOpenSettings}
        onRetry={() => void refresh()}
        onLoadMore={(name) => void loadMore(name)}
      />
    </ScrollView>
  )
}
