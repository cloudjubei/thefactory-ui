import type { GetChatResponse, ListChatSummariesResponse } from '../api/generated'

/**
 * A chat as the list of every chat holds it — without its messages (see
 * thefactory-tools `ChatSummary`). The generated type reads the `null` of a
 * message without a time as `unknown`.
 */
export type ChatSummaryLike = Omit<ListChatSummariesResponse[number], 'messageTimes'> & {
  messageTimes: (string | null)[]
}

/**
 * A chat in the chats list: a summary — every field but the messages, with
 * their count and times — until the chat is opened or read whole, then the
 * full chat with its `messages`.
 */
export type ChatListEntry = GetChatResponse & {
  messageCount?: number
  messageTimes?: (string | null)[]
}

/** Whether the entry holds the chat's messages, not just their count and times. */
export function isChatLoaded(entry: ChatListEntry): boolean {
  return entry.messages !== undefined
}

/** What the count and times of a chat's messages are read from — a loaded chat or a summary. */
export type ChatMessagesShape = {
  messages?: readonly { completedAt?: string; startedAt?: string }[]
  messageCount?: number
  messageTimes?: readonly (string | null)[]
}

/** How many messages the chat has, loaded or not. */
export function chatMessageCount(entry: ChatMessagesShape): number {
  return entry.messages?.length ?? entry.messageCount ?? 0
}

/** Each message's time — when it finished, else when it began, `null` without either — loaded or not. */
export function chatMessageTimes(entry: ChatMessagesShape): readonly (string | null)[] {
  if (entry.messages) return entry.messages.map((m) => m.completedAt ?? m.startedAt ?? null)
  return entry.messageTimes ?? []
}

/**
 * A fresh summary over what the list holds for that chat. A loaded chat keeps
 * its messages while the summary says nothing changed (same count, same
 * `updatedAt`); otherwise they are dropped, and an open chat reads them again.
 */
export function withSummary(
  current: ChatListEntry | undefined,
  summary: ChatSummaryLike,
): ChatListEntry {
  const messages = current?.messages
  const unchanged =
    messages !== undefined &&
    messages.length === summary.messageCount &&
    current?.updatedAt === summary.updatedAt
  return unchanged ? { ...summary, messages } : summary
}

/**
 * The chat with a message appended, shown before the server has it. Only to a
 * loaded chat: the summary of one holds no messages, and one appended there
 * would pass for the whole conversation.
 */
export function withAppendedMessage(
  entry: ChatListEntry,
  message: NonNullable<ChatListEntry['messages']>[number],
): ChatListEntry {
  return entry.messages ? { ...entry, messages: [...entry.messages, message] } : entry
}
