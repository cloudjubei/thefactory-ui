import { alwaysAllowDecision } from './alwaysAllow'
import type {
  AlwaysAllowScope,
  ChatMessageLike,
  PendingToolGrantDecision,
  PendingToolGrantDecisionVia,
} from './chatTypes'

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
 * — always allowed where marked "Always allow", in the place chosen — and every
 * other one declined. Pure.
 */
export function inlineApprovalDecisions(
  askIds: readonly string[],
  selectedIds: readonly string[],
  always: Readonly<Record<string, AlwaysAllowScope>> = {},
): { id: string; decision: PendingToolGrantDecision }[] {
  const selected = new Set(selectedIds)
  return askIds.map((id) => {
    const scope = always[id]
    return {
      id,
      decision: !selected.has(id) ? 'deny' : scope ? alwaysAllowDecision(scope) : 'once',
    }
  })
}

/** Where one Resume's decisions were taken: an approve-all when it settled several listed asks at once. Pure. */
export function inlineApprovalVia(askIds: readonly string[]): PendingToolGrantDecisionVia {
  return askIds.length > 1 ? 'approve-all' : 'card'
}
