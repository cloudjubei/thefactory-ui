// Pure mappers behind usePendingToolGrants — turn a chat's broker asks (an API
// turn's and a CLI run's alike) into the PendingToolGrantData shape, and route
// a decision to the broker outcome. No React, no I/O.

import { getChatContext, getChatContextKey, isApiChatTurnId } from 'thefactory-tools/utils'
import type { ChatContextAgentRunStory } from '../api/generated'
import { isQuestionAction, parseQuestionPayload } from './agentQuestions'
import { isToolAskDecidedOnRow } from './approvalGrant'
import { gitChangeCard } from './gitChangeApproval'
import { SITE_ASK_KINDS, USER_INPUT_ACTION_KINDS } from './pendingToolGrantsConstants'
import { isRemedyAction, parseRemedyPayload } from './agentRemedy'
import type { PendingToolGrantData, PendingToolGrantDecision } from './chatTypes'
import type { CliDecidedAsk, CliPendingAsk } from './cliRunActivityTypes'
import {
  alwaysAllowScopeOf,
  cliAlwaysAllowScopes,
  grantCoversOf,
  grantRuleText,
} from './alwaysAllow'
import type { PermanentGrantScope } from '../api/generated'

/** Subset of a CLI `PendingAction` this mapper needs. */
export type CliPendingActionLike = {
  id: string
  /** The run or API chat turn that raised it. */
  runId?: string
  kind: string
  payload?: unknown
  /** Server-side refusal of standing grants; every call asks again. */
  noPermanentGrant?: boolean
  /** The chat the ask was raised in, when the run has one. */
  chatContextId?: string
  /** What a standing grant covers — the tool alone (`{ tool }`) or the whole call. */
  grantPayload?: unknown
}

/** A broker action as a decided ask's row needs it — see {@link cliDecidedAsks}. */
export type CliDecidedActionLike = CliPendingActionLike & {
  runId: string
  chatContextId?: string
  status: 'pending' | 'approved' | 'denied' | 'expired'
  toolName?: string
  toolArgs?: unknown
  decisionReason?: string
  /** Why the host withdrew it — what it acted on was settled elsewhere. */
  withdrawnReason?: string
  decisionMetadata?: unknown
  executedAt?: number
  executedInRun?: string
  execution?: { ok: boolean; result: string; durationMs?: number }
  decidedBy?: string
  decidedVia?: 'card' | 'approve-all' | 'moved-on' | 'grant'
  /** Where the standing grant that approved it applies. */
  grantScope?: PermanentGrantScope
}

