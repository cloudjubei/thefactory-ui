import type { ChatNotifyLevel } from 'thefactory-tools/types'

export type { ChatNotifyLevel }

/** The kinds of chat the person sets how much reaches them for. */
export type ChatNotifyKind = 'run' | 'work' | 'request' | 'project' | 'group'

/** The person's level for each kind of chat. */
export type ChatNotifyLevels = Record<ChatNotifyKind, ChatNotifyLevel>

/** How the agents' own exchange shows in a conversation: one line each, every message, or not at all. */
export type AgentMessagesDisplay = 'collapsed' | 'full' | 'hidden'

/** What a chat holds for the person, before its level says how much of it reaches them. */
export type ChatNotifyCounts = {
  /** Messages for the person they have not read. */
  unreadMessages: number
  /** Of those, the ones that need them. */
  unreadNeedsYou: number
  /** Asks waiting on their answer or decision. */
  pendingAsks: number
}

/** What reaches the person of a chat at its level: news to read, and asks to answer. */
export type ChatNotifyNews = {
  unreadMessages: number
  pendingAsks: number
}

/** One choice of a chat's "Notify me": a level of its own, or none — its kind's. */
export type ChatNotifyLevelOption = {
  value: ChatNotifyLevel | undefined
  label: string
  selected: boolean
}
