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

const TRANSCRIPT_KIND_LABEL: Record<CliRunTranscriptEntry['kind'], string> = {
  assistant: 'Assistant',
  'tool-call': 'Tool call',
  'tool-result': 'Tool result',
  system: 'System',
  result: 'Result',
  other: 'Step',
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

/** A transcript entry reduced to what the inspector panel renders. */
export type CliTranscriptEntryView = {
  /** Short heading: the kind (e.g. "Tool call") plus the tool name when known. */
  label: string
  /** Most human-readable rendering — assistant prose where extractable, else the raw JSON. */
  detail: string
  /** The full pretty-printed payload, always available for thorough inspection. */
  raw: string
}

/**
 * Reduce one CLI transcript entry to a readable {@link CliTranscriptEntryView}.
 * `detail` prefers extracted prose (assistant text) and otherwise falls back to
 * the pretty-printed payload; `raw` is always the pretty payload so the panel
 * can offer a "show raw" toggle only when it differs from `detail`.
 */
export function cliTranscriptEntryView(entry: CliRunTranscriptEntry): CliTranscriptEntryView {
  const base = TRANSCRIPT_KIND_LABEL[entry.kind] ?? 'Step'
  const toolName = entry.kind === 'tool-call' ? cliToolNameFromEntry(entry) : undefined
  const label = toolName ? `${base} · ${toolName}` : base
  const raw = safeTranscriptJson(entry.payload)
  const prose = entry.kind === 'assistant' ? cliAssistantTextFromEntry(entry) : ''
  const detail = prose.trim() ? prose : raw
  return { label, detail, raw }
}

/** A `cli:run-update` WS payload narrowed to the bits the chat stream consumes. */
export type CliRunUpdateParsed =
  | { runId: string; kind: 'transcript'; text: string }
  | { runId: string; kind: 'terminal' }
  | { runId: string; kind: 'other' }

/**
 * Parse a `cli:run-update` WS payload (`{ runId, type, event }`) into a typed
 * shape for the chat streaming preview: `transcript` carries the entry's
 * assistant text (possibly empty), `terminal` marks `finished`/`error`. Returns
 * `null` when the payload isn't a recognisable run-update envelope.
 */
export function parseCliRunUpdateEvent(data: unknown): CliRunUpdateParsed | null {
  if (typeof data !== 'object' || data === null) return null
  const { runId, type, event } = data as { runId?: unknown; type?: unknown; event?: unknown }
  if (typeof runId !== 'string' || typeof type !== 'string') return null
  if (type === 'finished' || type === 'error') return { runId, kind: 'terminal' }
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
