import { useEffect } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { ChatContext } from '../api/generated'
import { useChats } from '../contexts/createChatsContext'
import { openChatRead, type ChatListEntry } from '../utils/chatListEntry'

/**
 * The chat on screen, with its messages. The chats list holds every other chat
 * as a summary; this reads the open one whole — again whenever a change leaves
 * the list with only its summary. A chat opened before the whole list arrived is
 * looked up on its own rather than waiting on every other chat. A chat that does
 * not exist yet is not read (reading creates it); it is empty until its first message.
 */
export function useOpenChat(context: ChatContext): {
  chat: ChatListEntry | null
  /** True while the chat exists but its messages are still on their way. */
  loading: boolean
} {
  const { getChat, loadChat, findChat, isLoaded } = useChats()
  const chat = getChat(context)
  const read = openChatRead(chat, isLoaded)
  const key = getChatContextKey(context)
  useEffect(() => {
    if (read === 'messages') void loadChat(context).catch(() => {})
    else if (read === 'summary') void findChat(context).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, read, loadChat, findChat])
  return { chat, loading: read !== null }
}
