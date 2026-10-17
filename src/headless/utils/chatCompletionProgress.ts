import type {
  CompletionProgressClaim,
  CompletionProgressEvent,
  CompletionProgressRoute,
} from './chatCompletionProgressTypes'

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined

/**
 * A `completion:progress` payload as one event — a turn's words so far, or the
 * end of the turn — with the chat and the API turn it belongs to; `undefined`
 * for anything that names no chat or turn, which no chat may show.
 */
export function parseCompletionProgressEvent(data: unknown): CompletionProgressEvent | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const event = data as Record<string, unknown>
  const chatContextId = text(event.chatContextId)
  const turnId = text(event.turnId)
  if (!chatContextId || !turnId) return undefined
  if (event.done === true) return { chatContextId, turnId, kind: 'done' }
  if (typeof event.turn !== 'number') return undefined
  const message = event.assistantMessage as { content?: unknown } | undefined
  const content = typeof message?.content === 'string' ? message.content : ''
  return { chatContextId, turnId, kind: 'turn', turn: event.turn, content }
}

/**
 * What a progress event does to the chat it names: nothing when this client has
 * no send in flight there, or when the chat is already pinned to another of its
 * turns; else the live preview it sets, the chat pinned to the event's turn.
 */
export function routeCompletionProgress(
  claim: CompletionProgressClaim | undefined,
  event: CompletionProgressEvent,
): CompletionProgressRoute | undefined {
  if (!claim) return undefined
  if (claim.turnId !== undefined && claim.turnId !== event.turnId) return undefined
  return {
    claim: { turnId: event.turnId },
    pendingAssistant: event.kind === 'done' ? null : { turn: event.turn, content: event.content },
  }
}
