import type { ChatContext } from 'thefactory-tools/types'
import { deriveChatContextType, processRunIdOfChatContext } from 'thefactory-tools/utils'
import {
  CHAT_NOTIFY_LEVELS,
  CHAT_NOTIFY_LEVEL_LABELS,
  CHAT_NOTIFY_LEVEL_WITHOUT_KIND,
  CHAT_NOTIFY_USE_DEFAULT,
} from './chatNotifyConstants'
import type {
  ChatNotifyCounts,
  ChatNotifyKind,
  ChatNotifyLevel,
  ChatNotifyLevelOption,
  ChatNotifyLevels,
  ChatNotifyNews,
} from './chatNotifyTypes'

/** What a chat's kind is read from: its context's fields. */
type ChatNotifyContext = { type: string; topicId?: string } & Partial<
  Record<
    'projectId' | 'groupId' | 'storyId' | 'featureId' | 'agentRunId' | 'featureRequestId',
    string
  >
>

/** The kind of chat a context is, for the level the person set for it — none for the assistant's. Pure. */
export function chatNotifyKind(context: ChatNotifyContext): ChatNotifyKind | undefined {
  const chatContext = context as ChatContext
  if (processRunIdOfChatContext(chatContext)) return 'run'
  switch (deriveChatContextType(chatContext)) {
    case 'AGENT_RUN_STORY':
    case 'AGENT_RUN_FEATURE':
      return 'run'
    case 'STORY':
    case 'FEATURE':
      return 'work'
    case 'FEATURE_REQUEST':
      return 'request'
    case 'PROJECT':
    case 'PROJECT_TOPIC':
      return 'project'
    case 'GROUP':
    case 'GROUP_TOPIC':
      return 'group'
    default:
      return undefined
  }
}

/** The level the person set for a chat's kind. Pure. */
export function chatKindNotifyLevel(
  context: ChatNotifyContext,
  levels: ChatNotifyLevels,
): ChatNotifyLevel {
  const kind = chatNotifyKind(context)
  return kind ? levels[kind] : CHAT_NOTIFY_LEVEL_WITHOUT_KIND
}

/** How much of a chat reaches the person: its own level, else its kind's. Pure. */
export function chatNotifyLevel(
  chat: { context: ChatNotifyContext; notifyLevel?: ChatNotifyLevel },
  levels: ChatNotifyLevels,
): ChatNotifyLevel {
  return chat.notifyLevel ?? chatKindNotifyLevel(chat.context, levels)
}

/**
 * What of a chat reaches the person at its level: every unread message and ask
 * at `everything`, only the messages that need them and the asks at
 * `needs-me`, nothing at `nothing`. Pure.
 */
export function chatNotifyNews(counts: ChatNotifyCounts, level: ChatNotifyLevel): ChatNotifyNews {
  if (level === 'nothing') return { unreadMessages: 0, pendingAsks: 0 }
  return {
    unreadMessages: level === 'needs-me' ? counts.unreadNeedsYou : counts.unreadMessages,
    pendingAsks: counts.pendingAsks,
  }
}

/** The chat with the person's own level for it — or, with none, back on its kind's. Pure. */
export function withChatNotifyLevel<T extends object>(
  chat: T,
  level: ChatNotifyLevel | undefined,
): T & { notifyLevel?: ChatNotifyLevel } {
  const { notifyLevel: _old, ...rest } = chat as T & { notifyLevel?: ChatNotifyLevel }
  return (level ? { ...rest, notifyLevel: level } : rest) as T & { notifyLevel?: ChatNotifyLevel }
}

/** What a chat's "Notify me" offers: its kind's level, then each level, with the chat's own picked. Pure. */
export function chatNotifyLevelOptions(
  chat: { context: ChatNotifyContext; notifyLevel?: ChatNotifyLevel },
  levels: ChatNotifyLevels,
): ChatNotifyLevelOption[] {
  return [
    {
      value: undefined,
      label: CHAT_NOTIFY_USE_DEFAULT(chatKindNotifyLevel(chat.context, levels)),
      selected: chat.notifyLevel === undefined,
    },
    ...CHAT_NOTIFY_LEVELS.map((level) => ({
      value: level,
      label: CHAT_NOTIFY_LEVEL_LABELS[level],
      selected: chat.notifyLevel === level,
    })),
  ]
}
