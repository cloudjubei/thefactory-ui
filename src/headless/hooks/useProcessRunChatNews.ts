import { useMemo } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'

import { useAppSettings } from '../contexts/AppSettingsContext'
import { useChats } from '../contexts/createChatsContext'
import { chatChannelOf, processRunChatNewsByRun } from '../utils/chatChannel'
import type { ProcessRunChatNews } from '../utils/chatChannelTypes'
import { chatNotifyLevel, chatNotifyNews } from '../utils/chatNotify'
import { chatNotifyCountsOf, type ChatsSeenMap } from '../utils/chatRowStatus'
import { usePendingAsksByChat } from './usePendingAsksByChat'

/**
 * What each process run's own chat holds for the person, by run id — unread
 * replies and asks waiting, read at the chat's notification level against the
 * chats the person has seen (`seen`, the platform's store). What the
 * Processes list and the Processes badge show of a run's chat.
 */
export function useProcessRunChatNews(
  seen: ChatsSeenMap | undefined,
): ReadonlyMap<string, ProcessRunChatNews> {
  const { chats } = useChats()
  const levels = useAppSettings().settings.notifications.chatNotifyLevels
  const pendingAsks = usePendingAsksByChat()
  return useMemo(
    () =>
      processRunChatNewsByRun(
        chats
          .filter((chat) => chatChannelOf(chat.context) === 'processes')
          .map((chat) => {
            const key = getChatContextKey(chat.context)
            const news = chatNotifyNews(
              chatNotifyCountsOf(chat, seen?.[key], pendingAsks.get(key) ?? 0),
              chatNotifyLevel(chat, levels),
            )
            return { context: chat.context, ...news }
          }),
      ),
    [chats, levels, pendingAsks, seen],
  )
}
