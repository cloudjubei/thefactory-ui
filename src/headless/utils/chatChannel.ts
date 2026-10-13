import type { ChatContext } from 'thefactory-tools/types'
import { isAgentRunChatContext, processRunIdOfChatContext } from 'thefactory-tools/utils'

import type { BadgeChatInput } from '../hooks/useBadgeCountsCore'
import type { ChatChannel, ProcessRunChatNews } from './chatChannelTypes'

/**
 * Which channel a chat's news counts on: a chat that belongs to a process run
 * — the run's own chat (nested runs share it) or one of its step agents'
 * chats — counts on Processes, as part of its run; every other chat on Chat.
 * Every badge, list and notification reads this one answer. Pure.
 */
export function chatChannelOf(context: ChatContext): ChatChannel {
  return processRunIdOfChatContext(context) !== undefined || isAgentRunChatContext(context)
    ? 'processes'
    : 'chat'
}

/** A chat's input to the Chat channel's badge: one that counts on Processes brings it nothing. Pure. */
export function chatBadgeInputOf(context: ChatContext, input: BadgeChatInput): BadgeChatInput {
  if (chatChannelOf(context) === 'chat') return input
  return { unreadMessages: 0, pendingAsks: 0, isThinking: false }
}

/**
 * What each process run's own chat holds for the person, by run id, from the
 * chats' news already read at their notification level. A step agent's chat
 * is left out: what it asks is the run's own stop. Pure.
 */
export function processRunChatNewsByRun(
  chats: ReadonlyArray<{ context: ChatContext; unreadMessages: number; pendingAsks?: number }>,
): ReadonlyMap<string, ProcessRunChatNews> {
  const out = new Map<string, ProcessRunChatNews>()
  for (const chat of chats) {
    const runId = processRunIdOfChatContext(chat.context)
    if (runId === undefined) continue
    out.set(runId, { unread: chat.unreadMessages, asks: chat.pendingAsks ?? 0 })
  }
  return out
}
