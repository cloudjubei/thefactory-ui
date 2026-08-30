import type {
  Chat,
  ChatContext,
  CliRun,
  CliRunStatus,
  CliRunTranscriptEntry,
} from '../api/generated'
import type { ToolOrigin, ToolResultTypeLike } from './chatTypes'
import type { CliToolStepResultType, CliTranscriptStep } from './cliRunner'

/** A text or serialized value carried in the dump, cut to a bounded prefix. */
export type ChatDebugText = {
  /** Length of the ORIGINAL value, so a cut one still reports its real size. */
  length: number
  preview: string
  truncated: boolean
}

export type ChatDebugToolCall = {
  toolCallId: string
  name: string
  origin?: ToolOrigin
  arguments: ChatDebugText
}

export type ChatDebugToolResult = {
  type: ToolResultTypeLike
  durationMs?: number
  result: ChatDebugText
}

/** One message, either read off the chat record or derived from a run's transcript. */
export type ChatDebugMessage = {
  index: number
  role: string
  contentEmpty: boolean
  content: ChatDebugText
  startedAt?: string
  completedAt?: string
  durationMs?: number
  cliRunId?: string
  model?: string
  thinking?: ChatDebugText
  error?: string
  toolCall?: ChatDebugToolCall
  toolResult?: ChatDebugToolResult
}

/** One `normalizeCliTranscript` step, with its text/value fields bounded. */
export type ChatDebugStep = {
  kind: CliTranscriptStep['kind']
  at: number
  durationMs?: number
  text?: ChatDebugText
  summary?: string
  raw?: ChatDebugText
  toolName?: string
  origin?: ToolOrigin
  toolCallId?: string
  input?: ChatDebugText
  result?: ChatDebugText
  resultType?: CliToolStepResultType
}

export type ChatDebugCliRun = {
  id: string
  status: CliRunStatus
  cli?: { tool: string; version: string }
  modelId?: string
  effort?: string
  projectId: string
  chatContextId?: string
  storyId?: string
  createdAt: number
  updatedAt: number
  durationMs?: number
  costUSD?: number
  exitCode?: number
  abortReason?: string
  /**
   * The model tag the chat's placeholder message carries for this run — what
   * `cliTranscriptToMessages` is handed when the chat renders it.
   */
  renderedModelTag?: string
  transcriptEntryCount: number
  transcriptEntriesOmitted: number
  /** Verbatim `{ at, kind, payload }` entries — the ground truth of what the CLI emitted. */
  transcript: CliRunTranscriptEntry[]
  stepCount: number
  stepsOmitted: number
  steps: ChatDebugStep[]
  derivedMessageCount: number
  derivedMessagesOmitted: number
  derivedMessages: ChatDebugMessage[]
}

/** The chat's CLI-runner binding — which agent answers in this chat. */
export type ChatDebugCliRunner = {
  tool: string
  model?: string
  effort?: string
  execMode?: string
}

export type ChatDebugCounts = {
  messages: number
  messagesOmitted: number
  cliRuns: number
  transcriptEntries: number
  transcriptEntriesOmitted: number
  steps: number
  stepsOmitted: number
  derivedMessages: number
  derivedMessagesOmitted: number
}

/** The size caps the document was built under, so a reader knows what bounded it. */
export type ChatDebugLimits = {
  textPrefixChars: number
  messagesBudgetChars: number
  rawTranscriptBudgetChars: number
  interpretedBudgetChars: number
}

export type ChatDebugDump = {
  kind: 'chat-debug-dump'
  version: number
  generatedAt: string
  chatContextKey: string
  context: ChatContext
  chatTitle?: string
  chatState?: string
  cliRunner?: ChatDebugCliRunner
  /** Whether thinking steps are rendered — `cliTranscriptToMessages` drops them when false. */
  showThinking: boolean
  /** True when any section was cut by a budget (per-value cuts are flagged on the value). */
  truncated: boolean
  counts: ChatDebugCounts
  limits: ChatDebugLimits
  messages: ChatDebugMessage[]
  runs: ChatDebugCliRun[]
  /** Set when the run listing could not be fetched — see `ChatDebugDumpInput.runsError`. */
  runsError?: string
}

export type ChatDebugDumpInput = {
  context: ChatContext
  chat?: Chat | null
  runs?: readonly CliRun[]
  /**
   * Why the run listing is missing, when it could not be fetched.
   *
   * An empty `runs` otherwise reads as "this chat had no CLI runs", which is
   * indistinguishable from the diagnostic having failed to load them — and that
   * is the exact case the dump is opened to explain.
   */
  runsError?: string
  /** ISO timestamp stamped on the document. Defaults to now. */
  generatedAt?: string
  /** The `cliShowThinking` preference the chat renders under. Defaults to true. */
  showThinking?: boolean
}

/** A serialized dump plus its UTF-8 size, which the modal reports. */
export type ChatDebugDumpSerialized = {
  json: string
  byteSize: number
}
