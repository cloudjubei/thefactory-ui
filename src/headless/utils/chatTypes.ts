// Structural types the chat-view compounds consume. Mirrors the domain
// shapes from `thefactory-tools` (`Chat`, `ChatMessage`, `ChatContext`,
// `ToolCall`, …) loosely rather than importing them, so web and desktop can
// hand over what they already hold without a cast. A message's cost is the
// exception: its billing and per-model rows are the tools' own cost vocabulary
// (`BillingBasis`, `ModelSpend` via `CostSpend`), imported as types only from
// the tools package this one already peers on, so a cost reads the same here
// as in every ledger and run record.

import type {
  BillingBasis,
  ChatBackgroundJobResult,
  ProcessManagerChatCard,
} from 'thefactory-tools/types'

import type { AgentQuestion } from './agentQuestionTypes'
import type { AgentRemedy } from './agentRemedyTypes'
import type { CostSpend } from './costDetailsTypes'
import type { CredentialCapture } from './credentialCaptureTypes'

export type ChatContextLike = {
  type:
    | 'PROJECT'
    | 'PROJECT_TOPIC'
    | 'STORY'
    | 'FEATURE'
    | 'AGENT_RUN_STORY'
    | 'AGENT_RUN_FEATURE'
    | 'GROUP'
    | 'GROUP_TOPIC'
    | 'GENERAL'
    | string
  projectId?: string
  storyId?: string
  featureId?: string
  agentRunId?: string
  groupId?: string
  groupTopicId?: string
  projectTopic?: string
}

/**
 * Where a tool call originates, used to badge the tool card:
 * - `internal` — one of our (thefactory) tools, whether called by an API agent
 *   or surfaced through a CLI's MCP transport,
 * - `native` — a CLI agent's own built-in tool (`Bash`, `command_execution`, …),
 * - `external-mcp` — a third-party MCP tool (reserved for future MCP servers).
 */
export type ToolOrigin = 'internal' | 'native' | 'external-mcp'

export type ToolCallLike = {
  toolCallId: string
  name: string
  arguments?: unknown
  /** Provenance of the tool (drives the origin badge). Defaults to `internal`
   * when unset — every API-agent tool is one of ours. */
  origin?: ToolOrigin
  /** The ask awaiting the user's decision on this call, when there is one. */
  approvalId?: string
  /**
   * The call waits on a decision the user makes elsewhere — in the approval
   * panel or a question card — so its row says so instead of spinning.
   */
  awaitingDecision?: boolean
  /** Who settled the call's ask — "Approved by you", "Approved by rule: …" — so every approval on screen can be traced to its decider. */
  decisionNote?: string
}

// Web's backend currently emits a free-form string; desktop's agent loop has
// a tighter enum. Renderers fall back gracefully for unknown values.
export type ToolResultTypeLike =
  | 'success'
  | 'errored'
  | 'aborted'
  | 'pending'
  | 'require_confirmation'
  | string

export type ToolResultLike = {
  type?: ToolResultTypeLike
  result?: unknown
  durationMs?: number
  /** The ask the call waits on, or the approval it ran under — an API chat turn's broker action. */
  actionId?: string
}

export type MessageUsageLike = {
  promptTokens?: number
  completionTokens?: number
  /** Tokens served from the provider's prompt cache. Web's `UsageModal`
   *  shows this in the per-message breakdown and the mobile peer mirrors
   *  it; safe to leave undefined for providers that don't report it. */
  cachedReadInputTokens?: number
  /** Input tokens written to a prompt cache. */
  cacheWriteInputTokens?: number
  /** What was charged: 0 on a subscription, absent when metered with no known price. */
  cost?: number
  /** The model an older API turn kept on its usage rather than on the message. */
  model?: string
  /** That model's provider, kept beside it on the same older turns. */
  provider?: string
  /** How the tokens were paid for. Absent on an API turn, which is metered. */
  billing?: BillingBasis
  /** The same tokens at list price, when a price is known. */
  listCostUsd?: number
  /** Per model — a CLI turn can use more than one — so its details are not one guessed row. */
  byModel?: CostSpend[]
}

