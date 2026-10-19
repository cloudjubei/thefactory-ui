import type { ChatMessageLike } from './chatTypes'
import type {
  ToolApprovalPreviewFailure,
  ToolApprovalPreviewRequest,
} from './toolApprovalPreviewsTypes'

/**
 * The calls in a chat that wait on an approval and whose preview has not been
 * asked for yet, each once. `known` holds every call already asked for,
 * whatever came back. Pure.
 */
export function toolCallsAwaitingPreview(
  messages: readonly ChatMessageLike[],
  known: Readonly<Record<string, unknown>>,
): ToolApprovalPreviewRequest[] {
  const seen = new Set<string>()
  const out: ToolApprovalPreviewRequest[] = []
  for (const m of messages) {
    if (m.role !== 'tool' || !m.toolCall?.approvalId) continue
    const toolCallId = String(m.toolCall.toolCallId ?? '')
    const toolName = String(m.toolCall.name ?? '')
    if (!toolCallId || !toolName) continue
    if (known[toolCallId] !== undefined || seen.has(toolCallId)) continue
    seen.add(toolCallId)
    out.push({ toolCallId, toolName, args: m.toolCall.arguments })
  }
  return out
}

/** What a chat shows when a call's preview could not be made. Pure. */
export function toolApprovalPreviewError(e: unknown): ToolApprovalPreviewFailure {
  return { status: 'error', error: String((e as Error)?.message || e) }
}
