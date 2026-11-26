import type { ChatContext } from 'thefactory-tools/types'

import type { ChatNewsShape } from './chatListEntry'
import type { ChatNotifyLevel, ChatNotifyLevels } from './chatNotifyTypes'

/** The channel a chat's news counts on: the Chat channel, or the Processes channel for a chat that belongs to a process run. */
export type ChatChannel = 'chat' | 'processes'

/** What a process run's own chat holds for the person, at its notification level: unread messages, and asks waiting on them. */
export type ProcessRunChatNews = { unread: number; asks: number }

/** A chat as a run's chat news is read from it — loaded or summarised, with the person's own level for it. */
export type ProcessRunChatNewsChat = ChatNewsShape & {
  context: ChatContext
  notifyLevel?: ChatNotifyLevel
}

/** What a run's chat news is read against: when the person last saw each chat, the asks waiting by chat, and their level for each kind of chat. */
export type ProcessRunChatNewsRead = {
  seen?: Readonly<Record<string, string>>
  pendingAsks: ReadonlyMap<string, number>
  levels: ChatNotifyLevels
}
