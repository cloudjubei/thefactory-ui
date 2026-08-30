// Structural types the chat-view compounds consume. Mirrors the domain
// shapes from `thefactory-tools` (`Chat`, `ChatMessage`, `ChatContext`,
// `ToolCall`, …) but stays in this package so consumers don't take a hard
// dep on the tools package — both web and desktop already produce data in
// this shape.

import type { AgentQuestion } from './agentQuestionTypes'

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
}

export type MessageUsageLike = {
  promptTokens?: number
  completionTokens?: number
  /** Tokens served from the provider's prompt cache. Web's `UsageModal`
   *  shows this in the per-message breakdown and the mobile peer mirrors
   *  it; safe to leave undefined for providers that don't report it. */
  cachedReadInputTokens?: number
  cost?: number
  model?: string
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
  /**
   * Set on the status-notification assistant message the cross-project resume writes back into the
   * sender chat — the id of the `FeatureRequest` whose completion produced this reply (D.7). Drives
   * the "Resumed by request" tag on the row.
   */
  featureRequestId?: string
}

export type PendingToolConfirmationLike = {
  toolCalls: ToolCallLike[]
}

// A unified tool-grant the confirmation UI renders, sourced from either the
// API `require_confirmation` queue (`source: 'api'`) or a CLI agent's gated
// `PendingAction` (`source: 'cli'`). `permanent` is only valid for `'cli'`
// grants (maps to the broker's `approved-permanent`); the API path has no
// notion of a remembered grant.
export type PendingToolGrantSource = 'api' | 'cli'
export type PendingToolGrantDecision = 'once' | 'permanent' | 'deny'

export type PendingToolGrantData = {
  id: string
  source: PendingToolGrantSource
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
   * Set when the CLI action is an `askUser` question rather than a permission
   * request. Such a grant is answered with text (`answer`), not approved — the
   * confirmation modal must never render it as an Allow/Deny prompt.
   */
  question?: AgentQuestion
  /**
   * Whether "allow permanently" is genuinely on offer. Some gated tools — a
   * per-path filesystem read, a per-use secret — refuse standing grants server
   * side, where a permanent decision is silently downgraded to a single use.
   * Offering the button anyway would tell the user they had made a lasting
   * choice that was never recorded.
   */
  canGrantPermanently?: boolean
}

export type PendingToolGrant = PendingToolGrantData & {
  decide: (decision: PendingToolGrantDecision) => Promise<void>
  /** Resolve a question grant with the user's typed answer. Question grants only. */
  answer?: (answer: string) => Promise<void>
}

/** A grant the question card can render: a parsed question plus a text answer channel. */
export type PendingQuestionGrant = PendingToolGrant & {
  question: AgentQuestion
  answer: (answer: string) => Promise<void>
}

// Per-context live state the chat shell consumes — tracks the in-flight
// send, the partial assistant turn currently streaming, the queue of tool
// calls awaiting confirmation, and any send error.
export type ChatLiveStateLike = {
  isSending: boolean
  pendingAssistant: { turn: number; content: string } | null
  pendingToolConfirmation: PendingToolConfirmationLike | null
  sendError: Error | null
  /** Active CLI run id while it streams. When set, the chat shows the live
   * Agent-run message (framed like the persisted reply) instead of a raw-text bubble. */
  cliRunId?: string | null
  /** Model tag (`cli-agent/<tool>/<modelId>`) for the active CLI run — drives the
   * live Agent-run message's model chip. */
  cliModel?: string | null
  /** ISO start time of the active CLI run — the live Agent-run message's timestamp. */
  cliStartedAt?: string | null
}
