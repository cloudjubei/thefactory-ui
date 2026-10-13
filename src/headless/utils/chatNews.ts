import { getChatContextKey, isAgentRunChatContext } from 'thefactory-tools/utils'
import { chatMessageTimes, chatNeedsYouTimesOf } from './chatListEntry'
import type { ChatNewsCheck, ChatNewsEntry, ChatNewsMarks } from './chatNewsTypes'
import type { ChatNotifyLevel } from './chatNotifyTypes'

/**
 * Whether a message for the person reached any chat since the marks were
 * taken — newer than the chat's mark, or than `since` for a chat not marked
 * yet — and the marks to look against next. Each chat is read at its level
 * (`levelOf`, everything when not given): only what needs the person at
 * `needs-me`, nothing at `nothing`. The agents' own exchange is never news,
 * nor is an agent-run chat, which never lights a badge. Pure.
 */
export function chatNewsSince(
  chats: readonly ChatNewsEntry[],
  marks: ChatNewsMarks,
  since: string,
  levelOf: (chat: ChatNewsEntry) => ChatNotifyLevel = () => 'everything',
): ChatNewsCheck {
  const next = new Map<string, string>()
  let arrived = false
  for (const chat of chats) {
    if (isAgentRunChatContext(chat.context)) continue
    const level = levelOf(chat)
    if (level === 'nothing') continue
    const times = level === 'needs-me' ? chatNeedsYouTimesOf(chat) : chatMessageTimes(chat)
    const newest = newestTime(times)
    if (newest === undefined) continue
    const key = getChatContextKey(chat.context)
    if (newest > (marks.get(key) ?? since)) arrived = true
    next.set(key, newest)
  }
  return { arrived, marks: next }
}

/**
 * Whether an ask came to wait on the person in any chat since the counts were
 * taken — more waiting in a chat than before — and the counts to look against
 * next. A chat set to `nothing` brings no news, yet keeps its count. Pure.
 */
export function chatAsksNewsSince(
  asks: ReadonlyMap<string, number>,
  marks: ReadonlyMap<string, number>,
  levelOf: (chatKey: string) => ChatNotifyLevel,
): { arrived: boolean; marks: ReadonlyMap<string, number> } {
  let arrived = false
  for (const [key, count] of asks) {
    if (count > (marks.get(key) ?? 0) && levelOf(key) !== 'nothing') arrived = true
  }
  return { arrived, marks: new Map(asks) }
}

function newestTime(times: readonly (string | null)[]): string | undefined {
  let newest: string | undefined
  for (const at of times) if (at !== null && (newest === undefined || at > newest)) newest = at
  return newest
}
