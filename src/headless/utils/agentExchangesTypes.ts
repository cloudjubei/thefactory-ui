import type { ChatMessageLike } from './chatTypes'

/**
 * One exchange between agents in a conversation: a run of messages the agents
 * wrote to each other — a hand-off and the turn that answered it — with the
 * cards the host wrote of it.
 */
export type AgentExchange = {
  /** The index of its first message. */
  start: number
  /** The index just past its last message. */
  end: number
  /** The agent that handed the turn over, when one did. */
  from?: string
  /** The hand-off that opened it. */
  handoff?: ChatMessageLike
  /** The last thing the answering agent said. */
  reply?: ChatMessageLike
  /** What the host recorded of it — the manager's outcomes and escalations — in order. */
  cards: ChatMessageLike[]
  /** When it last moved. */
  at?: string
}

/** Which messages a conversation draws as an exchange, and which not on their own. */
export type AgentExchangeLayout = {
  /** The exchange drawn at the index of its first message. */
  starts: ReadonlyMap<number, AgentExchange>
  /** Messages drawn within an exchange that starts earlier, or not drawn at all. */
  hidden: ReadonlySet<number>
}

/** The quiet line an exchange without a brief card reads as. */
export type AgentExchangeLineView = {
  head: string
  line: string
  /** What was handed over, as the expanded line says it. */
  toAgent?: { label: string; text: string }
  /** What the answering agent said back. */
  fromAgent?: { label: string; text: string }
}
