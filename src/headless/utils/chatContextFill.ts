import type { ChatContextBoundary, ChatContextCheckpointEvent } from 'thefactory-tools/types'
import { messagesFromContextBoundary } from 'thefactory-tools/utils'

import type { ChatContextReadout, CompactChatResponse, ContextFillReadout } from '../api/generated'
import { chatShownMessages } from './chatShownMessages'
import {
  CHAT_COMPACT_COPY,
  CHAT_CONTEXT_FILL_COPY,
  CHAT_CONTEXT_FILLING_FRACTION,
  CHAT_CONTEXT_NEARLY_FULL_FRACTION,
} from './chatContextFillConstants'
import type {
  ChatBoundaryMessage,
  ChatCompactLineView,
  ChatContextFillChipView,
  ChatContextFillLevel,
  ChatRowLineInput,
} from './chatContextFillTypes'

function levelOf(fraction: number): ChatContextFillLevel {
  if (fraction >= CHAT_CONTEXT_NEARLY_FULL_FRACTION) return 'nearly-full'
  return fraction >= CHAT_CONTEXT_FILLING_FRACTION ? 'filling' : 'roomy'
}

function tokenCount(tokens: number): string {
  return tokens >= 1000 ? `${Math.round(tokens / 1000)}k` : String(tokens)
}

function shareLabel(fill: ContextFillReadout): string {
  const percent = Math.round(fill.fillFraction * 100)
  const share = percent === 0 && fill.tokensUsed > 0 ? '<1%' : `${percent}%`
  return fill.windowSource === 'fallback' ? `~${share}` : share
}

/**
 * The context chip for a chat, from what its last turn measured. Nothing until
 * a turn has finished: there is no fill to say. Pure.
 */
export function chatContextFillChip(
  readout: ChatContextReadout | undefined,
): ChatContextFillChipView | undefined {
  const fill = readout?.contextFill
  if (!fill) return undefined
  if (fill.windowTokens <= 0) {
    return {
      label: CHAT_CONTEXT_FILL_COPY.unknownWindow,
      level: 'roomy',
      tokens: `${tokenCount(fill.tokensUsed)} tokens`,
      note: CHAT_CONTEXT_FILL_COPY.windowUnknown,
    }
  }
  return {
    label: shareLabel(fill),
    percent: Math.min(100, Math.round(fill.fillFraction * 100)),
    level: levelOf(fill.fillFraction),
    tokens: `${tokenCount(fill.tokensUsed)} of ${tokenCount(fill.windowTokens)} tokens`,
    ...(fill.windowSource === 'fallback' ? { note: CHAT_CONTEXT_FILL_COPY.windowGuessed } : {}),
  }
}

/** What Compact now came to, in short plain words, the same on every model. Pure. */
export function chatCompactLine(result: CompactChatResponse): ChatCompactLineView {
  switch (result.outcome) {
    case 'compacted':
      return {
        text: result.readout
          ? CHAT_COMPACT_COPY.compactedTo(shareLabel(result.readout))
          : CHAT_COMPACT_COPY.compacted,
        tone: 'done',
      }
    case 'nothing-needed':
      return { text: CHAT_COMPACT_COPY.nothingNeeded, tone: 'neutral' }
    case 'busy':
      return { text: CHAT_COMPACT_COPY.busy, tone: 'neutral' }
    case 'cancelled':
      return { text: CHAT_COMPACT_COPY.cancelled, tone: 'neutral' }
    default:
      return { text: CHAT_COMPACT_COPY.failed, tone: 'failed' }
  }
}

/** The readout of a `chats:context-readout` event for this chat. Pure. */
export function chatContextReadoutOfEvent(
  data: unknown,
  chatContextId: string,
): ChatContextReadout | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const event = data as { chatContextId?: unknown; readout?: unknown }
  if (event.chatContextId !== chatContextId) return undefined
  return typeof event.readout === 'object' && event.readout !== null
    ? (event.readout as ChatContextReadout)
    : undefined
}

/** A `chats:context-checkpoint` event, or `undefined` for anything else. Pure. */
export function chatContextCheckpointOfEvent(
  data: unknown,
): ChatContextCheckpointEvent | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const event = data as Partial<Record<keyof ChatContextCheckpointEvent, unknown>>
  const known = event.phase === 'started' || event.phase === 'finished'
  return known &&
    typeof event.chatContextId === 'string' &&
    typeof event.reason === 'string' &&
    typeof event.at === 'string'
    ? (data as ChatContextCheckpointEvent)
    : undefined
}

/** The system bubble a client leads a chat with: not a stored message, so it has no time. */
function isLeadingBubble(message: ChatBoundaryMessage | undefined): boolean {
  return message?.role === 'system' && !message.id && !message.startedAt
}

/**
 * Where a chat's boundary line goes among the rows a client draws: how many of
 * them sit above it. `messages` is the list as a client holds it, a leading
 * system bubble included, as a message with no id is matched by its place. A
 * boundary with nothing drawn above it, or on a message that is gone, cuts
 * nothing, so there is no line. Pure.
 */
export function contextBoundaryIndex<M extends ChatBoundaryMessage>(
  messages: readonly M[],
  boundary: ChatContextBoundary | undefined,
): number | undefined {
  if (!boundary) return undefined
  const stored = isLeadingBubble(messages[0]) ? messages.slice(1) : [...messages]
  const start = stored.length - messagesFromContextBoundary(stored, boundary).length
  const above = chatShownMessages(stored.slice(0, start)).length
  return above > 0 ? above : undefined
}

/** The cutoff line to draw beside a boundary: one at or above it marks nothing that is sent. Pure. */
export function shownContextCutoff(
  cutoff: number | null,
  boundary: number | undefined,
): number | null {
  if (cutoff === null || boundary === undefined) return cutoff
  return cutoff > boundary ? cutoff : null
}

/** Whether a line above a message is drawn on this row: the message's own, or the fold holding it. Pure. */
export function rowHoldsMessage({
  line,
  rowStart,
  rowEnd,
  windowStart,
}: ChatRowLineInput): boolean {
  if (line === null || line === undefined || line < windowStart) return false
  return line === rowStart || (rowEnd !== undefined && line > rowStart && line < rowEnd)
}
