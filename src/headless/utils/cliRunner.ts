// Pure CLI-runner helpers — the testable core behind CliConfigsContext,
// useChatCliRunner, and the runner-aware chat dispatch. No React, no I/O.

import type {
  ChatCliRunner,
  CliConfigsActiveState,
  CliRunnerDispatchOptions,
  CliTool,
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
  }
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
