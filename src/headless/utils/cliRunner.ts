// Pure CLI-runner helpers — the testable core behind CliConfigsContext,
// useChatCliRunner, and the runner-aware chat dispatch. No React, no I/O.

import { backgroundJobIdOf } from './backgroundJobs'
import { BACKGROUND_TOOL_RESULT_TYPE } from './backgroundJobsConstants'
import { isAlreadyExecuted, stableStringify, withoutNudgedReanswer } from 'thefactory-tools/utils'
import type {
  ChatCliRunner,
  CliConfigsActiveState,
  CliRunnerDispatchOptions,
  CliRunStatus,
  CliRunTranscriptEntry,
  CliTool,
  FilesEmittedArtifact,
  StartCliAgentRunData,
} from '../api/generated'
import type { ChatMessageLike, MessageUsageLike, ToolOrigin } from './chatTypes'
import {
  CLI_HOST_ERRORED_OUTCOME,
  CLI_HOST_UNRUN_OUTCOMES,
  CLI_RUN_FAILED_FALLBACK_NOTICE,
} from './cliRunActivityConstants'
import type { CliDecidedAsk, CliHostCallOutcome, CliPendingAsk } from './cliRunActivityTypes'
import {
  ASK_CANCELLED_REASON,
  ASK_CARRIED_OUT_NOTE,
  ASK_DECLINED_REASON,
  ASK_EXPIRED_REASON,
  DECIDED_BY_RULE_NOTE,
  DECIDED_BY_YOU_APPROVE_ALL_NOTE,
  DECIDED_BY_YOU_NOTE,
  DECLINED_BY_MOVING_ON_NOTE,
  DECLINED_BY_YOU_NOTE,
  TURN_ENDED_REASON,
} from './cliRunnerConstants'

export type StartCliRunBodyInput = {
  projectId: string
  prompt: string
  chatContextId?: string
  storyId?: string
}

/**
 * Map a chat's persisted {@link ChatCliRunner} to a `startCliAgentRun` request
 * body. The two shapes diverge: the chat stores `{ tool, credentialId }` while
 * the run endpoint expects `{ cli, authCredentialId }` — so `tool → cli` and
 * `credentialId → authCredentialId`. `tool` is a loose string on the chat side;
 * the runner validates the CLI at its boundary.
 */
export function chatCliRunnerToStartRunBody(
  runner: ChatCliRunner,
  input: StartCliRunBodyInput,
): StartCliAgentRunData['body'] {
  return {
    projectId: input.projectId,
    cli: runner.tool as CliTool,
    prompt: input.prompt,
    ...(input.chatContextId ? { chatContextId: input.chatContextId } : {}),
    ...(input.storyId ? { storyId: input.storyId } : {}),
    ...(runner.credentialId ? { authCredentialId: runner.credentialId } : {}),
    ...(runner.apiKeyCredentialId ? { apiKeyCredentialId: runner.apiKeyCredentialId } : {}),
    ...(runner.model ? { modelId: runner.model } : {}),
    ...(cliEffort(runner.effort) ? { effort: cliEffort(runner.effort) } : {}),
  }
}

/** The reasoning-effort levels a run request accepts. */
const CLI_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

/**
 * A chat's stored effort, narrowed to what a run request accepts.
 *
 * The chat side keeps it as a loose string, so a value that predates the
 * current level set — or one a hand-edited chat record carries — must be
 * DROPPED rather than sent: the run would be rejected at the boundary, and the
 * user would see a launch fail for a setting they cannot see.
 */
export function cliEffort(value: string | undefined): (typeof CLI_EFFORTS)[number] | undefined {
  return CLI_EFFORTS.find((level) => level === value)
}

/**
 * Map a chat's {@link ChatCliRunner} to the {@link CliRunnerDispatchOptions} the
 * runner-aware chat-send route expects (`tool → cli`, `credentialId →
 * authCredentialId`). Used at the chat→CLI dispatch boundary.
 */
export function chatCliRunnerToDispatchOptions(runner: ChatCliRunner): CliRunnerDispatchOptions {
  return {
    cli: runner.tool as CliTool,
    ...(runner.credentialId ? { authCredentialId: runner.credentialId } : {}),
    ...(runner.apiKeyCredentialId ? { apiKeyCredentialId: runner.apiKeyCredentialId } : {}),
    ...(runner.model ? { model: runner.model } : {}),
    ...(cliEffort(runner.effort) ? { effort: cliEffort(runner.effort) } : {}),
  }
}

/**
 * Displayable assistant text from a single CLI transcript entry, for the live
 * streaming preview. Mirrors the runner's `assistantTextBlocks`: only
 * `assistant` entries contribute (their `payload.message.content[]` text
 * blocks, joined); every other kind yields `''`. The final, authoritative
 * message is the one the run persists — this is just the in-flight preview.
 */
export function cliAssistantTextFromEntry(entry: CliRunTranscriptEntry): string {
  if (entry.kind !== 'assistant') return ''
  const payload = entry.payload
  if (!payload || typeof payload !== 'object') return ''
  // Codex: an `agent_message` item carries the text on `payload.item.text`.
  const item = (payload as { item?: { type?: unknown; text?: unknown } }).item
  if (
    item &&
    typeof item === 'object' &&
    item.type === 'agent_message' &&
    typeof item.text === 'string'
  ) {
    return item.text
  }
  const message = (payload as { message?: { content?: unknown } }).message
  const content = message && typeof message === 'object' ? message.content : undefined
  if (!Array.isArray(content)) return ''
  return content
    .filter(
      (b): b is { type: 'text'; text: string } =>
        typeof b === 'object' &&
        b !== null &&
        (b as { type?: unknown }).type === 'text' &&
        typeof (b as { text?: unknown }).text === 'string',
    )
    .map((b) => b.text)
    .join('')
}

function asTranscriptRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : undefined
}

function safeTranscriptJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2) ?? String(v)
  } catch {
    return String(v)
  }
}

/**
 * Best-effort tool name for a `tool-call` transcript entry. The CLIs differ:
 * Claude Code nests `message.content[]` blocks of `type: 'tool_use'` carrying a
 * `name`; Codex emits a top-level `item` whose `type` names the operation
 * (`command_execution`, `file_change`, …); some payloads carry a plain
 * top-level `name`. Returns undefined when none is discoverable.
 */
export function cliToolNameFromEntry(entry: CliRunTranscriptEntry): string | undefined {
  const root = asTranscriptRecord(entry.payload)
  if (!root) return undefined
  if (typeof root.name === 'string') return root.name
  const item = asTranscriptRecord(root.item)
  // Codex MCP tool: the real tool name is `item.tool`, not the `mcp_tool_call` type.
  if (item && item.type === 'mcp_tool_call' && typeof item.tool === 'string') {
    return cleanCliToolName(item.tool)
  }
  if (item && typeof item.type === 'string' && item.type !== 'agent_message') return item.type
  const message = asTranscriptRecord(root.message)
  const content = message?.content
  if (Array.isArray(content)) {
    for (const block of content) {
      const b = asTranscriptRecord(block)
      if (b && (b.type === 'tool_use' || b.type === 'tool_call') && typeof b.name === 'string') {
        return b.name
      }
    }
  }
  return undefined
}

/** Normalize a CLI tool name to our internal tool name so a CLI's call to one
 * of our MCP tools matches our tool-preview drawers. Handles the MCP transport
 * prefix (`mcp__thefactory__readPaths`) and the bare server-namespaced forms a
 * CLI may surface (`thefactory-readPaths`, `thefactory__grepFiles`); plain CLI
 * tool names (`Bash`, `command_execution`) pass through untouched. */
export function cleanCliToolName(name: string): string {
  const mcp = name.match(/^mcp__.+?__(.+)$/)
  const base = mcp ? mcp[1] : name
  return base.replace(/^thefactory[-_]+/i, '')
}

/**
 * Classify a CLI tool's provenance from its raw (un-cleaned) name so the card
 * can badge it. `mcp__<server>__<tool>` and `thefactory-<tool>` forms are ours
 * (`internal`); a non-thefactory MCP server is `external-mcp`; everything else
 * is the CLI's own built-in tool (`native`, e.g. `Bash`, `command_execution`).
 */
export function classifyToolOrigin(rawName: string | undefined): ToolOrigin {
  if (!rawName) return 'native'
  const mcp = rawName.match(/^mcp__(.+?)__/)
  if (mcp) return /thefactory/i.test(mcp[1]) ? 'internal' : 'external-mcp'
  if (/^thefactory[-_]/i.test(rawName)) return 'internal'
  return 'native'
}

