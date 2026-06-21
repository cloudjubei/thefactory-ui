// Pure mappers behind usePendingToolGrants — turn API tool-calls and CLI
// PendingActions into the unified PendingToolGrantData shape, and route a
// decision to the right CLI broker outcome. No React, no I/O.

import type { PendingToolGrantData, PendingToolGrantDecision, ToolCallLike } from './chatTypes'

/** Subset of a CLI `PendingAction` this mapper needs. */
export type CliPendingActionLike = {
  id: string
  kind: string
  payload?: unknown
}

/**
 * Broker action kinds that are NOTIFICATIONS, not approvable tool grants —
 * they must never surface in the tool-confirmation UI as a popup. `auth-expired`
 * is raised when host-side OAuth refresh fails; there's nothing to approve (the
 * run already errors with a "re-login required" message, surfaced inline), so a
 * permission popup is both useless and confusing.
 */
const NON_GRANT_ACTION_KINDS: ReadonlySet<string> = new Set(['auth-expired'])

/** True when an action represents an approvable grant (gated tool / cap-raise / network-unlock). */
export function isToolGrantAction(action: CliPendingActionLike): boolean {
  return !NON_GRANT_ACTION_KINDS.has(action.kind)
}

/** Map an API `require_confirmation` tool-call to a grant (id = toolCallId). */
export function apiToolCallToGrant(toolCall: ToolCallLike): PendingToolGrantData {
  return {
    id: toolCall.toolCallId,
    source: 'api',
    label: toolCall.name,
    detail: toolCall.arguments,
  }
}

/** Map a CLI gated `PendingAction` to a grant (id = actionId), labelling from its kind. */
export function cliPendingActionToGrant(action: CliPendingActionLike): PendingToolGrantData {
  return {
    id: action.id,
    source: 'cli',
    label: formatActionLabel(action.kind),
    detail: action.payload,
  }
}

/** Humanise an action `kind` discriminator: `'network-unlock'` → `'Network unlock'`. */
export function formatActionLabel(kind: string): string {
  const words = kind.split(/[-_\s]+/).filter(Boolean)
  if (words.length === 0) return kind
  return words
    .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

/** Route a UI decision to the CLI broker `decideCliAgentAction` outcome. */
export function cliDecideOutcome(
  decision: PendingToolGrantDecision,
): 'approved' | 'approved-permanent' | 'denied' {
  switch (decision) {
    case 'once':
      return 'approved'
    case 'permanent':
      return 'approved-permanent'
    case 'deny':
      return 'denied'
  }
}