export type ChatMessageLike = {
  id?: string
  role: 'user' | 'assistant' | 'system' | 'tool' | string
  content: string
  thinking?: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  usage?: MessageUsageLike
  toolCall?: ToolCallLike
  toolResult?: ToolResultLike
  error?: string
  // Some hosts attach the model directly to assistant messages. Accepts
  // either a plain name (`"gpt-4o"`) or a record (`{ model, provider }`)
  // since the desktop and web shapes diverge here.
  model?: string | { model?: string; provider?: string }
  /** CLI-agent replies carry the run id that produced them (the artifact anchor). */
  cliRunId?: string
  /** On a call that started a subagent: what that subagent said and called, in order. */
  subagentMessages?: ChatMessageLike[]
  /**
   * Set on the status-notification assistant message the cross-project resume writes back into the
   * sender chat — the id of the `FeatureRequest` whose completion produced this reply (D.7). Drives
   * the "Resumed by request" tag on the row.
   */
  featureRequestId?: string
  /**
   * Set on the assistant message announcing that a process run was launched — the id of that run.
   *
   * A launch the user approves after the agent's turn has ended executes host-side, so its result
   * never reaches the tool call that asked for it; that card keeps its `pending` stub. This is the
   * only place the run reaches the chat, and it is what the row's live process chip reads.
   */
  processRunId?: string
  /** Set on a message telling the person `processRunId` waits on them: when that park began. */
  processRunParkedAt?: number
  /** Set on a message announcing a group run — the id of that group run. */
  processGroupRunId?: string
  /**
   * Set on a user-role turn authored by ANOTHER AGENT handing work back (e.g. the verifier
   * returning its report to the developer). Names the handing-off agent. The row still sits on
   * the right (it IS a user turn to act on) but renders visually distinct from what the human typed.
   */
  handoffFrom?: string
  /** Set on each message a turn wrote in answer to another agent's hand-off — names that agent. */
  answersHandoffFrom?: string
  /** A message about a run's manager — its brief, or what the host recorded of its turn — shown as a card. */
  managerCard?: ProcessManagerChatCard
  /**
   * Set on the message the host delivered results of earlier calls by — calls
   * that finished in the background, one entry per call.
   */
  backgroundResults?: ChatBackgroundJobResult[]
}

// A tool grant the approval UI renders: one broker ask of the chat, whichever
// agent raised it — an API chat turn's or a CLI run's. Decided the same way on
// both: per ask, with a grant scope for an always-allow and edits in metadata.
export type PendingToolGrantDecision =
  | 'once'
  | 'always-in-chat'
  | 'always-everywhere'
  | 'trust-site'
  | 'deny'

/** Where an always-allow applies: only in the chat it was given in, or in every chat — either way whichever model or sign-in. */
export type AlwaysAllowScope = 'chat' | 'everywhere'

/** What an always-allow covers: every later call of the tool, or the one exact call repeated. */
export type GrantCovers = 'tool' | 'exact-call'

/** The always-allow control for one ask — see `alwaysAllowChoiceView`. */
export type AlwaysAllowChoiceView = {
  /** What one click does: always allow in `scope`, or (`undefined`) take a marked choice back. */
  primary: { scope: AlwaysAllowScope | undefined; label: string }
  /** Marked for Resume to apply. */
  marked: boolean
  /** The places a menu offers; empty when only one is possible. */
  options: { scope: AlwaysAllowScope; label: string; description: string; selected: boolean }[]
  /** The tooltip: what one click allows, or what Resume will apply. */
  title: string
}

/** Where the person decided: the ask's own card or row, or one Resume over the asks listed in front of them. */
export type PendingToolGrantDecisionVia = 'card' | 'approve-all'

export type PendingToolGrantData = {
  id: string
  /** The website a network or fetch ask is about — what "Trust this site" would trust. */
  trustableSite?: string
  /** The agent of the chat that raised the ask — what "same agent as this chat" names on a launch. */
  chatRunner: 'cli' | 'api'
  /** The run or API chat turn that raised it — whose rows decide it once they have loaded. */
  runId?: string
  label: string
  detail?: unknown
  /**
   * The tool the agent is blocked on, when the request names one. A CLI action's
   * `kind` groups permanent grants (`inspect-host-path`) and does not identify
   * the call, so the live transcript and the approval prompt both need this to
   * say WHICH tool is waiting.
   */
  toolName?: string
  /**
   * An ordinary tool call awaiting approval — decided on the call's own row
   * (toggle + Resume), not in the approval panel, which is kept for requests of
   * their own kind (a launch, a sandbox boundary, a credential).
   */
  inline?: boolean
  /** The call's arguments, so its row can be told apart from another call of the same tool. */
  args?: unknown
  /**
   * Set when the CLI action is an `askUser` question rather than a permission
   * request. Such a grant is answered with text (`answer`), not approved — the
   * confirmation modal must never render it as an Allow/Deny prompt.
   */
  question?: AgentQuestion
  /**
   * Set when the CLI action is a REMEDY a remediable tool raised (no bootable
   * AVD, missing SDK, …) rather than a permission request or question. Resolved
   * by choosing one of its options (`resolveRemedy`), never Allow/Deny.
   */
  remedy?: AgentRemedy
  /**
   * Where an always-allow is genuinely on offer, the default first; empty or
   * absent when none is. Some gated tools — a per-path filesystem read, a
   * per-use secret — refuse standing grants server side, and an ask raised
   * outside any chat can only be allowed everywhere.
   */
  alwaysAllowScopes?: readonly AlwaysAllowScope[]
  /** What an always-allow of this ask covers. */
  grantCovers?: GrantCovers
  /** The chat the ask was raised in — what an always-allow in this chat names. */
  chatContextId?: string
}

