import { isChatClosedToList } from 'thefactory-tools/utils'

import type { ChatContextLike } from './chatTypes'
import { chatMessageTimes, chatNeedsYouTimesOf, type ChatNewsShape } from './chatListEntry'
import { chatNotifyNews } from './chatNotify'
import type { ChatNotifyCounts, ChatNotifyLevel } from './chatNotifyTypes'
import { formatBadgeCount } from './badgeAggregation'
import { CHAT_AWAITING_ANSWER_LABEL } from './chatUnreadConstants'

export type ChatsSeenMap = Record<string, string>

export type ChatRowStatus = {
  /** True when an LLM request is in flight for this chat. */
  isThinking: boolean
  /** True when the chat has messages newer than the stored last-seen ts, or waits on the user. */
  isUnread: boolean
  /** Approximate count of unread messages — used in the row badge. */
  unreadCount: number
  /** An ask of the agent's waits on the user's answer or decision. */
  awaitingAnswer: boolean
  /** True for agent-run chats currently running. */
  isAgentRunning: boolean
  /** What waits on the person: unread messages that need them, and asks. */
  needsYou: number
  /** The person set the chat to tell them nothing. */
  muted: boolean
  /**
   * The chat is closed (`archivedAt`), the person has not put it back in their
   * list since (`listShownAt`), and nothing in it calls them back: no ask,
   * nothing needing them since it was closed. It is history.
   */
  retired: boolean
}

/**
 * Pure unread-check used by both the sidebar row and the badge counter.
 * A chat is "unread" when its most recent message is newer than the
 * stored last-seen timestamp; chats that have never been opened are
 * unread iff they have any messages.
 */
export function isChatUnread(
  map: ChatsSeenMap,
  contextKey: string,
  latestMessageAt: string | undefined,
): boolean {
  if (!latestMessageAt) return false
  const seen = map[contextKey]
  if (!seen) return true
  return latestMessageAt > seen
}

/**
 * Returns a new `ChatsSeenMap` with `key` advanced to `at`, sharing the
 * input reference when nothing changed (cheap `===` skip for consumers
 * memoising on the map).
 */
export function markSeen(map: ChatsSeenMap, key: string, at: string): ChatsSeenMap {
  if (map[key] === at) return map
  return { ...map, [key]: at }
}

/**
 * How many of a chat's messages arrived after it was last seen — every one, for
 * a chat never seen. Messages without a time are not counted then.
 */
export function chatUnreadMessages(
  times: readonly (string | null)[],
  seenAt: string | undefined,
): number {
  if (!seenAt) return times.length
  let count = 0
  for (const ts of times) if (ts && ts > seenAt) count += 1
  return count
}

/**
 * What a chat holds for the person since it was last seen — its unread
 * messages, those of them that need the person, and its asks — before its
 * notification level says how much reaches them. Closing a chat (`archivedAt`)
 * settles what came before it: a closed chat holds only what calls the person
 * back — its asks, which never lapse, and what needs them since it was closed —
 * with the news since then; without those, nothing. Pure.
 */
export function chatNotifyCountsOf(
  chat: ChatNewsShape,
  seenAt: string | undefined,
  pendingAsks: number,
): ChatNotifyCounts {
  const closedAt = chat.archivedAt
  const readTo = closedAt && (!seenAt || closedAt > seenAt) ? closedAt : seenAt
  const times = chatMessageTimes(chat)
  const latest = times[times.length - 1] ?? undefined
  const unread = latest !== undefined && (!readTo || latest > readTo)
  const unreadNeedsYou = chatUnreadMessages(chatNeedsYouTimesOf(chat), readTo)
  if (closedAt && unreadNeedsYou + pendingAsks === 0) {
    return { unreadMessages: 0, unreadNeedsYou: 0, pendingAsks: 0 }
  }
  return {
    unreadMessages: unread ? chatUnreadMessages(times, readTo) : 0,
    unreadNeedsYou,
    pendingAsks,
  }
}

/**
 * Pure computation behind each platform's `useChatRowStatus` hook. The
 * thin per-app wrapper reads `chat` + `isSending` via the host's
 * `useChats()` and `seen` via the host's `useChatsSeen()`, then calls this
 * with the resolved values + the canonical `contextKey` from
 * `getChatContextKey`.
 *
 * Cross-platform — no DOM, no `window`, no React.
 */
export function computeChatRowStatus(input: {
  context: ChatContextLike
  contextKey: string
  chat: (ChatNewsShape & { state?: string }) | null | undefined
  isSending: boolean
  seen: ChatsSeenMap
  /** Asks this chat has waiting on the user — news even once every message is read. */
  pendingAsks?: number
  /** How much of the chat reaches the person — everything when not given. */
  level?: ChatNotifyLevel
}): ChatRowStatus {
  const { context, contextKey, chat, isSending, seen } = input
  const level = input.level ?? 'everything'
  const isAgentContext = context.type === 'AGENT_RUN_STORY' || context.type === 'AGENT_RUN_FEATURE'
  const isAgentRunning = Boolean(
    isAgentContext && (chat?.state === 'running' || chat?.state === 'created'),
  )
  const pendingAsks = input.pendingAsks ?? 0
  const counts = chatNotifyCountsOf(chat ?? {}, seen[contextKey], pendingAsks)
  const news = chatNotifyNews(counts, level)
  return {
    isThinking: isSending,
    isUnread: news.unreadMessages > 0 || news.pendingAsks > 0,
    unreadCount: news.unreadMessages,
    awaitingAnswer: news.pendingAsks > 0,
    isAgentRunning,
    needsYou: level === 'nothing' ? 0 : counts.unreadNeedsYou + pendingAsks,
    muted: level === 'nothing',
    retired: isChatClosedToList(chat ?? {}) && counts.unreadNeedsYou + counts.pendingAsks === 0,
  }
}

/**
 * What a chat row's badge shows: how many messages are unread, or — once every
 * one is — "!" while the agent waits on the user. Nothing for a chat with no news.
 */
export function chatRowBadge(
  status: Pick<ChatRowStatus, 'unreadCount' | 'awaitingAnswer'>,
): { text: string; label: string } | undefined {
  if (status.unreadCount > 0) {
    return {
      text: formatBadgeCount(status.unreadCount),
      label: `${status.unreadCount} unread messages`,
    }
  }
  if (status.awaitingAnswer) return { text: '!', label: CHAT_AWAITING_ANSWER_LABEL }
  return undefined
}
