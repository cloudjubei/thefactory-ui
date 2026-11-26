import { useMemo } from 'react'

import { useAppSettings } from '../contexts/AppSettingsContext'
import { useChats } from '../contexts/createChatsContext'
import { processRunChatNewsOf } from '../utils/chatChannel'
import type { ProcessRunChatNews } from '../utils/chatChannelTypes'
import type { ChatsSeenMap } from '../utils/chatRowStatus'
import { usePendingAsksByChat } from './usePendingAsksByChat'

/**
 * What each process run's own chat holds for the person, by run id — messages
 * that need them and asks waiting, read at the chat's notification level
 * against the chats the person has seen (`seen`, the platform's store):
 * `processRunChatNewsOf`. What the Processes list and the Processes badge show
 * of a run's chat.
 */
export function useProcessRunChatNews(
  seen: ChatsSeenMap | undefined,
): ReadonlyMap<string, ProcessRunChatNews> {
  const { chats } = useChats()
  const levels = useAppSettings().settings.notifications.chatNotifyLevels
  const pendingAsks = usePendingAsksByChat()
  return useMemo(
    () => processRunChatNewsOf(chats, { seen, pendingAsks, levels }),
    [chats, levels, pendingAsks, seen],
  )
}
