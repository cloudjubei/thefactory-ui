import type { ChatAudienceMessage } from 'thefactory-tools/types'
import { chatNeedsYouTimes, chatNewsTimes } from 'thefactory-tools/utils'
import type { GetChatResponse, ListChatSummariesResponse } from '../api/generated'

/**
 * A chat as the list of every chat holds it — without its messages (see
 * thefactory-tools `ChatSummary`). The generated type reads the `null` of a
 * message without a time as `unknown`.
 */
export type ChatSummaryLike = Omit<
  ListChatSummariesResponse[number],
  'messageTimes' | 'needsYouTimes'
> & {
  messageTimes: (string | null)[]
  needsYouTimes: (string | null)[]
}

/**
 * A chat in the chats list: a summary — every field but the messages, with
 * their count and times — until the chat is opened or read whole, then the
 * full chat with its `messages`.
 */
export type ChatListEntry = GetChatResponse & {
  messageCount?: number
  messageTimes?: (string | null)[]
  needsYouTimes?: (string | null)[]
}

/** Whether the entry holds the chat's messages, not just their count and times. */
export function isChatLoaded(entry: ChatListEntry): boolean {
  return entry.messages !== undefined
}

/**
 * What an open chat has to read: its `messages` when the list holds only its
 * summary; its `summary` alone when the whole list has not arrived yet, so the
 * chat does not wait on every other chat; nothing when it is loaded, or when the
 * whole list does not have it — it does not exist until its first message.
 */
export function openChatRead(
  entry: ChatListEntry | null,
  listLoaded: boolean,
): 'messages' | 'summary' | null {
  if (entry) return isChatLoaded(entry) ? null : 'messages'
  return listLoaded ? null : 'summary'
}

/** What the count and times of a chat's messages are read from — a loaded chat or a summary. */
export type ChatMessagesShape = {
  messages?: readonly ChatAudienceMessage[]
  messageCount?: number
  messageTimes?: readonly (string | null)[]
  needsYouTimes?: readonly (string | null)[]
}

/** How many messages the chat has, loaded or not. */
export function chatMessageCount(entry: ChatMessagesShape): number {
  return entry.messages?.length ?? entry.messageCount ?? 0
}

/**
 * The time of each message for the person — when it finished, else when it
 * began, `null` without either — loaded or not. The agents' own exchange is
 * left out, as the summary leaves it out.
 */
export function chatMessageTimes(entry: ChatMessagesShape): readonly (string | null)[] {
  if (entry.messages) return chatNewsTimes(entry.messages)
  return entry.messageTimes ?? []
}

/** The time of each message that needs the person — loaded or not. */
export function chatNeedsYouTimesOf(entry: ChatMessagesShape): readonly (string | null)[] {
  if (entry.messages) return chatNeedsYouTimes(entry.messages)
  return entry.needsYouTimes ?? []
}

/** What a chat's last activity is read from: its messages' times and its own. */
export type ChatTimesShape = ChatMessagesShape & {
  updatedAt?: string | null
  createdAt?: string | null
}

/** When a chat last had a message — its newest one — else when it was updated, else created. */
export function chatLastActivityAt(entry: ChatTimesShape): string | undefined {
  let newest: string | undefined
  let newestMs = -Infinity
  for (const at of chatMessageTimes(entry)) {
    const ms = at ? Date.parse(at) : NaN
    if (!Number.isNaN(ms) && ms > newestMs) {
      newest = at as string
      newestMs = ms
    }
  }
  return newest ?? entry.updatedAt ?? entry.createdAt ?? undefined
}

/** Order chats by their last activity, the newest first. */
export function byLastActivity(a: ChatTimesShape, b: ChatTimesShape): number {
  const at = (entry: ChatTimesShape) => {
    const ms = Date.parse(chatLastActivityAt(entry) ?? '')
    return Number.isNaN(ms) ? -Infinity : ms
  }
  const ta = at(a)
  const tb = at(b)
  return ta === tb ? 0 : tb > ta ? 1 : -1
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
