import {
  HELD_AGENT_MESSAGE_WAITING_FOR,
  HELD_AGENT_MESSAGES_METADATA_KEY,
} from './heldAgentMessagesConstants'
import type { HeldAgentMessageReason, HeldAgentMessageView } from './heldAgentMessagesTypes'

const HEADING_PREFIX = '📨 '
const AWAITING_PREFIX = '_The sending agent is waiting for your answer'

function isReason(value: unknown): value is HeldAgentMessageReason {
  return value === 'ask' || value === 'turn' || value === 'unknown'
}

/** The message itself, without the heading naming its sender and the footer saying a reply is awaited. */
function messageBody(content: string): string {
  const parts = content.split('\n\n')
  if (parts[0]?.startsWith(HEADING_PREFIX)) parts.shift()
  if (parts[parts.length - 1]?.startsWith(AWAITING_PREFIX)) parts.pop()
  return parts.join('\n\n').trim()
}

/**
 * The agent messages held for a chat until it is free — oldest first, as the
 * chat shows them — read from its metadata; an entry it cannot read is left out.
 * Pure.
 */
export function heldAgentMessageViews(
  metadata: Record<string, unknown> | undefined,
): HeldAgentMessageView[] {
  const held = metadata?.[HELD_AGENT_MESSAGES_METADATA_KEY]
  if (!Array.isArray(held)) return []
  const views: HeldAgentMessageView[] = []
  for (const entry of held) {
    if (typeof entry !== 'object' || entry === null) continue
    const { id, content, handoffFrom, heldAt, heldFor } = entry as Record<string, unknown>
    if (typeof id !== 'string' || typeof content !== 'string') continue
    if (typeof handoffFrom !== 'string' || typeof heldAt !== 'string' || !isReason(heldFor))
      continue
    views.push({
      id,
      from: handoffFrom,
      body: messageBody(content),
      waitingFor: HELD_AGENT_MESSAGE_WAITING_FOR[heldFor],
      heldAt,
    })
  }
  return views
}
