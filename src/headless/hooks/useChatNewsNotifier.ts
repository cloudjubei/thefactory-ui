import { useEffect, useRef } from 'react'
import { getChatContextKey, processRunChatContext } from 'thefactory-tools/utils'
import { useAppSettings } from '../contexts/AppSettingsContext'
import { useChats } from '../contexts/createChatsContext'
import { chatAsksNewsSince, chatNewsSince } from '../utils/chatNews'
import { chatNotifyLevel } from '../utils/chatNotify'
import { CHAT_NEEDS_YOU_NOTIFICATION, CHAT_NEWS_NOTIFICATION } from '../utils/chatNotifyConstants'
import type { ChatNewsMarks } from '../utils/chatNewsTypes'
import type { ChatNotifyLevel } from '../utils/chatNotifyTypes'
import { processRunStopNotification, processRunStopsSince } from '../utils/processRunStopNews'
import type { ProcessRunStopMarks, ProcessRunStopNews } from '../utils/processRunStopNewsTypes'
import { usePendingAsksByChat } from './usePendingAsksByChat'
import { useProcessRuns } from './useProcessRuns'
import { useProcessStopClock } from './useProcessStopClock'

/** What the host posts as an OS notification — `run` names the process run one about a run's stop opens. */
export type ChatNewsNotification = { title: string; tag: string; run?: ProcessRunStopNews }

/**
 * Tells the host each time news reaches a chat, or an ask comes to wait on
 * the person in one — each chat read at its notification level, so a chat set
 * to `needs-me` tells only what needs them and one set to `nothing` nothing.
 * A process run's chats are never told, whatever is written in them: its run
 * is, once, when it comes to need the person — a stop that is theirs, or an
 * ask waiting in its chat (`processRunStopsSince`) — with the run to open.
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
  const { runs, isLoaded: runsLoaded } = useProcessRuns()
  const stopNow = useProcessStopClock()
  const stopMarks = useRef<ProcessRunStopMarks | undefined>(undefined)

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

  useEffect(() => {
    if (!runsLoaded) return
    const levelByKey = new Map<string, ChatNotifyLevel | undefined>(
      chats.map((chat) => [getChatContextKey(chat.context), chat.notifyLevel]),
    )
    const check = processRunStopsSince(runs, stopNow, stopMarks.current, {
      asksOf: (run) => pendingAsks.get(getChatContextKey(processRunChatContext(run))) ?? 0,
      levelOf: (run) => {
        const context = processRunChatContext(run)
        const notifyLevel = levelByKey.get(getChatContextKey(context))
        return chatNotifyLevel({ context, ...(notifyLevel ? { notifyLevel } : {}) }, levels)
      },
    })
    stopMarks.current = check.marks
    for (const stop of check.arrived) notify(processRunStopNotification(stop))
  }, [runs, runsLoaded, stopNow, pendingAsks, chats, levels, notify])
}