/** Lifecycle/outcome class for a CLI tool step. A step is `running` from the
 * moment its call is seen until its result arrives; then `success` / `errored`.
 * Whether its row reads as queued instead — waiting behind an ask, or approved
 * and not picked up yet — is decided per row (see `cliTranscriptToMessages`). */
export type CliToolStepResultType = 'success' | 'errored' | 'running' | 'not_allowed'

/** What a step's row shows: the step's own class, or queued. */
type CliToolRowResultType = CliToolStepResultType | 'pending'

/**
 * The host's answer to a call it did NOT run — waiting for approval, stopped by
 * a latch, declined or expired — read from the tool result (an object, or the
 * JSON string a CLI hands back), or `undefined` for a call that ran.
 */
export function hostCallOutcomeOf(result: unknown): CliHostCallOutcome | undefined {
  let body: unknown = result
  if (typeof result === 'string') {
    try {
      body = JSON.parse(result)
    } catch {
      return undefined
    }
  }
  const record = asTranscriptRecord(body)
  const outcome = record?.outcome
  return typeof outcome === 'string' && CLI_HOST_UNRUN_OUTCOMES.has(outcome)
    ? (record as CliHostCallOutcome)
    : undefined
}

/**
 * A CLI transcript reduced to readable, render-ready steps. Tool calls and
 * their later results are merged into a single `tool` step (paired by id), so
 * a consumer can render one drawer per logical operation — VS Code style.
 */
export type CliTranscriptStep =
  | { kind: 'thinking'; at: number; durationMs?: number; text: string; parentToolCallId?: string }
  | { kind: 'assistant'; at: number; durationMs?: number; text: string; parentToolCallId?: string }
  | { kind: 'system'; at: number; durationMs?: number; summary: string; raw: string }
  | {
      kind: 'tool'
      at: number
      /** Time from the tool call to its result (or to the next step while in flight). */
      durationMs?: number
      /** Tool name with any MCP prefix stripped (matches our preview names when recognized). */
      toolName: string
      /** Provenance of the tool (internal / native / external-mcp) for the origin badge. */
      origin: ToolOrigin
      /** The id used to pair the call with its result (`tool_use.id` / `call_id` / `item.id`). */
      toolCallId?: string
      /** The call a subagent made this one under — claude-code's `parent_tool_use_id`. */
      parentToolCallId?: string
      /** Parsed call arguments, when extractable. */
      input?: unknown
      /** The tool's result once it arrives; undefined while the call is in flight. */
      result?: unknown
      resultType: CliToolStepResultType
      /**
       * The host answered this call without running the tool. Whether the user
       * is still being asked about it is not the transcript's to say — see
       * `cliTranscriptToMessages`' `pendingAsks`.
       */
      hostOutcome?: CliHostCallOutcome
    }
  | { kind: 'result'; at: number; durationMs?: number; summary: string; raw: string }
  | { kind: 'raw'; at: number; durationMs?: number; raw: string }

type CliToolStep = Extract<CliTranscriptStep, { kind: 'tool' }>

