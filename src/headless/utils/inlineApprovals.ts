import type { ChatMessageLike, PendingToolGrantDecision } from './chatTypes'

/** The asks a turn's rows show — each tool row tied to an undecided ask — in row order. Pure. */
export function claimedAskIds(messages: readonly ChatMessageLike[]): string[] {
  const ids: string[] = []
  for (const m of messages) {
    const id = m.role === 'tool' ? m.toolCall?.approvalId : undefined
    if (id !== undefined) ids.push(id)
  }
  return ids
}

/**
 * What one Resume decides for each ask a turn shows: the toggled ones approved
 * — permanently when marked "Always allow" — and every other one declined, the
 * API batch's rule. Pure.
 */
export function inlineApprovalDecisions(
  askIds: readonly string[],
  selectedIds: readonly string[],
  alwaysIds: readonly string[] = [],
): { id: string; decision: PendingToolGrantDecision }[] {
  const selected = new Set(selectedIds)
  const always = new Set(alwaysIds)
  return askIds.map((id) => ({
    id,
    decision: !selected.has(id) ? 'deny' : always.has(id) ? 'permanent' : 'once',
  }))
}
