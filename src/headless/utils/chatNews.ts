import { getChatContextKey, isAgentRunChatContext } from 'thefactory-tools/utils'
import { chatMessageTimes } from './chatListEntry'
import type { ChatNewsCheck, ChatNewsEntry, ChatNewsMarks } from './chatNewsTypes'

/**
 * Whether a message for the person reached any chat since the marks were
 * taken — newer than the chat's mark, or than `since` for a chat not marked
 * yet — and the marks to look against next. The agents' own exchange is never
 * news, nor is an agent-run chat, which never lights a badge. Pure.
 */
export function chatNewsSince(
  chats: readonly ChatNewsEntry[],
  marks: ChatNewsMarks,
  since: string,
): ChatNewsCheck {
  const next = new Map<string, string>()
  let arrived = false
  for (const chat of chats) {
    if (isAgentRunChatContext(chat.context)) continue
    const newest = newestTime(chatMessageTimes(chat))
    if (newest === undefined) continue
    const key = getChatContextKey(chat.context)
    if (newest > (marks.get(key) ?? since)) arrived = true
    next.set(key, newest)
  }
  return { arrived, marks: next }
}

function newestTime(times: readonly (string | null)[]): string | undefined {
  let newest: string | undefined
  for (const at of times) if (at !== null && (newest === undefined || at > newest)) newest = at
  return newest
}