function firstKey(obj: Record<string, unknown> | undefined): string | undefined {
  if (!obj) return undefined
  for (const k of Object.keys(obj)) return k
  return undefined
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

/** Best-effort thinking text (Claude extended-thinking `thinking` content
 * blocks). Works for any entry — thinking can precede a tool call in the same
 * `assistant` message, which the runner then classifies as `tool-call`.
 *
 * Whitespace is preserved verbatim: streaming CLIs split one thought across many
 * chunks, and trimming each would weld the last word of one to the first of the
 * next. Callers decide whether a blank result is worth rendering. */
export function cliThinkingTextFromEntry(entry: CliRunTranscriptEntry): string {
  const content = asTranscriptRecord(asTranscriptRecord(entry.payload)?.message)?.content
  if (!Array.isArray(content)) return ''
  return content
    .map((b) => asTranscriptRecord(b))
    .filter(
      (b): b is Record<string, unknown> =>
        !!b && b.type === 'thinking' && typeof b.thinking === 'string',
    )
    .map((b) => b.thinking as string)
    .join('\n')
}

type ExtractedCall = { toolName: string; origin: ToolOrigin; toolCallId?: string; input?: unknown }

/** Origin for a tool surfaced through an MCP envelope: ours when the server
 * (provider) or the raw tool name is thefactory-namespaced, else a third-party
 * MCP server. An MCP envelope is never a CLI-native tool. */
function mcpEnvelopeOrigin(envelope: Record<string, unknown>): ToolOrigin {
  const provider = asString(envelope.providerIdentifier) ?? ''
  const rawName = asString(envelope.toolName) ?? asString(envelope.name) ?? ''
  return /thefactory/i.test(provider) || /thefactory/i.test(rawName) ? 'internal' : 'external-mcp'
}

/** True when a record is the MCP call "echo" — the object carrying the call
 * metadata (`providerIdentifier` + a `toolName`/`name`). */
function isMcpEcho(o: Record<string, unknown> | undefined): boolean {
  return (
    !!o &&
    o.providerIdentifier !== undefined &&
    (typeof o.toolName === 'string' || typeof o.name === 'string')
  )
}

/**
 * The call-metadata object inside an MCP envelope. Cursor nests it under `.args`
 * (i.e. `mcpToolCall.args` is the echo carrying `providerIdentifier`/`toolName`
 * and, one level deeper, the real call args at `.args`); other CLIs put the
 * metadata flat on the envelope itself. The envelope passed in is the object
 * that owns `.result`, so the metadata and the result are reachable together.
 */
function mcpEnvelopeEcho(envelope: Record<string, unknown>): Record<string, unknown> {
  const nested = asTranscriptRecord(envelope.args)
  return isMcpEcho(nested) ? (nested as Record<string, unknown>) : envelope
}

function extractCliToolCall(entry: CliRunTranscriptEntry): ExtractedCall {
  const p = asTranscriptRecord(entry.payload)
  // MCP tool call (any CLI): the envelope names the real tool — read it wherever
  // it's nested, so the step is our tool (e.g. `grepFile`) not the wrapper.
  const mcp = findMcpEnvelope(entry.payload)
  if (mcp) {
    const echo = mcpEnvelopeEcho(mcp)
    return {
      toolName: cleanCliToolName(asString(echo.toolName) ?? asString(echo.name) ?? 'tool'),
      origin: mcpEnvelopeOrigin(echo),
      toolCallId: asString(p?.call_id) ?? asString(echo.toolCallId),
      // The real call args live under the echo's `.args` (cursor) / on the flat
      // envelope's `.args` — `echo.args` covers both; never the echo itself.
      input: echo.args ?? echo.input,
    }
  }
  // Cursor over ACP (the resident transport): the protocol carries the raw
  // `session/update` under `.acp`. Field names are read defensively — a row that
  // names the call imprecisely is still an account of what happened, whereas
  // requiring an exact shape is how these went missing in the first place.
  const acp = asTranscriptRecord(p?.acp)
  if (acp) {
    const rawInput = asTranscriptRecord(acp.rawInput)
    const name =
      asString(rawInput?.name) ??
      asString(acp.title) ??
      asString(acp.kind) ??
      asString(acp.sessionUpdate) ??
      'tool'
    return {
      toolName: cleanCliToolName(name),
      origin: /thefactory/i.test(name) ? 'internal' : 'native',
      ...(asString(acp.toolCallId) !== undefined
        ? { toolCallId: asString(acp.toolCallId) as string }
        : {}),
      input: acp.rawInput ?? acp.content ?? undefined,
    }
  }
  // Cursor native: { type:'tool_call', call_id, tool_call: { <name>ToolCall: { args } } }.
  const cursorTc = asTranscriptRecord(p?.tool_call)
  if (cursorTc) {
    const key = firstKey(cursorTc) ?? 'tool'
    const inner = asTranscriptRecord(cursorTc[key])
    return {
      toolName: cleanCliToolName(key.replace(/ToolCall$/, '')),
      origin: 'native',
      toolCallId: asString(p?.call_id) ?? asString(inner?.toolCallId),
      input: inner?.args,
    }
  }
  // Codex MCP tool call: item: { type:'mcp_tool_call', server, tool, arguments, id }.
  // Codex carries the server/tool flat on the item (no providerIdentifier echo),
  // so findMcpEnvelope misses it — handle it explicitly here, before the generic
  // codex `item` fallback that would surface the raw `mcp_tool_call` type.
  const codexCall = asTranscriptRecord(p?.item)
  if (codexCall && codexCall.type === 'mcp_tool_call') {
    const server = asString(codexCall.server) ?? ''
    return {
      toolName: cleanCliToolName(asString(codexCall.tool) ?? 'tool'),
      origin: /thefactory/i.test(server) ? 'internal' : 'external-mcp',
      toolCallId: asString(codexCall.id),
      input: codexCall.arguments,
    }
  }
  // Codex workspace edit: item: { type:'file_change', changes:[{path,kind}], id }.
  if (codexCall && codexCall.type === 'file_change') {
    return {
      toolName: 'file_change',
      origin: 'native',
      toolCallId: asString(codexCall.id),
      input: { changes: codexCall.changes },
    }
  }
  // Codex: { type:'item.started', item: { type:'command_execution', command, id } }
  const item = asTranscriptRecord(p?.item)
  if (item && typeof item.type === 'string') {
    const input = item.command != null ? { command: item.command } : item
    return {
      toolName: cleanCliToolName(item.type),
      origin: 'native',
      toolCallId: asString(item.id),
      input,
    }
  }
  // Claude Code: { type:'assistant', message:{ content:[{type:'tool_use', id, name, input}] } }
  const content = asTranscriptRecord(p?.message)?.content
  if (Array.isArray(content)) {
    for (const block of content) {
      const b = asTranscriptRecord(block)
      if (b && (b.type === 'tool_use' || b.type === 'tool_call') && typeof b.name === 'string') {
        return {
          toolName: cleanCliToolName(b.name),
          origin: classifyToolOrigin(b.name),
          toolCallId: asString(b.id),
          input: b.input,
        }
      }
    }
  }
  // Generic / flat MCP envelope: { name, args, toolCallId, providerIdentifier, toolName }.
  const flatName = asString(p?.toolName) ?? asString(p?.name)
  return {
    toolName: cleanCliToolName(flatName ?? 'tool'),
    origin: classifyToolOrigin(flatName),
    toolCallId: asString(p?.toolCallId) ?? asString(p?.id) ?? asString(p?.call_id),
    input: p?.args ?? p?.input,
  }
}

type ExtractedResult = {
  toolName?: string
  origin: ToolOrigin
  toolCallId?: string
  /** Present only when the update carried arguments the opening call lacked. */
  input?: unknown
  result: unknown
  resultType: CliToolStepResultType
}

/**
 * Placeholder names cursor opens an ACP tool call with, before it knows (or
 * before it says) which tool ran. A step wearing one of these is still
 * unidentified, so a later update naming the tool must be allowed to replace it.
 */
const ACP_PLACEHOLDER_TOOL_NAMES = new Set(['tool', 'mcp: tool', 'other'])

/** Whether `name` still fails to identify the tool that ran. */
export function isPlaceholderCliToolName(name: string | undefined): boolean {
  return name === undefined || ACP_PLACEHOLDER_TOOL_NAMES.has(name.trim().toLowerCase())
}

/**
 * Whether an update's name tells the reader more than the one already on the row.
 *
 * A cursor tool call opens generic — `Read File`, `grep`, `MCP: tool` — and the
 * useful name only arrives in the update that follows: `Read
 * app/src/main/java/.../CommonUI.kt (1121 - 1370)`, `grep "fontFamily|..."`, or
 * the verbatim shell command. Keeping the opening name is what made a live run
 * unreadable — you could see THAT it was reading a file, never WHICH.
 *
 * An update may only make a row more specific, never less: a placeholder always
 * yields, and otherwise the longer name wins. That way a later, vaguer update
 * cannot take detail away once it is on screen.
 */
export function isMoreSpecificToolName(existing: string | undefined, incoming: string): boolean {
  if (isPlaceholderCliToolName(existing)) return true
  return incoming.length > (existing?.length ?? 0)
}

/** Whether a tool step is still carrying no arguments worth showing. */
export function isEmptyToolInput(input: unknown): boolean {
  if (input === undefined || input === null) return true
  if (typeof input === 'string') return input.trim().length === 0
  if (Array.isArray(input)) return input.length === 0
  if (typeof input === 'object') return Object.keys(input as Record<string, unknown>).length === 0
  return false
}

/**
 * Provenance of an ACP tool call. Cursor names the MCP server in
 * `rawInput.providerIdentifier` (`'thefactory'`) rather than in the tool name,
 * so classifying on the name alone reports every one of our own tools as one of
 * the CLI's built-ins.
 */
export function acpToolOrigin(provider: string | undefined, name: string | undefined): ToolOrigin {
  if (provider !== undefined) return /thefactory/i.test(provider) ? 'internal' : 'external-mcp'
  if (name !== undefined && /thefactory/i.test(name)) return 'internal'
  return classifyToolOrigin(name)
}

/**
 * What a row shows for the host's own outcome of a call a client reported as
 * done: an error the host answered reads in its own words, as an error result
 * does on every other runner; its answer for a call it did not run is shown whole.
 */
function hostOutcomeShown(hostOutcome: unknown): unknown {
  const record = asTranscriptRecord(hostOutcome)
  return record?.outcome === CLI_HOST_ERRORED_OUTCOME && typeof record.error === 'string'
    ? record.error
    : hostOutcome
}

function extractCliToolResult(entry: CliRunTranscriptEntry): ExtractedResult {
  const p = asTranscriptRecord(entry.payload)
  // Cursor over ACP: `tool_call_update` carries the id of the call it belongs to
  // and a status. Without this the update never pairs with its call, so every
  // tool sits on the running spinner for the rest of the turn.
  const acp = asTranscriptRecord(p?.acp)
  if (acp) {
    const status = asString(acp.status)
    // The update is also where a cursor call first says WHAT it is: the opening
    // `tool_call` announces `title: "MCP: tool"` with an empty `rawInput`, and
    // only `tool_call_update` carries `rawInput.toolName` and a real title. Read
    // the identity here so the merge can replace the placeholder.
    const rawInput = asTranscriptRecord(acp.rawInput)
    const name = asString(rawInput?.toolName) ?? asString(rawInput?.name) ?? asString(acp.title)
    const provider = asString(rawInput?.providerIdentifier)
    return {
      ...(name !== undefined ? { toolName: cleanCliToolName(name) } : {}),
      origin: acpToolOrigin(provider, name),
      ...(asString(acp.toolCallId) !== undefined
        ? { toolCallId: asString(acp.toolCallId) as string }
        : {}),
      ...(rawInput !== undefined && Object.keys(rawInput).length > 0
        ? { input: rawInput.args ?? acp.rawInput }
        : {}),
      // The host's own outcome wins: cursor reports every answered MCP call as
      // `{success: true}`, so a call the host never ran — waiting for approval,
      // refused, stopped — would otherwise read as done.
      result: hostOutcomeShown(p?.hostOutcome) ?? acp.rawOutput ?? acp.content,
      // Only a terminal status ends the call; `pending` / `in_progress` are
      // progress reports and must leave the spinner alone.
      resultType: p?.hostOutcome !== undefined ? 'errored' : acpResultType(status),
    }
  }
  // MCP tool result (any CLI): read the real tool name from the envelope and
  // unwrap its `{ success|error: { content } }` block to the structured result.
  const mcp = findMcpEnvelope(entry.payload)
  if (mcp) {
    const echo = mcpEnvelopeEcho(mcp)
    // The envelope owns `.result` (cursor: `mcpToolCall.result`, a sibling of the
    // `.args` echo); unwrap its `{ success|error: { content } }` block.
    const unwrapped = unwrapCursorResult(mcp.result ?? mcp)
    return {
      toolName: cleanCliToolName(asString(echo.toolName) ?? asString(echo.name) ?? 'tool'),
      origin: mcpEnvelopeOrigin(echo),
      toolCallId: asString(p?.call_id) ?? asString(echo.toolCallId),
      result: unwrapped.result,
      resultType: unwrapped.isError ? 'errored' : 'success',
    }
  }
  // Cursor native completed: tool_call: { <name>ToolCall: { args, result: { success | error | failure } } }
  const cursorTc = asTranscriptRecord(p?.tool_call)
  if (cursorTc) {
    const key = firstKey(cursorTc) ?? 'tool'
    const inner = asTranscriptRecord(cursorTc[key])
    const unwrapped = unwrapCursorResult(inner?.result)
    return {
      toolName: cleanCliToolName(key.replace(/ToolCall$/, '')),
      origin: 'native',
      toolCallId: asString(p?.call_id) ?? asString(inner?.toolCallId),
      result: unwrapped.result,
      resultType: unwrapped.isError ? 'errored' : 'success',
    }
  }
  // Codex MCP tool result: item: { type:'mcp_tool_call', server, tool, result:{content:[{text}]}, error, status }.
  const codexRes = asTranscriptRecord(p?.item)
  if (codexRes && codexRes.type === 'mcp_tool_call') {
    const server = asString(codexRes.server) ?? ''
    const isError = codexRes.status === 'failed' || codexRes.error != null
    // result.content is [{ type:'text', text:'<json>' }] — wrap as a success
    // block so the shared unwrapper joins + JSON-parses it like our other tools.
    const unwrapped =
      codexRes.result != null ? unwrapCursorResult({ success: codexRes.result }) : undefined
    return {
      toolName: cleanCliToolName(asString(codexRes.tool) ?? 'tool'),
      origin: /thefactory/i.test(server) ? 'internal' : 'external-mcp',
      toolCallId: asString(codexRes.id),
      result: unwrapped ? unwrapped.result : (codexRes.error ?? null),
      resultType: isError ? 'errored' : 'success',
    }
  }
  // Codex workspace edit result: item: { type:'file_change', changes, status }.
  if (codexRes && codexRes.type === 'file_change') {
    return {
      toolName: 'file_change',
      origin: 'native',
      toolCallId: asString(codexRes.id),
      result: { changes: codexRes.changes },
      resultType: codexRes.status === 'failed' ? 'errored' : 'success',
    }
  }
  // Codex completed: item: { type:'command_execution', aggregated_output, exit_code, id }
  const item = asTranscriptRecord(p?.item)
  if (item && 'aggregated_output' in item) {
    const exit = item.exit_code
    const resultType: CliToolStepResultType =
      exit == null ? 'success' : exit === 0 ? 'success' : 'errored'
    return {
      toolName: typeof item.type === 'string' ? cleanCliToolName(item.type) : undefined,
      origin: 'native',
      toolCallId: asString(item.id),
      result: { output: item.aggregated_output, exitCode: exit },
      resultType,
    }
  }
  // Claude Code: { type:'user', message:{ content:[{type:'tool_result', tool_use_id, content, is_error?}] } }
  const content = asTranscriptRecord(p?.message)?.content
  if (Array.isArray(content)) {
    for (const block of content) {
      const b = asTranscriptRecord(block)
      if (b && b.type === 'tool_result') {
        return {
          origin: 'native',
          toolCallId: asString(b.tool_use_id),
          result: claudeToolResultContent(b.content),
          resultType: b.is_error ? 'errored' : 'success',
        }
      }
    }
  }
  // Generic / flat MCP envelope: a `{ success|error: { content } }` block (with
  // an optional top-level id) that we unwrap to the tool's structured result.
  const unwrapped = unwrapCursorResult(p?.result ?? entry.payload)
  return {
    origin: classifyToolOrigin(asString(p?.toolName) ?? asString(p?.name)),
    toolCallId: asString(p?.toolCallId) ?? asString(p?.id) ?? asString(p?.call_id),
    result: unwrapped.result,
    resultType: unwrapped.isError ? 'errored' : 'success',
  }
}

/** Our MCP tools return their result as a JSON string; parse it so recognized
 * tool-preview drawers receive the structured object they expect. */
/**
 * A Claude Code tool result's content: a string, or the MCP result's content
 * blocks, which carry the host's outcome as text just as a string does.
 */
function claudeToolResultContent(content: unknown): unknown {
  if (!Array.isArray(content)) return maybeParseJson(content)
  const text = textOfBlocks(content)
  return text.length > 0 ? maybeParseJson(text) : content
}

function maybeParseJson(v: unknown): unknown {
  if (typeof v !== 'string') return v
  const t = v.trim()
  if (!t || (t[0] !== '{' && t[0] !== '[')) return v
  try {
    return JSON.parse(t)
  } catch {
    return v
  }
}

/** The text of a tool result's content blocks, joined. */
function textOfBlocks(content: readonly unknown[]): string {
  return content
    .map((c) => {
      const cr = asTranscriptRecord(c)
      if (typeof cr?.text === 'string') return cr.text
      const inner = asTranscriptRecord(cr?.text)
      return typeof inner?.text === 'string' ? inner.text : ''
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Unwrap a Cursor tool result. Cursor wraps results as `{ success | error |
 * failure: { content, isError } }`; for MCP tools `content` is an array of
 * `{ text: { text } }` blocks whose text is the tool's JSON output, while native
 * Cursor tools put a plain string on `content`. Returns the inner result
 * (JSON-parsed when it is a JSON string) so our drawers get the structured value
 * they expect, plus whether the call errored. Non-wrapped values pass through.
 */
function unwrapCursorResult(raw: unknown): { result: unknown; isError: boolean } {
  const r = asTranscriptRecord(raw)
  if (!r) return { result: raw, isError: false }
  const errBlock = asTranscriptRecord(r.error) ?? asTranscriptRecord(r.failure)
  const block = asTranscriptRecord(r.success) ?? errBlock
  if (!block) return { result: raw, isError: false }
  const isError = !!errBlock || block.isError === true
  const content = block.content
  if (typeof content === 'string') return { result: maybeParseJson(content), isError }
  if (Array.isArray(content)) return { result: maybeParseJson(textOfBlocks(content)), isError }
  return { result: block, isError }
}

/**
 * Locate the MCP tool-call envelope inside a transcript payload, wherever a CLI
 * nests it. Cursor wraps MCP calls in `tool_call` under a generic key
 * (`mcpToolCall`) whose call metadata sits in a `.args` ECHO
 * (`providerIdentifier` + `toolName`) and whose real result is a SIBLING at
 * `.result` — so we return the OUTER object that owns `.result`, NOT the echo
 * (returning the echo loses the result, which is the cursor result-rendering
 * bug). Other CLIs put the metadata flat on the envelope itself. A bounded
 * breadth-first walk finds it regardless of the exact nesting so the tool reads
 * as our real tool (e.g. `grepFile`) rather than the wrapper ("mcp").
 */
function findMcpEnvelope(payload: unknown): Record<string, unknown> | undefined {
  const seen = new Set<unknown>()
  const queue: unknown[] = [payload]
  let visited = 0
  while (queue.length > 0 && visited < 64) {
    const r = asTranscriptRecord(queue.shift())
    visited++
    if (!r || seen.has(r)) continue
    seen.add(r)
    // Cursor's nested envelope: the echo is a child at `.args`; return the
    // parent (it owns `.result`). Checked first so we don't descend into and
    // return the echo, which has no result.
    if (isMcpEcho(asTranscriptRecord(r.args))) return r
    // Flat envelope: the metadata lives directly on this record.
    if (isMcpEcho(r)) return r
    for (const v of Object.values(r)) {
      if (v && typeof v === 'object') queue.push(v)
    }
  }
  return undefined
}

function summarizeCliSystem(entry: CliRunTranscriptEntry): string {
  const p = asTranscriptRecord(entry.payload)
  const subtype = asString(p?.subtype)
  const type = asString(p?.type)
  if (subtype === 'init' || type === 'thread.started') {
    const model = asString(p?.model)
    return model ? `Session started · ${model}` : 'Session started'
  }
  if (type === 'turn.started') return 'Turn started'
  return subtype ? `${type ?? 'system'} · ${subtype}` : (type ?? 'System')
}

function summarizeCliResult(entry: CliRunTranscriptEntry): string {
  const p = asTranscriptRecord(entry.payload)
  const type = asString(p?.type)
  if (type === 'turn.failed' || p?.is_error === true || asString(p?.subtype) === 'error')
    return 'Failed'
  const ms = p?.duration_ms
  return typeof ms === 'number' ? `Completed in ${(ms / 1000).toFixed(1)}s` : 'Completed'
}

/**
 * Reduce a CLI run's flat transcript into readable, render-ready steps: prose
 * (assistant), extended-thinking (Claude), protocol notes (system), final
 * status (result), and one merged `tool` step per logical operation — the
 * `tool-call` entry paired with its later `tool-result` by id. Pure; the live
 * panel re-runs it on every append.
 */
/** ACP tool status → step result type; non-terminal statuses stay `running`. */
function acpResultType(status: string | undefined): CliToolStepResultType {
  if (status === 'failed' || status === 'error') return 'errored'
  if (status === 'completed') return 'success'
  return 'running'
}

/** Append reasoning, growing the previous thinking step rather than adding one. */
/** The call a subagent's line was made under: claude-code's `parent_tool_use_id`. */
function cliParentToolCallId(entry: CliRunTranscriptEntry): string | undefined {
  const parent = (entry.payload as { parent_tool_use_id?: unknown } | undefined)?.parent_tool_use_id
  return typeof parent === 'string' && parent.length > 0 ? parent : undefined
}

function underParent(parent: string | undefined): { parentToolCallId?: string } {
  return parent ? { parentToolCallId: parent } : {}
}

function appendThinking(
  steps: CliTranscriptStep[],
  at: number,
  text: string,
  parent: string | undefined,
): void {
  const last = steps[steps.length - 1]
  if (last && last.kind === 'thinking' && last.parentToolCallId === parent) {
    last.text += text
    return
  }
  if (text.trim()) steps.push({ kind: 'thinking', at, text, ...underParent(parent) })
}

export function normalizeCliTranscript(entries: CliRunTranscriptEntry[]): CliTranscriptStep[] {
  const steps: CliTranscriptStep[] = []
  const toolIndexById = new Map<string, number>()

  // A reply the CLI nudged the agent into writing again is the same reply twice.
  for (const entry of withoutNudgedReanswer(entries)) {
    // Two agents stream at once when a subagent runs, so nothing coalesces
    // across the agent that wrote it.
    const parent = cliParentToolCallId(entry)
    switch (entry.kind) {
      case 'assistant': {
        // Reasoning streams in chunks exactly like prose does, so it is coalesced
        // the same way — otherwise one thought renders as a column of a dozen
        // separate bubbles, each a few words long.
        const thinking = cliThinkingTextFromEntry(entry)
        if (thinking) appendThinking(steps, entry.at, thinking, parent)
        const text = cliAssistantTextFromEntry(entry)
        // Coalesce a streaming reply into one growing message: cursor and codex
        // emit it as many small per-chunk deltas, which must render as ONE
        // bubble that fills in live, not a run of tiny ones. `streaming` is the
        // producer saying which this is — guessing from adjacency alone also
        // welded two of claude-code's separate WHOLE replies into one bubble.
        const last = steps[steps.length - 1]
        if (
          entry.streaming === true &&
          last &&
          last.kind === 'assistant' &&
          last.parentToolCallId === parent
        ) {
          last.text += text
        } else if (text.trim()) {
          steps.push({ kind: 'assistant', at: entry.at, text, ...underParent(parent) })
        }
        break
      }
      case 'tool-call': {
        // Claude can emit a thinking block in the same message as a tool call
        // (classified `tool-call`); surface it as its own step first.
        const toolThinking = cliThinkingTextFromEntry(entry)
        if (toolThinking) appendThinking(steps, entry.at, toolThinking, parent)
        const call = extractCliToolCall(entry)
        const step: CliToolStep = {
          kind: 'tool',
          at: entry.at,
          toolName: call.toolName,
          origin: call.origin,
          toolCallId: call.toolCallId,
          ...underParent(parent),
          input: call.input,
          result: undefined,
          // In-flight until the matching result entry arrives (running spinner).
          resultType: 'running',
        }
        steps.push(step)
        if (call.toolCallId) toolIndexById.set(call.toolCallId, steps.length - 1)
        break
      }
      case 'tool-result': {
        const extracted = extractCliToolResult(entry)
        // A call the host answered without running the tool — sent for
        // approval, stopped, declined — did not run, whatever status the CLI
        // gave it. Read off the transcript so the row says so even when the
        // client reported a success.
        const hostOutcome = hostCallOutcomeOf(extracted.result)
        const res = hostOutcome
          ? { ...extracted, result: hostOutcome, resultType: 'not_allowed' as const }
          : extracted
        const idx = res.toolCallId ? toolIndexById.get(res.toolCallId) : undefined
        const existing = idx != null ? steps[idx] : undefined
        if (existing && existing.kind === 'tool') {
          // Cursor opens a call as an unnamed placeholder and only names the
          // tool in a later update, so identity is adopted on EVERY update —
          // including the non-terminal ones, or a still-running row stays
          // labelled "MCP: tool" for as long as it runs.
          if (
            res.toolName !== undefined &&
            isMoreSpecificToolName(existing.toolName, res.toolName)
          ) {
            existing.toolName = res.toolName
            existing.origin = res.origin
          }
          if (res.input !== undefined && isEmptyToolInput(existing.input))
            existing.input = res.input
          // A progress update leaves the call in flight; only a terminal one
          // resolves it.
          if (res.resultType !== 'running') {
            existing.result = res.result
            existing.resultType = res.resultType
            if (hostOutcome) existing.hostOutcome = hostOutcome
            if (entry.at > existing.at) existing.durationMs = entry.at - existing.at
          }
        } else if (res.resultType !== 'running') {
          steps.push({
            kind: 'tool',
            at: entry.at,
            toolName: res.toolName ?? 'tool',
            origin: res.origin,
            toolCallId: res.toolCallId,
            ...underParent(parent),
            input: undefined,
            result: res.result,
            resultType: res.resultType,
            ...(hostOutcome ? { hostOutcome } : {}),
          })
        }
        break
      }
      case 'system':
        steps.push({
          kind: 'system',
          at: entry.at,
          summary: summarizeCliSystem(entry),
          raw: safeTranscriptJson(entry.payload),
        })
        break
      case 'result':
        steps.push({
          kind: 'result',
          at: entry.at,
          summary: summarizeCliResult(entry),
          raw: safeTranscriptJson(entry.payload),
        })
        break
      default:
        steps.push({ kind: 'raw', at: entry.at, raw: safeTranscriptJson(entry.payload) })
    }
  }
  // Fill in elapsed time for steps that didn't get an intrinsic duration (tool
  // steps already carry call→result time): the gap until the next step began is
  // the best "this took ~X" signal. The trailing step is left open — the live
  // view shows a running timer for it instead.
  for (let i = 0; i < steps.length - 1; i++) {
    const s = steps[i]
    if (s.durationMs == null) {
      const gap = steps[i + 1].at - s.at
      if (gap > 0) s.durationMs = gap
    }
  }
  return steps
}

/**
 * Convert a CLI run's transcript into the SAME chat-message shape an API agent
 * produces, so a CLI run renders through the normal message list (assistant
 * bubbles + tool cards) with no bespoke transcript view:
 * - assistant step → an `assistant` message (its prose),
 * - thinking step → an `assistant` message carrying `thinking`,
 * - tool step → a `tool` message (`toolCall` + `toolResult`), exactly like the
 *   API path's tool messages.
 * Protocol steps (system/result/raw) are dropped — they have no API analogue.
 * `opts.model` stamps the assistant messages so they show the model chip, and
 * `opts.usage` — the run record's tokens, charge and billing — is attached to
 * the first assistant message (the one that shows the model chip), so a CLI run
 * surfaces a cost chip just like an API turn, a $0 subscription run included.
 * The transcript's per-entry `costUSD` is never summed in its place: claude-code
 * repeats a message's usage on every line it streams, so the sum counts each
 * message once per line (covision-android/88342735: $0.76 against $0.32).
 *
 * `opts.pendingAsks` — the undecided asks of this chat — decides which rows the
 * user is being asked about: a row whose host outcome names a pending ask, or a
 * call still held open whose name and arguments match one, becomes
 * `require_confirmation` (the API path's "needs confirmation") and carries the
 * ask as `toolCall.approvalId`. Any other call the host answered without
 * running stays `not_allowed`, so an ask decided long ago no longer reads as
 * waiting. Each ask is tied to one row at most.
 */
export function cliTranscriptToMessages(
  entries: CliRunTranscriptEntry[],
  opts?: {
    model?: string
    showThinking?: boolean
    pendingAsks?: readonly CliPendingAsk[]
    decidedAsks?: readonly CliDecidedAsk[]
    /** The run these entries are from — what tells a later call that carried an approval out. */
    runId?: string
    usage?: MessageUsageLike
  },
): ChatMessageLike[] {
  const showThinking = opts?.showThinking ?? true
  const steps = normalizeCliTranscript(entries)
  const askByStep = tieAsksToSteps(steps, opts?.pendingAsks ?? [])
  const endedOpen = leftOpenAtTurnEnd(steps, askByStep)
  const decidedById = new Map((opts?.decidedAsks ?? []).map((a) => [a.id, a]))
  const recalls = carryingOutCalls(steps, opts?.decidedAsks ?? [], opts?.runId)
  const approvedInRun = approvedWhileHeld(steps, opts?.decidedAsks ?? [], opts?.runId)
  const messages: ChatMessageLike[] = []
  const parentOf = new Map<ChatMessageLike, string>()
  // Where a call waits on the user, the calls made after it alongside it are
  // queued behind it: the CLI sends them one at a time.
  const waitingIn = new Set<string>()
  for (const step of steps) {
    const before = messages.length
    const startedAt = new Date(step.at).toISOString()
    const model = opts?.model
    if (step.kind === 'thinking' && !showThinking) continue
    if (step.kind === 'assistant') {
      messages.push({
        role: 'assistant',
        content: step.text,
        startedAt,
        ...(step.durationMs != null ? { durationMs: step.durationMs } : {}),
        ...(model ? { model } : {}),
      })
    } else if (step.kind === 'thinking') {
      // MessageRow renders message `content`, not a `thinking` field, so put the
      // reasoning in content (kept on `thinking` too) — otherwise it'd be a blank
      // bubble.
      messages.push({
        role: 'assistant',
        content: step.text,
        thinking: step.text,
        startedAt,
        ...(step.durationMs != null ? { durationMs: step.durationMs } : {}),
        ...(model ? { model } : {}),
      })
    } else if (step.kind === 'tool') {
      if (recalls.has(step) || ranNothing(step)) continue
      const ask = askByStep.get(step)
      const asking = ask !== undefined && ask.awaitingOutcome !== true
      const approvalId = asking && ask.decidedOnRow ? ask.id : undefined
      const actionId = step.hostOutcome?.actionId
      const decidedAsk =
        ask === undefined && actionId !== undefined ? decidedById.get(actionId) : undefined
      const decided = decidedAsk ? decidedRowResult(decidedAsk, step.hostOutcome) : undefined
      const ended = endedOpen.has(step)
      const resultType = ended ? 'not_allowed' : step.resultType
      const scope = step.parentToolCallId ?? ''
      const queued =
        ask === undefined &&
        decided === undefined &&
        resultType === 'running' &&
        waitingIn.has(scope)
      if (ask !== undefined) waitingIn.add(scope)
      // An approved call is timed by the call itself: the step's own span runs
      // from the ask to the result and counts the user's time deciding.
      const settledBy = decidedAsk ?? approvedInRun.get(step)
      const durationMs = settledBy?.execution?.durationMs ?? step.durationMs
      const decisionNote = settledBy ? askDecisionNote(settledBy) : undefined
      messages.push({
        role: 'tool',
        content: '',
        startedAt,
        ...(durationMs != null ? { durationMs } : {}),
        toolCall: {
          toolCallId: step.toolCallId ?? `cli-${step.at}`,
          name: step.toolName,
          arguments: step.input,
          origin: step.origin,
          ...(approvalId !== undefined ? { approvalId } : {}),
          ...(asking && !ask.decidedOnRow ? { awaitingDecision: true } : {}),
          ...(decisionNote !== undefined ? { decisionNote } : {}),
        },
        toolResult: {
          result: decided
            ? decided.result
            : ended
              ? { outcome: 'ended', reason: TURN_ENDED_REASON }
              : step.result,
          type: ask
            ? !asking
              ? 'pending'
              : ask.decidedOnRow
                ? 'require_confirmation'
                : 'running'
            : queued
              ? 'pending'
              : (decided?.type ??
                (backgroundJobIdOf(step.result) !== undefined
                  ? BACKGROUND_TOOL_RESULT_TYPE
                  : resultType)),
          durationMs: durationMs ?? 0,
        },
      })
    }
    // A call that waits on the user stays where the user can answer it.
    const parent = 'parentToolCallId' in step ? step.parentToolCallId : undefined
    if (messages.length > before && parent !== undefined && !askByStep.has(step)) {
      parentOf.set(messages[messages.length - 1], parent)
    }
  }
  const shown = nestSubagentMessages(messages, parentOf)
  const usage = opts?.usage
  if (usage) {
    const firstAssistant = shown.find((m) => m.role === 'assistant')
    if (firstAssistant) firstAssistant.usage = usage
  }
  return shown
}

/**
 * A stored chat's tool rows tied to the asks their calls raised — an API chat
 * turn's calls name their broker action (`toolResult.actionId`) — so they read
 * exactly as a CLI turn's rows do (see {@link cliTranscriptToMessages}): an
 * ordinary ask is decided on its row (`require_confirmation` + `approvalId`),
 * one answered in a panel of its own waits there (`awaitingDecision`), one just
 * decided reads as under way, a decided one the host has not settled the row
 * of yet shows what came of it, and every decided row says who settled it.
 * Messages with no ask come back as they were.
 */
export function storedChatAskRows(
  messages: readonly ChatMessageLike[],
  pendingAsks: readonly CliPendingAsk[],
  decidedAsks: readonly CliDecidedAsk[],
): ChatMessageLike[] {
  const pendingById = new Map(pendingAsks.map((a) => [a.id, a]))
  const decidedById = new Map(decidedAsks.map((a) => [a.id, a]))
  return messages.map((m) => {
    if (m.role === 'tool' && m.toolResult && backgroundJobIdOf(m.toolResult.result) !== undefined) {
      return { ...m, toolResult: { ...m.toolResult, type: BACKGROUND_TOOL_RESULT_TYPE } }
    }
    const actionId = m.role === 'tool' ? m.toolResult?.actionId : undefined
    if (actionId === undefined || !m.toolCall) return m
    const ask = pendingById.get(actionId)
    if (ask) {
      const asking = ask.awaitingOutcome !== true
      return {
        ...m,
        toolCall: {
          ...m.toolCall,
          ...(asking && ask.decidedOnRow ? { approvalId: ask.id } : {}),
          ...(asking && !ask.decidedOnRow ? { awaitingDecision: true } : {}),
        },
        toolResult: {
          ...m.toolResult,
          type: !asking ? 'pending' : ask.decidedOnRow ? 'require_confirmation' : 'running',
        },
      }
    }
    const decided = decidedById.get(actionId)
    if (!decided) return m
    const decisionNote = askDecisionNote(decided)
    const unsettled = m.toolResult?.type === 'require_confirmation'
    const shown = unsettled ? decidedRowResult(decided, undefined) : undefined
    return {
      ...m,
      toolCall: { ...m.toolCall, ...(decisionNote !== undefined ? { decisionNote } : {}) },
      ...(shown ? { toolResult: { ...m.toolResult, type: shown.type, result: shown.result } } : {}),
    }
  })
}

/**
 * Move each subagent's messages under the call that started it, as that
 * call's `subagentMessages`. A message whose call is not in the list stays
 * where it is.
 */
function nestSubagentMessages(
  messages: ChatMessageLike[],
  parentOf: ReadonlyMap<ChatMessageLike, string>,
): ChatMessageLike[] {
  const byCallId = new Map<string, ChatMessageLike>()
  const top: ChatMessageLike[] = []
  for (const message of messages) {
    const parent = parentOf.get(message)
    const host = parent !== undefined ? byCallId.get(parent) : undefined
    if (host) host.subagentMessages = [...(host.subagentMessages ?? []), message]
    else top.push(message)
    const id = message.role === 'tool' ? message.toolCall?.toolCallId : undefined
    if (id !== undefined) byCallId.set(String(id), message)
  }
  return top
}

/** A `cli:run-update` WS payload narrowed to the bits the chat stream consumes. */
export type CliRunUpdateParsed =
  | { runId: string; kind: 'transcript'; text: string }
  | { runId: string; kind: 'terminal'; status: CliRunTerminalStatus; error?: string }
  | { runId: string; kind: 'other' }

/** Terminal status a `cli:run-update` `finished`/`error` event resolves to. */
export type CliRunTerminalStatus = 'succeeded' | 'errored' | 'aborted'

/**
 * Parse a `cli:run-update` WS payload (`{ runId, type, event }`) into a typed
 * shape for the chat streaming preview: `transcript` carries the entry's
 * assistant text (possibly empty), `terminal` marks `finished`/`error` and
 * carries the run's terminal `status` + optional `error` message (so a detached
 * run can surface failures the HTTP response no longer returns). Returns `null`
 * when the payload isn't a recognisable run-update envelope.
 */
export function parseCliRunUpdateEvent(data: unknown): CliRunUpdateParsed | null {
  if (typeof data !== 'object' || data === null) return null
  const { runId, type, event } = data as { runId?: unknown; type?: unknown; event?: unknown }
  if (typeof runId !== 'string' || typeof type !== 'string') return null
  if (type === 'finished' || type === 'error') {
    const ev = event as
      | {
          error?: unknown
          result?: { status?: unknown; abortReason?: unknown; failure?: { message?: unknown } }
        }
      | undefined
    if (type === 'error') {
      const error = typeof ev?.error === 'string' && ev.error.length > 0 ? ev.error : undefined
      return { runId, kind: 'terminal', status: 'errored', ...(error ? { error } : {}) }
    }
    const rawStatus = ev?.result?.status
    const status: CliRunTerminalStatus =
      rawStatus === 'errored' || rawStatus === 'aborted' ? rawStatus : 'succeeded'
    const failure = ev?.result?.failure?.message
    const abortReason = ev?.result?.abortReason
    const error =
      typeof failure === 'string' && failure.length > 0
        ? failure
        : typeof abortReason === 'string' && abortReason.length > 0
          ? abortReason
          : undefined
    return { runId, kind: 'terminal', status, ...(error ? { error } : {}) }
  }
  if (type === 'transcriptAppend') {
    const entry = (event as { entry?: CliRunTranscriptEntry } | undefined)?.entry
    return { runId, kind: 'transcript', text: entry ? cliAssistantTextFromEntry(entry) : '' }
  }
  return { runId, kind: 'other' }
}

/**
 * Compact a model label for the (narrow) model chip while the dropdown keeps
 * the full text. Drops a trailing parenthetical descriptor and a redundant
 * `Claude ` vendor prefix, turns the `(alias for latest)` aliases into
 * `<Name> latest`, and strips an `— account default` annotation:
 *
 *   "Auto (Cursor picks per turn)"      → "Auto"
 *   "Claude Opus (alias for latest)"    → "Opus latest"
 *   "Claude Sonnet 4.6"                 → "Sonnet 4.6"
 *   "Composer 2.5 Fast — account default" → "Composer 2.5 Fast"
 */
export function shortCliModelLabel(label: string): string {
  let s = label.trim()
  s = s.replace(/\s*[—-]\s*account default\s*$/i, '').trim()
  const isAlias = /\(\s*alias for latest\s*\)/i.test(s)
  s = s.replace(/\s*\([^)]*\)\s*$/, '').trim()
  s = s.replace(/^claude\s+/i, '').trim()
  if (isAlias) s = `${s} latest`
  return s
}

/** Human label for a CLI tool key. */
export function cliLabel(cli?: string | null): string {
  if (!cli) return ''
  const map: Record<string, string> = {
    'claude-code': 'Claude Code',
    'cursor-agent': 'Cursor',
    codex: 'Codex',
  }
  return map[cli] ?? cli
}

/** Per-CLI brand dot colour: Claude orange, Codex gray, Cursor black. */
export function cliDotColor(cli?: string | null): string {
  const map: Record<string, string> = {
    'claude-code': '#D97757',
    codex: '#8E8E93',
    'cursor-agent': '#000000',
  }
  return (cli && map[cli]) || '#8E8E93'
}

/**
 * Parse a persisted CLI-agent message-model tag (`cli-agent/<cli>/<modelId>`,
 * the form `dispatchChatToolsViaCli` writes) into its parts, or `null` when the
 * string isn't a CLI tag. `modelId` is undefined when the run used the CLI's own
 * default (the tag's trailing segment is empty).
 */
export function parseCliAgentModelTag(
  model: string | null | undefined,
): { cli: string; modelId?: string } | null {
  if (typeof model !== 'string' || !model.startsWith('cli-agent/')) return null
  const parts = model.split('/')
  const cli = parts[1]
  if (!cli) return null
  const modelId = parts.slice(2).join('/').trim()
  return modelId.length > 0 ? { cli, modelId } : { cli }
}

/**
 * The model tag string from a chat message's `model` field, which a host may
 * persist either as a plain string (`"cli-agent/cursor/composer"`) or wrapped
 * as `{ provider, model }`. Returns the inner string (or undefined). Used where
 * the tag must be a string — e.g. threading it into the CLI-run message view so
 * the model chip resolves — mirroring the unwrap `MessageRow` already does.
 */
export function messageModelTag(
  model: string | { model?: string } | null | undefined,
): string | undefined {
  if (typeof model === 'string') return model
  return typeof model?.model === 'string' ? model.model : undefined
}

/** CLI keys the user has switched on in the chip selector, in stable insertion order. */
export function enabledClis(state: CliConfigsActiveState | null | undefined): string[] {
  if (!state?.enabled) return []
  const enabled = state.enabled
  return Object.keys(enabled).filter((key) => enabled[key])
}

/** A `cli:auth-login` WS payload parsed into a UI-ready, typed shape. */
export type CliAuthLoginParsed =
  | { loginId: string; kind: 'chunk'; text: string }
  | { loginId: string; kind: 'completed'; credentialId: string }
  | { loginId: string; kind: 'error'; error: string }

/**
 * Parse a `cli:auth-login` WS payload (`{ loginId, type, event }`) into a typed
 * result, or null for unrelated/malformed traffic. The inner `event` is the
 * typed body — `{ chunk }`, `{ credentialId }`, or `{ error }` — NOT something
 * to stringify: doing so surfaced raw JSON (`{"loginId":...,"chunk":...}`) in
 * the login pane instead of the chunk text.
 */
export function parseCliAuthLoginEvent(data: unknown): CliAuthLoginParsed | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const loginId = typeof record.loginId === 'string' ? record.loginId : null
  if (!loginId) return null
  const event = (typeof record.event === 'object' && record.event ? record.event : {}) as Record<
    string,
    unknown
  >
  switch (record.type) {
    case 'chunk':
      return { loginId, kind: 'chunk', text: typeof event.chunk === 'string' ? event.chunk : '' }
    case 'completed':
      return {
        loginId,
        kind: 'completed',
        credentialId: typeof event.credentialId === 'string' ? event.credentialId : '',
      }
    case 'error':
      return {
        loginId,
        kind: 'error',
        error: typeof event.error === 'string' ? event.error : 'Login failed',
      }
    default:
      return null
  }
}

/**
 * CLIs whose login runs in the sandbox container and therefore can't open the
 * host's browser itself — the client auto-opens the printed sign-in URL for
 * these (thefactory-tools `CLI_CONTAINER_LOGIN`). A host login (codex) opens the
 * browser itself, so the client must NOT, or it would open a duplicate tab.
 */
export const CLI_CLIENT_OPENS_LOGIN_URL: ReadonlySet<string> = new Set([
  'cursor-agent',
  'claude-code',
])

/**
 * Extract the first sign-in URL from a CLI login's streamed output, so the UI
 * can surface it as a clickable link instead of raw terminal text. Returns null
 * until a URL has been printed.
 */
export function parseLoginUrl(output: string): string | null {
  const match = output.match(/https?:\/\/[^\s'"]+/)
  return match ? match[0].replace(/[.,)]+$/, '') : null
}

/**
 * True when the login is waiting for the user to paste a code (e.g. claude's
 * container fallback prints a "Paste code here" prompt). Host logins that
 * auto-complete via a localhost callback never show this, so the UI's paste box
 * stays hidden for them.
 */
export function loginAwaitsCode(output: string): boolean {
  return /\bpaste\b/i.test(output) && /\bcode\b/i.test(output)
}

/**
 * The run's `files-emitted` artifact (the agent's workspace diff), or undefined
 * when the run produced none. Runs auto-emit at most one, so first-match is
 * unambiguous.
 */
export function filesEmittedArtifactOf(
  artifacts: readonly FilesEmittedArtifact[] | undefined,
): FilesEmittedArtifact | undefined {
  return artifacts?.find((a) => a.kind === 'files-emitted')
}

/** Group CLI auth caches by their `cli` tag (caches of an unknown CLI still group under their string). */
export function groupCachesByCli<T extends { cli: string }>(
  caches: readonly T[],
): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  for (const cache of caches) {
    ;(out[cache.cli] ??= []).push(cache)
  }
  return out
}

/** The advisory auth-health of a credential, as carried on a `CliAuthCacheEntry`. */
export type CliAuthStatusLike = {
  authenticated: boolean
  reason?: 'auth-expired' | 'missing' | 'unknown'
  message?: string
}

/** A warning to surface on the model chip / settings when the selected CLI credential needs re-auth. */
export type CliAuthWarning = {
  needsReauth: boolean
  reason?: 'auth-expired' | 'missing' | 'unknown'
  message?: string
}

/**
 * Decide whether the model chip should flag the selected CLI credential for
 * re-authentication. Advisory + fail-open: no credential, an unknown credential,
 * a credential never checked (`authStatus` absent), or an authenticated one all
 * yield NO warning — we only warn when a stored status explicitly says
 * `authenticated: false` (a real run/inference failure or an explicit probe). This
 * avoids crying wolf on a freshly-added, not-yet-exercised credential.
 */
export function deriveCliAuthWarning(
  credentialId: string | null | undefined,
  caches: readonly { id: string; authStatus?: CliAuthStatusLike }[],
): CliAuthWarning {
  if (!credentialId) return { needsReauth: false }
  const status = caches.find((c) => c.id === credentialId)?.authStatus
  if (!status || status.authenticated) return { needsReauth: false }
  return {
    needsReauth: true,
    ...(status.reason ? { reason: status.reason } : {}),
    ...(status.message ? { message: status.message } : {}),
  }
}

/**
 * What a failed run's turn says about the failure, or `undefined` for a run
 * that did not fail. A run that failed before the agent spoke — a login that
 * could not be refreshed, a sandbox that would not start — has an empty
 * transcript, and its turn used to render as an empty block with only a delete
 * control. The reason is the run record's own, so it survives a reload.
 */
export function cliRunFailureNotice(
  status: CliRunStatus | undefined,
  abortReason: string | undefined,
): string | undefined {
  if (status !== 'errored') return undefined
  const reason = abortReason?.trim()
  return reason ? reason : CLI_RUN_FAILED_FALLBACK_NOTICE
}

/**
 * A run's messages with its failure as the last of them — see
 * {@link cliRunFailureNotice} — unless one of them already shows an error.
 */
export function withCliRunFailure<M extends ChatMessageLike>(
  messages: M[],
  status: CliRunStatus | undefined,
  abortReason: string | undefined,
): (M | ChatMessageLike)[] {
  const notice = cliRunFailureNotice(status, abortReason)
  if (notice === undefined || messages.some((m) => m.error)) return messages
  return [...messages, { role: 'assistant', content: '', error: notice }]
}

/**
 * A CLI turn's messages, or — until its run record arrives — the reply the chat
 * stored for the turn, so the turn is never blank while the record loads. A run
 * still going shows only its own steps; its activity line covers the wait.
 */
export function withStoredCliReply<M extends ChatMessageLike>(
  runMessages: M[],
  stored: { content?: string; model?: string } | undefined,
  active: boolean,
): (M | ChatMessageLike)[] {
  if (runMessages.length > 0 || active || !stored?.content?.trim()) return runMessages
  return [
    {
      role: 'assistant',
      content: stored.content,
      ...(stored.model ? { model: stored.model } : {}),
    },
  ]
}

/**
 * What a row whose ask has since been decided shows: an approval carried out —
 * in a later turn, the agent calling again — as that call's outcome, one not
 * carried out yet as under way, and a declined or expired ask as not run, and
 * why. `undefined` when the ask is not among the decided ones at hand.
 */
function decidedRowResult(
  ask: CliDecidedAsk | undefined,
  hostOutcome: CliHostCallOutcome | undefined,
): { type: CliToolRowResultType; result: unknown } | undefined {
  if (!ask) return undefined
  if (ask.status === 'approved') {
    if (ask.answer !== undefined) return { type: 'success', result: { answer: ask.answer } }
    if (!ask.execution) {
      return ask.executedAt === undefined
        ? { type: 'pending', result: undefined }
        : { type: 'success', result: { outcome: 'approved', reason: ASK_CARRIED_OUT_NOTE } }
    }
    return {
      type: ask.execution.ok ? 'success' : 'errored',
      result: parsedResultText(ask.execution.result),
    }
  }
  const reason =
    ask.status === 'denied'
      ? ASK_DECLINED_REASON
      : ask.decisionReason === 'cancelled'
        ? ASK_CANCELLED_REASON
        : ASK_EXPIRED_REASON
  return { type: 'not_allowed', result: { ...hostOutcome, outcome: ask.status, reason } }
}

function parsedResultText(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * A call the host answered by saying its approval had already been carried out
 * elsewhere: it ran nothing, and the approval's own row shows what came of it.
 */
function ranNothing(step: CliToolStep): boolean {
  if (step.hostOutcome !== undefined || step.result === undefined) return false
  return isAlreadyExecuted(
    typeof step.result === 'string' ? step.result : JSON.stringify(step.result),
  )
}

/** Who settled an ask, in the words its row shows; nothing for an ask recorded before decisions were attributed. */
function askDecisionNote(ask: CliDecidedAsk): string | undefined {
  if (ask.decidedVia === 'grant' && ask.rule !== undefined) return DECIDED_BY_RULE_NOTE(ask.rule)
  if (ask.decidedBy !== 'person') return undefined
  if (ask.status === 'denied') {
    return ask.decidedVia === 'moved-on' ? DECLINED_BY_MOVING_ON_NOTE : DECLINED_BY_YOU_NOTE
  }
  if (ask.status !== 'approved') return undefined
  return ask.decidedVia === 'approve-all' ? DECIDED_BY_YOU_APPROVE_ALL_NOTE : DECIDED_BY_YOU_NOTE
}

/**
 * The calls in this run that carried out an approval asked for in an EARLIER
 * run — the agent calling again after the decision. The ask's own row shows
 * that outcome, so these are left out rather than shown twice. Matched by tool
 * and arguments, one call per approval.
 */
function carryingOutCalls(
  steps: readonly CliTranscriptStep[],
  asks: readonly CliDecidedAsk[],
  runId: string | undefined,
): Set<CliTranscriptStep> {
  if (runId === undefined) return new Set()
  const carried = asks.filter(
    (a) => a.status === 'approved' && a.executedInRun === runId && a.runId !== runId,
  )
  return new Set(callsCarryingOut(steps, carried).keys())
}

/**
 * The calls in this run the user approved while the call was still held open —
 * asked and carried out in the same run — by tool and arguments, one call per
 * approval. Their transcript span includes the user's time deciding.
 */
function approvedWhileHeld(
  steps: readonly CliTranscriptStep[],
  asks: readonly CliDecidedAsk[],
  runId: string | undefined,
): Map<CliTranscriptStep, CliDecidedAsk> {
  if (runId === undefined) return new Map()
  const held = asks.filter(
    (a) => a.status === 'approved' && a.runId === runId && a.executedInRun === runId,
  )
  return callsCarryingOut(steps, held)
}

/**
 * The tool steps that ran each approval — a call the host answered by running
 * it (no host outcome), with the approval's tool and arguments, in order; one
 * step per approval.
 */
function callsCarryingOut(
  steps: readonly CliTranscriptStep[],
  approvals: readonly CliDecidedAsk[],
): Map<CliTranscriptStep, CliDecidedAsk> {
  const tied = new Map<CliTranscriptStep, CliDecidedAsk>()
  const open = [...approvals]
  for (const step of steps) {
    if (open.length === 0) break
    if (step.kind !== 'tool' || step.hostOutcome !== undefined) continue
    const args = stableStringify(step.input ?? {})
    const i = open.findIndex(
      (a) => a.toolName === step.toolName && stableStringify(a.args ?? {}) === args,
    )
    if (i >= 0) tied.set(step, open.splice(i, 1)[0]!)
  }
  return tied
}

/**
 * The calls a turn's end left open — no result came before the turn's `result`
 * — that no pending ask holds: nothing will run them now. A call held open for
 * an ask stays answerable; the host carries an approval out after the turn.
 */
function leftOpenAtTurnEnd(
  steps: readonly CliTranscriptStep[],
  held: ReadonlyMap<CliTranscriptStep, CliPendingAsk>,
): Set<CliTranscriptStep> {
  const ended = new Set<CliTranscriptStep>()
  let open: CliTranscriptStep[] = []
  for (const step of steps) {
    if (step.kind === 'result') {
      for (const o of open) ended.add(o)
      open = []
    } else if (step.kind === 'tool' && step.resultType === 'running' && !held.has(step)) {
      open.push(step)
    }
  }
  return ended
}

/**
 * Which pending ask each tool step is waiting on: first the steps whose host
 * outcome names the ask, then calls still held open, by name and arguments.
 * Each ask goes to one step at most.
 */
function tieAsksToSteps(
  steps: readonly CliTranscriptStep[],
  asks: readonly CliPendingAsk[],
): Map<CliTranscriptStep, CliPendingAsk> {
  const tied = new Map<CliTranscriptStep, CliPendingAsk>()
  const open = [...asks]
  const take = (matches: (ask: CliPendingAsk) => boolean): CliPendingAsk | undefined => {
    const i = open.findIndex(matches)
    return i < 0 ? undefined : open.splice(i, 1)[0]
  }
  for (const step of steps) {
    const actionId = step.kind === 'tool' ? step.hostOutcome?.actionId : undefined
    if (actionId === undefined) continue
    const ask = take((a) => a.id === actionId)
    if (ask !== undefined) tied.set(step, ask)
  }
  for (const step of steps) {
    if (step.kind !== 'tool' || step.resultType !== 'running') continue
    const args = stableStringify(step.input ?? {})
    const ask = take(
      (a) =>
        a.toolName === step.toolName && (a.args === undefined || stableStringify(a.args) === args),
    )
    if (ask !== undefined) tied.set(step, ask)
  }
  return tied
}
