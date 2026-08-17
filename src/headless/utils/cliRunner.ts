// Pure CLI-runner helpers — the testable core behind CliConfigsContext,
// useChatCliRunner, and the runner-aware chat dispatch. No React, no I/O.

import type {
  ChatCliRunner,
  CliConfigsActiveState,
  CliRunArtifact,
  CliRunnerDispatchOptions,
  CliRunTranscriptEntry,
  CliTool,
  FilesEmittedArtifact,
  StartCliAgentRunData,
} from '../api/generated'
import type { ChatMessageLike, ToolOrigin } from './chatTypes'

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
    ...(runner.effort ? { effort: runner.effort as StartCliAgentRunData['body']['effort'] } : {}),
  }
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
    ...(runner.effort ? { effort: runner.effort } : {}),
    // Default to resident (the session-warm process — no per-turn container/CLI
    // boot). An unset execMode means the user never touched the toggle; resident
    // is the better default and `isResidentEligible` degrades to per-turn when
    // the chat can't run resident (no manager / no chatContextId / no credential).
    // Explicit 'per-turn' still forces the cold path. Server-side default so
    // mobile (no toggle) inherits it too.
    execMode: runner.execMode ?? 'resident',
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

/** Lifecycle/outcome class for a CLI tool step. A CLI tool is `running` from the
 * moment its call is seen until its result arrives (CLI tools execute when
 * called — they're never "queued"); then `success` / `errored`. */
export type CliToolStepResultType = 'success' | 'errored' | 'running'

/**
 * A CLI transcript reduced to readable, render-ready steps. Tool calls and
 * their later results are merged into a single `tool` step (paired by id), so
 * a consumer can render one drawer per logical operation — VS Code style.
 */
export type CliTranscriptStep =
  | { kind: 'thinking'; at: number; durationMs?: number; text: string }
  | { kind: 'assistant'; at: number; durationMs?: number; text: string }
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
      /** Parsed call arguments, when extractable. */
      input?: unknown
      /** The tool's result once it arrives; undefined while the call is in flight. */
      result?: unknown
      resultType: CliToolStepResultType
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
 * `assistant` message, which the runner then classifies as `tool-call`. */
export function cliThinkingTextFromEntry(entry: CliRunTranscriptEntry): string {
  const content = asTranscriptRecord(asTranscriptRecord(entry.payload)?.message)?.content
  if (!Array.isArray(content)) return ''
  return content
    .map((b) => asTranscriptRecord(b))
    .filter((b): b is Record<string, unknown> => !!b && b.type === 'thinking' && typeof b.thinking === 'string')
    .map((b) => b.thinking as string)
    .join('\n')
    .trim()
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
    return { toolName: cleanCliToolName(item.type), origin: 'native', toolCallId: asString(item.id), input }
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
  result: unknown
  resultType: CliToolStepResultType
}