export type PendingToolGrant = PendingToolGrantData & {
  /**
   * Decide this ask. `metadata` carries options the user set ON the approval
   * (e.g. capture proof for this run); the host whitelists what it honours, so a
   * decision can never redirect the work. `via` is where the person decided it,
   * recorded on the ask — its own card unless said otherwise.
   */
  decide: (
    decision: PendingToolGrantDecision,
    metadata?: Record<string, unknown>,
    via?: PendingToolGrantDecisionVia,
  ) => Promise<void>
  /** Resolve a question grant with the user's typed answer. Question grants only. */
  answer?: (answer: string) => Promise<void>
  /**
   * Withdraw the question instead of answering it, handing the composer back.
   * Question grants only.
   *
   * Not the same as declining: declining is an ANSWER the agent carries on from,
   * cancelling takes the question off the table and resumes nothing — the user's
   * next message is what continues the conversation.
   */
  cancel?: () => Promise<void>
  /**
   * Resolve a remedy grant by choosing an option. `value` carries a hint (e.g.
   * the chosen AVD) when the option asks for one. Remedy grants only.
   */
  resolveRemedy?: (remedyId: string, value?: string) => Promise<void>
  /** Dismiss a remedy grant — the run's original error surfaces. Remedy grants only. */
  dismissRemedy?: () => Promise<void>
}

/** A grant the question card can render: a parsed question plus a text answer channel. */
export type PendingQuestionGrant = PendingToolGrant & {
  question: AgentQuestion
  answer: (answer: string) => Promise<void>
}

/**
 * Something the agent is parked on that only the user's answer releases: an
 * `askUser` question, or a credential form a request tool opened. Each takes the
 * composer's place until it is answered or withdrawn.
 */
export type UserAsk =
  | { kind: 'question'; id: string; grant: PendingQuestionGrant }
  | { kind: 'capture'; id: string; capture: CredentialCapture }

/** A grant the remedy card can render: a parsed remedy plus a resolve channel. */
export type PendingRemedyGrant = PendingToolGrant & {
  remedy: AgentRemedy
  resolveRemedy: (remedyId: string, value?: string) => Promise<void>
  dismissRemedy: () => Promise<void>
}

// Per-context live state the chat shell consumes — tracks the in-flight
// send, the partial assistant turn currently streaming, and any send error.
export type ChatLiveStateLike = {
  isSending: boolean
  pendingAssistant: { turn: number; content: string } | null
  sendError: Error | null
  /** Active CLI run id while it streams. When set, the chat shows the live
   * Agent-run message (framed like the persisted reply) instead of a raw-text bubble. */
  cliRunId?: string | null
  /** Model tag (`cli-agent/<tool>/<modelId>`) for the active CLI run — drives the
   * live Agent-run message's model chip. */
  cliModel?: string | null
  /** ISO start time of the active CLI run — the live Agent-run message's timestamp. */
  cliStartedAt?: string | null
  /** A delete is still landing on the server; the rows are already gone locally. */
  isDeleting?: boolean
}

/**
 * What keeps an ordinary tool ask off the approval panel before a row claims
 * it: the chat still loading its turns, or the ask's turn on screen without its
 * rows yet. Without it every ask flashes up as a panel card on opening a chat.
 */
export type ApprovalPanelHold = {
  /** The chat's turns are still loading. */
  loading?: boolean
  /** The turns on screen whose rows have not loaded yet. */
  unsettledRunIds?: ReadonlySet<string>
}
