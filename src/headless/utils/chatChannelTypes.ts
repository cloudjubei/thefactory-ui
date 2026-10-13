/** The channel a chat's news counts on: the Chat channel, or the Processes channel for a chat that belongs to a process run. */
export type ChatChannel = 'chat' | 'processes'

/** What a process run's own chat holds for the person, at its notification level: unread messages, and asks waiting on them. */
export type ProcessRunChatNews = { unread: number; asks: number }