function extractCliToolResult(entry: CliRunTranscriptEntry): ExtractedResult {
  const p = asTranscriptRecord(entry.payload)
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
    const unwrapped = codexRes.result != null ? unwrapCursorResult({ success: codexRes.result }) : undefined
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
          result: maybeParseJson(b.content),
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
  if (Array.isArray(content)) {
    const text = content
      .map((c) => {
        const cr = asTranscriptRecord(c)
        if (typeof cr?.text === 'string') return cr.text
        const inner = asTranscriptRecord(cr?.text)
        return typeof inner?.text === 'string' ? inner.text : ''
      })
      .filter(Boolean)
      .join('\n')
    return { result: maybeParseJson(text), isError }
  }
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
  if (type === 'turn.failed' || p?.is_error === true || asString(p?.subtype) === 'error') return 'Failed'
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
export function normalizeCliTranscript(entries: CliRunTranscriptEntry[]): CliTranscriptStep[] {
  const steps: CliTranscriptStep[] = []
  const toolIndexById = new Map<string, number>()

  for (const entry of entries) {
    switch (entry.kind) {
      case 'assistant': {
        const thinking = cliThinkingTextFromEntry(entry)
        if (thinking) steps.push({ kind: 'thinking', at: entry.at, text: thinking })
        const text = cliAssistantTextFromEntry(entry)
        // Coalesce consecutive assistant entries into one growing message:
        // streaming CLIs (resident cursor/codex) emit the reply as many small
        // per-chunk `assistant` deltas, which must render as ONE bubble that
        // fills in live — not a fragmented run of tiny messages. A delta is
        // appended verbatim (whitespace preserved) when the previous step is
        // already an assistant bubble; otherwise a non-blank delta starts one.
        const last = steps[steps.length - 1]
        if (last && last.kind === 'assistant') {
          last.text += text
        } else if (text.trim()) {
          steps.push({ kind: 'assistant', at: entry.at, text })
        }
        break
      }
      case 'tool-call': {
        // Claude can emit a thinking block in the same message as a tool call
        // (classified `tool-call`); surface it as its own step first.
        const toolThinking = cliThinkingTextFromEntry(entry)
        if (toolThinking) steps.push({ kind: 'thinking', at: entry.at, text: toolThinking })
        const call = extractCliToolCall(entry)
        const step: CliToolStep = {
          kind: 'tool',
          at: entry.at,
          toolName: call.toolName,
          origin: call.origin,
          toolCallId: call.toolCallId,
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
        const res = extractCliToolResult(entry)
        const idx = res.toolCallId ? toolIndexById.get(res.toolCallId) : undefined
        const existing = idx != null ? steps[idx] : undefined
        if (existing && existing.kind === 'tool') {
          existing.result = res.result
          existing.resultType = res.resultType
          if (entry.at > existing.at) existing.durationMs = entry.at - existing.at
        } else {
          steps.push({
            kind: 'tool',
            at: entry.at,
            toolName: res.toolName ?? 'tool',
            origin: res.origin,
            toolCallId: res.toolCallId,
            input: undefined,
            result: res.result,
            resultType: res.resultType,
          })
        }
        break
      }
      case 'system':
        steps.push({ kind: 'system', at: entry.at, summary: summarizeCliSystem(entry), raw: safeTranscriptJson(entry.payload) })
        break
      case 'result':
        steps.push({ kind: 'result', at: entry.at, summary: summarizeCliResult(entry), raw: safeTranscriptJson(entry.payload) })
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
 * the run's aggregate cost/tokens are attached as `usage` to the first assistant
 * message (the one that shows the model chip) so a CLI run surfaces a cost chip
 * just like an API turn — but only when the CLI reported usage.
 */
export function cliTranscriptToMessages(
  entries: CliRunTranscriptEntry[],
  opts?: { model?: string; showThinking?: boolean },
): ChatMessageLike[] {
  const showThinking = opts?.showThinking ?? true
  const steps = normalizeCliTranscript(entries)
  const messages: ChatMessageLike[] = []
  for (const step of steps) {
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
      messages.push({
        role: 'tool',
        content: '',
        startedAt,
        ...(step.durationMs != null ? { durationMs: step.durationMs } : {}),
        toolCall: {
          toolCallId: step.toolCallId ?? `cli-${step.at}`,
          name: step.toolName,
          arguments: step.input,
          origin: step.origin,
        },
        toolResult: {
          result: step.result,
          type: step.resultType,
          durationMs: step.durationMs ?? 0,
        },
      })
    }
  }
  const usage = aggregateCliRunUsage(entries)
  if (usage) {
    const firstAssistant = messages.find((m) => m.role === 'assistant')
    if (firstAssistant) firstAssistant.usage = usage
  }
  return messages
}

/**
 * Sum a CLI run's per-entry `costUSD` into a single {@link MessageUsageLike}, or
 * `undefined` when the run reported no cost (some CLIs don't emit it). Token
 * counts aren't carried per transcript entry, so the chip surfaces cost only.
 */
function aggregateCliRunUsage(entries: CliRunTranscriptEntry[]): ChatMessageLike['usage'] {
  let cost = 0
  for (const e of entries) {
    if (typeof e.costUSD === 'number' && Number.isFinite(e.costUSD)) cost += e.costUSD
  }
  return cost > 0 ? { cost } : undefined
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
 * these. Host logins (claude-code, codex) open the browser themselves, so the
 * client must NOT, or it would open a duplicate tab.
 */
export const CLI_CLIENT_OPENS_LOGIN_URL: ReadonlySet<string> = new Set(['cursor-agent'])

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
  artifacts: readonly CliRunArtifact[] | undefined,
): FilesEmittedArtifact | undefined {
  return artifacts?.find((a): a is FilesEmittedArtifact => a.kind === 'files-emitted')
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
