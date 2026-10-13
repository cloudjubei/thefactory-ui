import { useCallback, useMemo } from 'react'
import type { ChatContext } from '../api'
import { useAppSettings } from '../contexts/AppSettingsContext'
import { useChats } from '../contexts/createChatsContext'
import { chatNotifyLevel, chatNotifyLevelOptions } from '../utils/chatNotify'
import type { ChatNotifyLevel, ChatNotifyLevelOption } from '../utils/chatNotifyTypes'

export type UseChatNotifyLevel = {
  /** How much of the chat reaches the person now: its own level, else its kind's. */
  level: ChatNotifyLevel
  /** What "Notify me" offers, the chat's choice picked. */
  options: ChatNotifyLevelOption[]
  /** Give the chat a level of its own, or none to put it back on its kind's. */
  setLevel: (level: ChatNotifyLevel | undefined) => Promise<void>
}

/** A chat's "Notify me": what reaches the person of it, and how to change that for this chat alone. */
export function useChatNotifyLevel(context: ChatContext): UseChatNotifyLevel {
  const { getChat, setChatNotifyLevel } = useChats()
  const levels = useAppSettings().settings.notifications.chatNotifyLevels
  const notifyLevel = getChat(context)?.notifyLevel
  const level = useMemo(
    () => chatNotifyLevel({ context, ...(notifyLevel ? { notifyLevel } : {}) }, levels),
    [context, notifyLevel, levels],
  )
  const options = useMemo(
    () => chatNotifyLevelOptions({ context, ...(notifyLevel ? { notifyLevel } : {}) }, levels),
    [context, notifyLevel, levels],
  )
  const setLevel = useCallback(
    (next: ChatNotifyLevel | undefined) => setChatNotifyLevel(context, next),
    [context, setChatNotifyLevel],
  )
  return { level, options, setLevel }
}
