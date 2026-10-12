/** Why an agent's message waits in this chat: an ask of it waits on the person, or a turn runs. */
export type HeldAgentMessageReason = 'ask' | 'turn'

/** One agent's message held for this chat until it is free, as the chat shows it. */
export type HeldAgentMessageView = {
  id: string
  /** Who sent it — "the agent in chat "…"". */
  from: string
  /** What it says, without the delivery heading and footer the agent will read. */
  body: string
  /** What it waits for, in words. */
  waitingFor: string
  heldAt: string
}
