import { useMemo } from 'react'
import type { ChatContext } from 'thefactory-tools/types'
import { getChatContextKey } from 'thefactory-tools/utils'

import { useAppSettings } from '../contexts/AppSettingsContext'
import { useCliConfigs } from '../contexts/CliConfigsContext'
import { useChats } from '../contexts/createChatsContext'
import {
  assistantConversationRows,
  assistantExpiredSignIns,
  assistantNavIndicator,
} from '../utils/assistant'
import type { AssistantChat, AssistantRow, AssistantRowStatus } from '../utils/assistantTypes'
import { chatNotifyLevel } from '../utils/chatNotify'
import { computeChatRowStatus, type ChatsSeenMap } from '../utils/chatRowStatus'
import type { NavRowIndicator } from '../utils/navIndicatorTypes'
import { usePendingAsksByChat } from './usePendingAsksByChat'
import { useSignInCardsByChat } from './useSignInCardsByChat'

export type AssistantConversations = {
  /** The conversations in the list, the one being started at the top. */
  conversations: AssistantRow[]
  /** The conversations archived from the list. */
  archived: AssistantRow[]
  /** What the Assistant nav item shows. */
  indicator: NavRowIndicator
}

/**
 * The Assistant's conversations, kept live: each one's news, asks and replying
 * agent at its notification level, and the nav item's indicator. `seen` is the
 * host's read-state map; `open` the conversation on screen.
 */
export function useAssistantConversations(
  seen: ChatsSeenMap,
  open?: ChatContext,
): AssistantConversations {
  const { chats, getChatLiveState } = useChats()
  const pendingAsks = usePendingAsksByChat()
  const notifyLevels = useAppSettings().settings.notifications.chatNotifyLevels
  const { caches, activeCli, activeCliCredentialId } = useCliConfigs()
  const signInCards = useSignInCardsByChat()

  return useMemo(() => {
    const statusOf = (chat: AssistantChat): AssistantRowStatus => {
      const key = getChatContextKey(chat.context)
      return computeChatRowStatus({
        context: chat.context,
        contextKey: key,
        chat,
        isSending: getChatLiveState(chat.context).isSending,
        seen,
        pendingAsks: pendingAsks.get(key) ?? 0,
        level: chatNotifyLevel(chat, notifyLevels),
      })
    }
    const conversations = assistantConversationRows({
      chats,
      archived: false,
      ...(open ? { open } : {}),
      statusOf,
    })
    const expired = assistantExpiredSignIns(
      conversations,
      chats,
      { logins: caches, active: { activeCli, activeCliCredentialId } },
      signInCards,
    )
    return {
      conversations,
      archived: assistantConversationRows({ chats, archived: true, statusOf }),
      indicator: assistantNavIndicator(conversations, expired),
    }
  }, [
    chats,
    getChatLiveState,
    pendingAsks,
    notifyLevels,
    seen,
    open,
    caches,
    activeCli,
    activeCliCredentialId,
    signInCards,
  ])
}
