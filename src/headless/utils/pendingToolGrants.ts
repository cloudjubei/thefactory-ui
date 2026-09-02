// Pure mappers behind usePendingToolGrants — turn API tool-calls and CLI
// PendingActions into the unified PendingToolGrantData shape, and route a
// decision to the right CLI broker outcome. No React, no I/O.

import { isQuestionAction, parseQuestionPayload } from './agentQuestions'
import type { PendingToolGrantData, PendingToolGrantDecision, ToolCallLike } from './chatTypes'

/** Subset of a CLI `PendingAction` this mapper needs. */
export type CliPendingActionLike = {
  id: string
  kind: string
  payload?: unknown
  /** Server-side refusal of standing grants; every call asks again. */
  noPermanentGrant?: boolean
}

/** Subset of a `CliRun` needed to pick the run a chat's approvals belong to. */
export type CliRunLike = {
  id: string
  chatContextId?: string
  createdAt?: number
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

/** `cli:run-update` types that change a run's set of pending actions. */
const ACTION_UPDATE_EVENT_TYPES: ReadonlySet<string> = new Set(['actionRequest', 'actionDecided'])

/**
 * `cli:run-update` types that can change WHICH run a chat has active. `started`
 * / `finished` / `error` / `statusChanged` bracket a run's life; `actionRequest`
 * is included because an approval raised on a run this client never observed
 * starting is exactly the case run discovery exists to rescue.
 */
const RUN_LIFECYCLE_EVENT_TYPES: ReadonlySet<string> = new Set([
  'started',
  'statusChanged',
  'finished',
  'error',
  'actionRequest',
])

function cliRunUpdateType(data: unknown): string {
  const type = (data as { type?: unknown } | null | undefined)?.type
  return typeof type === 'string' ? type : ''
}

/** True when a `cli:run-update` payload means the run's pending actions should be re-read. */
export function isCliActionUpdateEvent(data: unknown): boolean {
  return ACTION_UPDATE_EVENT_TYPES.has(cliRunUpdateType(data))
}

/** True when a `cli:run-update` payload means the chat's active run should be re-resolved. */
export function isCliRunLifecycleEvent(data: unknown): boolean {
  return RUN_LIFECYCLE_EVENT_TYPES.has(cliRunUpdateType(data))
}

/**
 * The run whose gated actions a chat should surface: the most recently created
 * one bound to this chat. The chat binding is re-checked here rather than
 * trusted from the query that produced `runs`, so a dropped or ignored filter
 * can never raise another chat's approval prompt on this one.
 */
export function pickActiveCliRunId(
  runs: readonly CliRunLike[] | undefined,
  chatContextId: string,
): string | undefined {
  if (!chatContextId) return undefined
  let best: CliRunLike | undefined
  for (const run of runs ?? []) {
    if (!run || typeof run.id !== 'string' || run.id.length === 0) continue
    if (run.chatContextId !== chatContextId) continue
    if (!best || (run.createdAt ?? 0) >= (best.createdAt ?? 0)) best = run
  }
  return best?.id
}

/** Map an API `require_confirmation` tool-call to a grant (id = toolCallId). */
export function apiToolCallToGrant(toolCall: ToolCallLike): PendingToolGrantData {
  return {
    id: toolCall.toolCallId,
    source: 'api',
    label: toolCall.name,
    detail: toolCall.arguments,
    toolName: toolCall.name,
  }
}

/**
 * The tool a CLI gated action is blocked on. `registerGatedExecutableMcpTools`
 * builds the broker payload as `{ tool, args }`, so the name is there for a
 * host-dispatched tool; a broker-only action (a sandbox-boundary request with a
 * hand-built payload) names none and falls back to its kind label.
 */
export function pendingActionToolName(action: CliPendingActionLike): string | undefined {
  const payload = action.payload
  if (typeof payload !== 'object' || payload === null) return undefined
  const tool = (payload as { tool?: unknown }).tool
  return typeof tool === 'string' && tool.length > 0 ? tool : undefined
}

/**
 * Map a CLI gated `PendingAction` to a grant (id = actionId), labelling from the
 * tool it names — the kind (`inspect-host-path`) groups permanent grants and is
 * only the fallback. An `askUser` question additionally carries its parsed
 * payload, which is what routes it to the question card instead of the
 * permission modal.
 */
export function cliPendingActionToGrant(action: CliPendingActionLike): PendingToolGrantData {
  const toolName = pendingActionToolName(action)
  const grant: PendingToolGrantData = {
    id: action.id,
    source: 'cli',
    label: toolName ?? formatActionLabel(action.kind),
    detail: action.payload,
    canGrantPermanently: action.noPermanentGrant !== true,
    ...(toolName ? { toolName } : {}),
  }
  if (isQuestionAction(action)) grant.question = parseQuestionPayload(action.payload)
  return grant
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

/**
 * Human-readable reason a grant decision was refused. The decide route answers
 * an already-terminal action with 409 `{ error }` (e.g. the approval expired
 * while it was displayed) — the generated client surfaces that as the response
 * body, a plain Error, or a string depending on the transport. Whatever the
 * shape, the user must SEE why nothing happened; a silent no-op is what lost
 * the launch approval in the first place.
 */
export function grantDecideErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim().length > 0) return err
  if (err && typeof err === 'object') {
    const body = err as { error?: unknown; message?: unknown }
    if (typeof body.error === 'string' && body.error.trim().length > 0) return body.error
    if (typeof body.message === 'string' && body.message.trim().length > 0) return body.message
  }
  return 'The decision could not be applied — it may already be decided or expired.'
}
