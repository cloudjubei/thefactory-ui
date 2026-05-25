// Structural types the chat-view compounds consume. Mirrors the domain
// shapes from `thefactory-tools` (`Chat`, `ChatMessage`, `ChatContext`,
// `ToolCall`, …) but stays in this package so consumers don't take a hard
// dep on the tools package — both web and desktop already produce data in
// this shape.

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

export type ToolCallLike = {
  toolCallId: string
  name: string
  arguments?: unknown
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
}

export type PendingToolConfirmationLike = {
  toolCalls: ToolCallLike[]
}

// Per-context live state the chat shell consumes — tracks the in-flight
// send, the partial assistant turn currently streaming, the queue of tool
// calls awaiting confirmation, and any send error.
export type ChatLiveStateLike = {
  isSending: boolean
  pendingAssistant: { turn: number; content: string } | null
  pendingToolConfirmation: PendingToolConfirmationLike | null
  sendError: Error | null
}
