import type { ChatContextLike, ChatMessageLike } from './chatTypes'

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
  chat: { messages?: ChatMessageLike[]; state?: string } | null | undefined
  isSending: boolean
  seen: ChatsSeenMap
}): ChatRowStatus {
  const { context, contextKey, chat, isSending, seen } = input
  const isAgentContext = context.type === 'AGENT_RUN_STORY' || context.type === 'AGENT_RUN_FEATURE'
  const isAgentRunning = Boolean(
    isAgentContext && (chat?.state === 'running' || chat?.state === 'created'),
  )
  const messages = chat?.messages ?? []
  const last = messages[messages.length - 1]
  const latest = last ? (last.completedAt ?? last.startedAt) : undefined
  const isUnread = isChatUnread(seen, contextKey, latest)
  let unreadCount = 0
  if (isUnread) {
    const since = seen[contextKey]
    if (since) {
      for (const m of messages) {
        const ts = m.completedAt ?? m.startedAt
        if (ts && ts > since) unreadCount += 1
      }
    } else {
      unreadCount = messages.length
    }
  }
  return { isThinking: isSending, isUnread, unreadCount, isAgentRunning }
}
