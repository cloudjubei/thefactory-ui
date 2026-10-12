import type { HeldAgentMessageReason } from './heldAgentMessagesTypes'

/** Where the backend keeps a chat's held agent messages, in its `metadata`. */
export const HELD_AGENT_MESSAGES_METADATA_KEY = 'heldAgentMessages'

/** What a held message waits for, by why it was held. */
export const HELD_AGENT_MESSAGE_WAITING_FOR: Record<HeldAgentMessageReason, string> = {
  ask: 'Arrived while a request here was waiting on you — delivered once this chat is free',
  turn: 'Arrived during a turn — delivered once this chat is free',
}

export const HELD_STACK_TEXT = {
  title: 'Messages from other agents',
  from: 'From',
  deliverNow: 'Deliver now',
  deliverNowHint: 'Post it and start this chat’s agent on it now',
  discard: 'Discard',
  discardHint: 'Drop it without delivering it',
} as const
