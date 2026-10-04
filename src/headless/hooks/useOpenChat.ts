import { useEffect } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { ChatContext } from '../api/generated'
import { useChats } from '../contexts/createChatsContext'
import { isChatLoaded, type ChatListEntry } from '../utils/chatListEntry'

/**
 * The chat on screen, with its messages. The chats list holds every other chat
 * as a summary; this reads the open one whole — again whenever a change leaves
 * the list with only its summary. A chat that does not exist yet is not read
 * (reading creates it); it is empty until its first message.
 */
export function useOpenChat(context: ChatContext): {
  chat: ChatListEntry | null
  /** True while the chat exists but its messages are still on their way. */
  loading: boolean
} {
  const { getChat, loadChat } = useChats()
  const chat = getChat(context)
  const exists = chat !== null
  const loaded = chat !== null && isChatLoaded(chat)
  const key = getChatContextKey(context)
  useEffect(() => {
    if (exists && !loaded) void loadChat(context).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, exists, loaded, loadChat])
  return { chat, loading: exists && !loaded }
}
