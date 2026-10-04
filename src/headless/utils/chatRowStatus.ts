import type { ChatContextLike } from './chatTypes'
import { chatMessageTimes, type ChatMessagesShape } from './chatListEntry'

export type ChatsSeenMap = Record<string, string>

export type ChatRowStatus = {
  /** True when an LLM request is in flight for this chat. */
  isThinking: boolean
  /** True when the chat has messages newer than the stored last-seen ts. */
  isUnread: boolean
  /** Approximate count of unread messages — used in the row badge. */
  unreadCount: number
  /** True for agent-run chats currently running. */
  isAgentRunning: boolean
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
  chat: (ChatMessagesShape & { state?: string }) | null | undefined
  isSending: boolean
  seen: ChatsSeenMap
  /** Asks this chat has waiting on the user — each one counts as unread news. */
  pendingAsks?: number
}): ChatRowStatus {
  const { context, contextKey, chat, isSending, seen } = input
  const pendingAsks = input.pendingAsks ?? 0
  const isAgentContext = context.type === 'AGENT_RUN_STORY' || context.type === 'AGENT_RUN_FEATURE'
  const isAgentRunning = Boolean(
    isAgentContext && (chat?.state === 'running' || chat?.state === 'created'),
  )
  const times = chat ? chatMessageTimes(chat) : []
  const latest = times[times.length - 1] ?? undefined
  const isUnread = isChatUnread(seen, contextKey, latest)
  const unreadCount = isUnread ? chatUnreadMessages(times, seen[contextKey]) : 0
  return {
    isThinking: isSending,
    isUnread: isUnread || pendingAsks > 0,
    unreadCount: unreadCount + pendingAsks,
    isAgentRunning,
  }
}