/** Subset of a `CliRun` needed to pick the run a chat's approvals belong to. */
export type CliRunLike = {
  id: string
  chatContextId?: string
  createdAt?: number
  /** The story a run is executing for — set on the per-feature sub-runs of a story run. */
  storyId?: string
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

/** `cli:run-update` types that change what a decided ask's row shows. */
const ASK_OUTCOME_EVENT_TYPES: ReadonlySet<string> = new Set(['actionDecided', 'actionExecuted'])

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

/**
 * Whether a `cli:run-update` action event may change one chat's asks: its action
 * names that chat, the chat already shows it (`shows`), or it names no chat at
 * all. An ask raised or decided in another chat leaves this chat's asks as they
 * are, so an open chat does not re-read them for every ask anywhere.
 */
export function cliActionEventConcernsChat(
  data: unknown,
  chatContextId: string,
  shows?: (actionId: string) => boolean,
): boolean {
  const action = (data as { event?: { action?: { id?: unknown; chatContextId?: unknown } } } | null)
    ?.event?.action
  if (!action || typeof action.chatContextId !== 'string') return true
  if (action.chatContextId === chatContextId) return true
  return typeof action.id === 'string' && shows !== undefined && shows(action.id)
}

/**
 * Whether a run's `cli:run-update` lifecycle event may change which run one
 * chat has active: the event names that chat, or names none (a resumed run, an
 * older backend). A run another chat started leaves this chat alone, so an open
 * chat does not re-resolve its run for every run anywhere.
 */
export function cliRunLifecycleConcernsChat(data: unknown, chatContextId: string): boolean {
  const named = (data as { chatContextId?: unknown } | null)?.chatContextId
  return typeof named !== 'string' || named === chatContextId
}

/** True when a `cli:run-update` payload says an ask was decided or an approval carried out. */
export function isAskOutcomeEvent(data: unknown): boolean {
  return ASK_OUTCOME_EVENT_TYPES.has(cliRunUpdateType(data))
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
 * Whether a `completion:turn` event says this chat's turn started (`true`) or
 * stopped (`false`) on the server; `undefined` for any other chat's.
 */
export function chatTurnActivity(data: unknown, chatContextId: string): boolean | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const event = data as { chatContextId?: unknown; active?: unknown }
  if (event.chatContextId !== chatContextId || typeof event.active !== 'boolean') return undefined
  return event.active
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

/**
 * True when a run is this story agent-run chat's own, or one of the per-feature
 * sub-runs it spawned. A sub-run keeps its parent's `agentRunId` under a feature
 * chat key, so the `agentRunId` is what separates it from the next process
 * step's agent running in the same story.
 */
function belongsToStoryAgentRun(
  chatContextId: string | undefined,
  storyChat: ChatContextAgentRunStory,
  storyChatKey: string,
): boolean {
  if (!chatContextId) return false
  if (chatContextId === storyChatKey) return true
  const runChat = getChatContext(chatContextId)
  return (
    runChat?.type === 'AGENT_RUN_FEATURE' &&
    runChat.projectId === storyChat.projectId &&
    runChat.storyId === storyChat.storyId &&
    runChat.agentRunId === storyChat.agentRunId
  )
}

/**
 * The live run a STORY agent-run chat should surface: its own run, or the
 * newest per-feature sub-run of the same agent run. A story run spawns one run
 * PER FEATURE keyed to that feature's chat, so matching on the story chat key
 * alone would miss the work; matching on the story alone surfaces whichever
 * process step's agent happens to be running next.
 *
 * Mirrors {@link pickActiveCliRunId}: the binding is re-checked here rather than
 * trusted from the query, so a dropped filter cannot surface another chat's run.
 */
export function pickActiveStoryRunId(
  runs: readonly CliRunLike[] | undefined,
  storyChat: ChatContextAgentRunStory,
): string | undefined {
  const storyChatKey = getChatContextKey(storyChat)
  let best: CliRunLike | undefined
  for (const run of runs ?? []) {
    if (!run || typeof run.id !== 'string' || run.id.length === 0) continue
    if (!belongsToStoryAgentRun(run.chatContextId, storyChat, storyChatKey)) continue
    if (!best || (run.createdAt ?? 0) >= (best.createdAt ?? 0)) best = run
  }
  return best?.id
}

/**
 * The tool a CLI gated action is blocked on. A tool the host carries out on
 * approval — a host-dispatched tool, and the sandbox-boundary requests — raises
 * its payload as `{ tool, args, detail? }`, so the name is there; a payload that
 * names none (a cap raise, an older action) falls back to its kind label.
 */
export function pendingActionToolName(action: CliPendingActionLike): string | undefined {
  const payload = action.payload
  if (typeof payload !== 'object' || payload === null) return undefined
  const tool = (payload as { tool?: unknown }).tool
  return typeof tool === 'string' && tool.length > 0 ? tool : undefined
}

/**
 * The website a network or fetch ask is about — the host its standing grant
 * would name — for "Trust this site"; none for any other ask, or one that may
 * not be granted. Pure.
 */
export function trustableSiteOf(
  action: Pick<CliPendingActionLike, 'kind' | 'grantPayload' | 'noPermanentGrant'>,
): string | undefined {
  if (action.noPermanentGrant === true || !SITE_ASK_KINDS.includes(action.kind)) return undefined
  const host = (action.grantPayload as { host?: unknown } | null | undefined)?.host
  return typeof host === 'string' && host.length > 0 ? host : undefined
}

const whenSite = (site: string | undefined) => (site ? { trustableSite: site } : {})

/**
 * Whether an ask is decided on its call's own row — every ask is, whatever its
 * kind, except one answered rather than approved (`USER_INPUT_ACTION_KINDS`)
 * and a tool named to keep the composer's place (see
 * {@link isToolAskDecidedOnRow}). An ask no row claims still reaches the
 * approval panel. Pure.
 */
export function isActionDecidedOnRow(kind: string, toolName: string | undefined): boolean {
  return !USER_INPUT_ACTION_KINDS.includes(kind) && isToolAskDecidedOnRow(toolName)
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
  const args = pendingActionArgs(action)
  const grant: PendingToolGrantData = {
    id: action.id,
    chatRunner: action.runId !== undefined && isApiChatTurnId(action.runId) ? 'api' : 'cli',
    ...(action.runId !== undefined ? { runId: action.runId } : {}),
    label: toolName ?? formatActionLabel(action.kind),
    detail: action.payload,
    alwaysAllowScopes: cliAlwaysAllowScopes(action),
    ...whenSite(trustableSiteOf(action)),
    grantCovers: grantCoversOf(action.grantPayload ?? action.payload),
    ...(action.chatContextId ? { chatContextId: action.chatContextId } : {}),
    ...(toolName ? { toolName } : {}),
    ...(isActionDecidedOnRow(action.kind, toolName) ? { inline: true } : {}),
    ...(args !== undefined ? { args } : {}),
  }
  if (isQuestionAction(action)) grant.question = parseQuestionPayload(action.payload)
  if (isRemedyAction(action)) grant.remedy = parseRemedyPayload(action.payload)
  return grant
}

/** The arguments of the call a CLI action was raised for, from its `{ tool, args }` payload. */
function pendingActionArgs(action: CliPendingActionLike): unknown {
  const payload = action.payload
  if (typeof payload !== 'object' || payload === null) return undefined
  return (payload as { args?: unknown }).args
}

/**
 * The asks a row can be tied to — a CLI turn's transcript row or an API turn's
 * stored one: every one, so the row of a call waiting on a question or a launch
 * reads as waiting too — only those `inline` are decided on the row.
 */
export function cliRowAsks(grants: readonly PendingToolGrantData[] | undefined): CliPendingAsk[] {
  const asks: CliPendingAsk[] = []
  for (const grant of grants ?? []) {
    asks.push({
      id: grant.id,
      ...(grant.toolName !== undefined ? { toolName: grant.toolName } : {}),
      ...(grant.args !== undefined ? { args: grant.args } : {}),
      decidedOnRow: grant.inline === true,
    })
  }
  return asks
}

/**
 * A chat's decided CLI actions as the asks their rows show — named by the tool
 * the action records, or the one its payload names. Pending ones are left out.
 */
export function cliDecidedAsks(actions: readonly CliDecidedActionLike[]): CliDecidedAsk[] {
  const asks: CliDecidedAsk[] = []
  for (const action of actions) {
    if (action.status === 'pending') continue
    const toolName = action.toolName ?? pendingActionToolName(action)
    const args = action.toolArgs ?? pendingActionArgs(action)
    const answer = answerOf(action.decisionMetadata)
    const changeFiles = gitChangeCard({ detail: action.payload })?.diff?.files
    asks.push({
      id: action.id,
      runId: action.runId,
      status: action.status,
      ...(toolName !== undefined ? { toolName } : {}),
      ...(args !== undefined ? { args } : {}),
      ...(action.decisionReason !== undefined ? { decisionReason: action.decisionReason } : {}),
      ...(action.withdrawnReason !== undefined ? { withdrawnReason: action.withdrawnReason } : {}),
      ...(answer !== undefined ? { answer } : {}),
      ...(action.executedAt !== undefined ? { executedAt: action.executedAt } : {}),
      ...(action.executedInRun !== undefined ? { executedInRun: action.executedInRun } : {}),
      ...(action.execution !== undefined ? { execution: action.execution } : {}),
      ...(action.decidedBy !== undefined ? { decidedBy: action.decidedBy } : {}),
      ...(action.decidedVia !== undefined ? { decidedVia: action.decidedVia } : {}),
      ...(action.decidedVia === 'grant'
        ? { rule: grantRuleText(toolName, action.grantPayload, action.grantScope) }
        : {}),
      ...(changeFiles ? { changeFiles } : {}),
    })
  }
  return asks
}

function answerOf(metadata: unknown): string | undefined {
  if (typeof metadata !== 'object' || metadata === null) return undefined
  const answer = (metadata as { answer?: unknown }).answer
  return typeof answer === 'string' ? answer : undefined
}

/**
 * The decided asks with one action's latest state folded in — added, or in
 * place of the copy held. What the decision event itself carries, so a row
 * turns the moment the decision lands instead of after a re-read.
 */
export function withDecidedAction(
  asks: readonly CliDecidedAsk[],
  action: CliDecidedActionLike,
): readonly CliDecidedAsk[] {
  const [ask] = cliDecidedAsks([action])
  if (!ask) return asks
  const i = asks.findIndex((a) => a.id === ask.id)
  if (i < 0) return [ask, ...asks]
  const next = [...asks]
  next[i] = ask
  return next
}

/**
 * The asks a turn's rows tie to: those pending now, plus any that just left
 * the pending list but whose decision has not arrived — those read as under
 * way (`decidedOnRow: false`), not as "did not run", for that moment.
 */
export function withAsksAwaitingOutcome(
  pending: readonly CliPendingAsk[],
  previous: readonly CliPendingAsk[],
  decidedIds: ReadonlySet<string>,
): CliPendingAsk[] {
  const pendingIds = new Set(pending.map((a) => a.id))
  const awaiting = previous
    .filter((a) => !pendingIds.has(a.id) && !decidedIds.has(a.id))
    .map((a) => ({ ...a, decidedOnRow: false, awaitingOutcome: true }))
  return [...pending, ...awaiting]
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
  if (decision === 'deny') return 'denied'
  return alwaysAllowScopeOf(decision) ? 'approved-permanent' : 'approved'
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
