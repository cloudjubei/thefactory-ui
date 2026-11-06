import { useMemo } from 'react'
import type { Chat, ChatContext } from '../api'
import { chatContextTickets } from '../utils/groupTickets'
import type { TicketChipView } from '../utils/groupTicketTypes'
import { useStoryGroupStories } from './useStoryGroupStories'

/** The tickets a chat is about, for its context dropdown, kept current as group stories change. */
export function useChatContextTickets(
  context: ChatContext,
  chat: Pick<Chat, 'metadata'> | null | undefined,
): TicketChipView[] {
  const { projectId, storyId } = context as { projectId?: string; storyId?: string }
  const memberships = useStoryGroupStories(projectId, storyId)
  const metadata = chat?.metadata
  return useMemo(() => chatContextTickets({ metadata, memberships }), [metadata, memberships])
}
