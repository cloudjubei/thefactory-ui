import { isAgentExchangeMessage, isNeedsYouMessage } from 'thefactory-tools/utils'
import {
  AGENT_EXCHANGE_FROM_AGENT,
  AGENT_EXCHANGE_HEAD,
  AGENT_EXCHANGE_HEADS,
  AGENT_EXCHANGE_HEAD_UNOPENED,
  AGENT_EXCHANGE_LINE_MAX_CHARS,
  AGENT_EXCHANGE_SUMMARY_MAX_CHARS,
  AGENT_EXCHANGE_TO_AGENT,
} from './agentExchangesConstants'
import type {
  AgentExchange,
  AgentExchangeLayout,
  AgentExchangeLineView,
} from './agentExchangesTypes'
import type { AgentMessagesDisplay } from './chatNotifyTypes'
import type { ChatMessageLike } from './chatTypes'

/** Whether a message is on the agents' side: their exchange, or a card the host wrote of the manager. */
function isAgentSide(message: ChatMessageLike): boolean {
  return isAgentExchangeMessage(message) || message.managerCard !== undefined
}

/** Each run of consecutive agent-side messages, as `[start, end)`. */
function agentRuns(messages: readonly ChatMessageLike[]): [number, number][] {
  const runs: [number, number][] = []
  let start = -1
  messages.forEach((message, i) => {
    if (isAgentSide(message)) {
      if (start < 0) start = i
      return
    }
    if (start >= 0) runs.push([start, i])
    start = -1
  })
  if (start >= 0) runs.push([start, messages.length])
  return runs
}

function exchangeOf(
  messages: readonly ChatMessageLike[],
  start: number,
  end: number,
): AgentExchange {
  const part = messages.slice(start, end)
  const handoff = part.find((m) => m.role === 'user' && m.handoffFrom !== undefined)
  const from = handoff?.handoffFrom ?? part.find((m) => m.answersHandoffFrom)?.answersHandoffFrom
  const reply = [...part]
    .reverse()
    .find((m) => m.role === 'assistant' && !m.managerCard && m.content.trim() !== '')
  const last = part[part.length - 1]
  const at = last?.completedAt ?? last?.startedAt
  return {
    start,
    end,
    ...(from ? { from } : {}),
    ...(handoff ? { handoff } : {}),
    ...(reply ? { reply } : {}),
    cards: part.filter((m) => m.managerCard !== undefined && m.managerCard.kind !== 'brief'),
    ...(at ? { at } : {}),
  }
}

/**
 * How a conversation draws the agents' own exchange: `collapsed`, each run of
 * it as one exchange at its first message; `full`, every message on its own;
 * `hidden`, none of it but the cards that need the person — save a run that
 * ends the conversation, drawn in full so its last message can be retried or
 * deleted. With `openTail`, a run that ends the conversation — a turn still
 * under way, or asks waiting in it — is drawn in full whatever the display, so
 * nothing it asks is hidden. Pure.
 */
export function agentExchangeLayout(
  messages: readonly ChatMessageLike[],
  display: AgentMessagesDisplay,
  options: { openTail?: boolean } = {},
): AgentExchangeLayout {
  const starts = new Map<number, AgentExchange>()
  const hidden = new Set<number>()
  if (display === 'full') return { starts, hidden }
  for (const [start, end] of agentRuns(messages)) {
    if ((options.openTail || display === 'hidden') && end === messages.length) continue
    if (display === 'collapsed') starts.set(start, exchangeOf(messages, start, end))
    for (let i = start; i < end; i++) {
      if (display === 'collapsed' ? i > start : !isNeedsYouMessage(messages[i]!)) hidden.add(i)
    }
  }
  return { starts, hidden }
}

/**
 * Where a message is drawn: the first message of the exchange it is drawn
 * within, else itself — so a conversation opening at an unread card opens at
 * its exchange. Pure.
 */
export function agentExchangeStartOf(
  layout: AgentExchangeLayout,
  index: number | null,
): number | null {
  if (index === null) return null
  for (const exchange of layout.starts.values()) {
    if (index >= exchange.start && index < exchange.end) return exchange.start
  }
  return index
}

/**
 * Where the row drawn at `index` ends (exclusive): after the last message of
 * the exchange folded into it, else after itself. The row ending the chat is
 * the one whose end is the chat's length — the row that carries the delete of
 * the chat's last message, even when that message is folded into it. Pure.
 */
export function agentExchangeRowEnd(layout: AgentExchangeLayout, index: number): number {
  return layout.starts.get(index)?.end ?? index + 1
}

/**
 * Where a list showing its last `rows` rows starts: far enough back that that
 * many rows are drawn — the agents' exchange folds many messages into one row,
 * or draws none of them — so a window never opens inside an exchange, whose
 * row is drawn at its first message. Counting messages instead opened a run's long manager
 * exchange with every message in the window folded into a row above it, and
 * nothing drawn at all. Pure.
 */
export function agentExchangeWindowStart(
  layout: AgentExchangeLayout,
  total: number,
  rows: number,
): number {
  let start = total
  let drawn = 0
  while (start > 0 && drawn < rows) {
    start -= 1
    if (!layout.hidden.has(start)) drawn += 1
  }
  return start
}

/** What an agent said, as one plain line: its first line with words. */
function firstLine(content: string): string {
  const line = content
    .split('\n')
    .map(plain)
    .find((l) => l !== '')
  return clip(line ?? '', AGENT_EXCHANGE_LINE_MAX_CHARS)
}

/** What an agent said, as one plain run of text. */
function summary(content: string): string {
  const text = content.split('\n').map(plain).filter(Boolean).join(' ')
  return clip(text, AGENT_EXCHANGE_SUMMARY_MAX_CHARS)
}

function plain(line: string): string {
  return line
    .replace(/^\s*(?:#+|>|[-*]|\d+\.)\s*/, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

function labelOf(from: string): string {
  return `${from.charAt(0).toUpperCase()}${from.slice(1)}`
}

/**
 * The quiet line an exchange reads as: headed by who handed the turn over,
 * with the first words of the hand-off — or of the reply, when no hand-off
 * was kept — and, opened, what each side said. Pure.
 */
export function agentExchangeLine(exchange: AgentExchange): AgentExchangeLineView {
  const { from, handoff, reply } = exchange
  if (!from) return { head: AGENT_EXCHANGE_HEAD_UNOPENED, line: '' }
  const label = labelOf(from)
  return {
    head: AGENT_EXCHANGE_HEADS[from] ?? AGENT_EXCHANGE_HEAD(label),
    line: firstLine(handoff?.content ?? reply?.content ?? ''),
    ...(handoff
      ? { toAgent: { label: AGENT_EXCHANGE_TO_AGENT(label), text: summary(handoff.content) } }
      : {}),
    ...(reply
      ? { fromAgent: { label: AGENT_EXCHANGE_FROM_AGENT(label), text: summary(reply.content) } }
      : {}),
  }
}
