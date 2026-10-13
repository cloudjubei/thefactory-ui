import { useEffect, useRef } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import { useAppSettings } from '../contexts/AppSettingsContext'
import { useChats } from '../contexts/createChatsContext'
import { chatAsksNewsSince, chatNewsSince } from '../utils/chatNews'
import { chatNotifyLevel } from '../utils/chatNotify'
import { CHAT_NEEDS_YOU_NOTIFICATION, CHAT_NEWS_NOTIFICATION } from '../utils/chatNotifyConstants'
import type { ChatNewsMarks } from '../utils/chatNewsTypes'
import type { ChatNotifyLevel } from '../utils/chatNotifyTypes'
import { usePendingAsksByChat } from './usePendingAsksByChat'

/** What the host posts as an OS notification. */
export type ChatNewsNotification = { title: string; tag: string }

/**
 * Tells the host each time news reaches a chat, or an ask comes to wait on
 * the person in one — each chat read at its notification level, so a chat set
 * to `needs-me` tells only what needs them and one set to `nothing` nothing.
 * Only what arrives after it mounts counts. The host decides whether to post.
 */
export function useChatNewsNotifier(notify: (notification: ChatNewsNotification) => void): void {
  const { chats } = useChats()
  const levels = useAppSettings().settings.notifications.chatNotifyLevels
  const pendingAsks = usePendingAsksByChat()
  const news = useRef<{ since: string; marks: ChatNewsMarks }>({
    since: new Date().toISOString(),
    marks: new Map(),
  })
  const askMarks = useRef<ReadonlyMap<string, number> | undefined>(undefined)

  useEffect(() => {
    const check = chatNewsSince(chats, news.current.marks, news.current.since, (chat) =>
      chatNotifyLevel(chat, levels),
    )
    news.current = { ...news.current, marks: check.marks }
    if (check.arrived) notify(CHAT_NEWS_NOTIFICATION)
  }, [chats, levels, notify])

  useEffect(() => {
    if (askMarks.current === undefined) {
      askMarks.current = new Map(pendingAsks)
      return
    }
    const levelByKey = new Map<string, ChatNotifyLevel>(
      chats.map((chat) => [getChatContextKey(chat.context), chatNotifyLevel(chat, levels)]),
    )
    const check = chatAsksNewsSince(
      pendingAsks,
      askMarks.current,
      (key) => levelByKey.get(key) ?? 'everything',
    )
    askMarks.current = check.marks
    if (check.arrived) notify(CHAT_NEEDS_YOU_NOTIFICATION)
  }, [pendingAsks, chats, levels, notify])
}
