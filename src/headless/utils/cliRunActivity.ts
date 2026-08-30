// Pure helpers behind the LIVE view of a CLI agent run: how its streamed
// transcript is accumulated, and what single line describes what the agent is
// doing right now. No React, no I/O.

import type { CliRunTranscriptEntry } from '../api/generated'
import {
  CLI_BLOCKED_SUBLABEL,
  CLI_BOOT_SUBLABEL,
  CLI_CHARS_PER_TOKEN,
  CLI_QUESTION_SUBLABEL,
} from './cliRunActivityConstants'
import type { CliRunActivity, CliRunActivityInput, CliRunBlockedOn } from './cliRunActivityTypes'
import type { ChatMessageLike, PendingToolGrantData } from './chatTypes'

/**
 * Reconcile a fetched run record's transcript against what the live stream has
 * already accumulated. Within one run the transcript only ever GROWS, so the
 * shorter of the two is always the stale one — and a mid-run record can be
 * shorter (the resident runner only persists its transcript at the terminal
 * write), which is exactly the case where blindly taking the fetched copy erased
 * everything the user had watched arrive.
 *
 * Returns the argument itself (not a copy) so an unchanged transcript keeps its
 * identity and costs no re-render.
 */
export function mergeCliRunTranscript(
  current: CliRunTranscriptEntry[],
  fetched: CliRunTranscriptEntry[],
): CliRunTranscriptEntry[] {
  return fetched.length >= current.length ? fetched : current
}

/**
 * Append a batch of streamed entries, dropping any that predate the newest entry
 * already held — the initial record fetch and the live stream overlap, so the
 * same entry can arrive twice. Returns `current` unchanged when the batch adds
 * nothing, so a redundant flush never re-renders.
 */
export function appendCliRunTranscript(
  current: CliRunTranscriptEntry[],
  incoming: readonly CliRunTranscriptEntry[],
): CliRunTranscriptEntry[] {
  let lastAt = current.length > 0 ? current[current.length - 1].at : Number.NEGATIVE_INFINITY
  const kept: CliRunTranscriptEntry[] = []
  for (const entry of incoming) {
    if (entry.at < lastAt) continue
    lastAt = entry.at
    kept.push(entry)
  }
  if (kept.length === 0) return current
  return [...current, ...kept]
}

/**
 * Names of the tools currently in flight, read off the derived chat messages
 * (the same rows the list renders). A tool the run is BLOCKED on is typed
 * `require_confirmation`, not `running`, so it drops out here and is named by
 * the blocked line instead — the agent is not executing it, it is waiting.
 */
export function runningCliToolNames(messages: readonly ChatMessageLike[]): string[] {
  const names: string[] = []
  for (const message of messages) {
    if (message.role !== 'tool') continue
    if (message.toolResult?.type !== 'running') continue
    const name = message.toolCall?.name
    if (typeof name === 'string' && name.length > 0) names.push(name)
  }
  return names
}

/**
 * Rough count of the tokens the agent has streamed back so far, from the
 * assistant prose in the derived messages. A "not idling" readout, not billing:
 * the run record's own cost is what the usage chip reports.
 */
export function approxCliOutputTokens(messages: readonly ChatMessageLike[]): number {
  let chars = 0
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    if (typeof message.content === 'string') chars += message.content.length
  }
  return Math.floor(chars / CLI_CHARS_PER_TOKEN)
}

/**
 * Project the unified grant feed onto the shape the activity line consumes.
 * Both permission grants and `askUser` questions block the run, so both appear
 * — the question flag only changes the wording.
 */
export function blockedOnFromGrants(
  grants: readonly PendingToolGrantData[] | undefined,
): CliRunBlockedOn[] {
  const out: CliRunBlockedOn[] = []
  for (const grant of grants ?? []) {
    out.push({
      ...(grant.toolName ? { toolName: grant.toolName } : {}),
      label: grant.label,
      ...(grant.question ? { isQuestion: true } : {}),
    })
  }
  return out
}

/** Tool names the run is blocked on — what a transcript row should badge as awaiting approval. */
export function blockedToolNames(blocked: readonly CliRunBlockedOn[]): string[] {
  const names: string[] = []
  for (const item of blocked) {
    if (item.isQuestion) continue
    if (item.toolName) names.push(item.toolName)
  }
  return names
}

/** "12s" under a minute, "1m 05s" beyond. Negative / non-finite input reads as "0s". */
export function formatCliElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

/**
 * The "(1m 05s · ~340 tokens)" tail. Suppressed under a second so a
 * just-started turn doesn't flash "(0s)".
 */
function activitySuffix(elapsedMs: number, approxTokens: number): string {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 1000) return ''
  const tokens = approxTokens > 0 ? ` · ~${approxTokens} tokens` : ''
  return ` (${formatCliElapsed(elapsedMs)}${tokens})`
}

/**
 * The one line that says what the agent is doing right now, in priority order:
 * blocked on the human > booting the sandbox > running a named tool > working.
 * Blocked wins outright — a run parked on an approval must never read the same
 * as one that is busy, which is the whole point of the line.
 */
export function describeCliRunActivity(input: CliRunActivityInput): CliRunActivity {
  const suffix = activitySuffix(input.elapsedMs, input.approxTokens)
  const blocked = input.blocked
  if (blocked.length === 1) {
    const only = blocked[0]
    if (only.isQuestion) {
      return {
        tone: 'blocked',
        label: `Waiting for your answer${suffix}`,
        sublabel: CLI_QUESTION_SUBLABEL,
      }
    }
    return {
      tone: 'blocked',
      label: `Waiting for your approval: ${only.toolName ?? only.label}${suffix}`,
      sublabel: CLI_BLOCKED_SUBLABEL,
    }
  }
  if (blocked.length > 1) {
    return {
      tone: 'blocked',
      label: `Waiting for you on ${blocked.length} actions${suffix}`,
      sublabel: blocked.some((item) => item.isQuestion)
        ? CLI_QUESTION_SUBLABEL
        : CLI_BLOCKED_SUBLABEL,
    }
  }
  if (input.booting) {
    return input.coldStart
      ? {
          tone: 'booting',
          label: `Preparing ${input.agentLabel ?? 'the agent'}…${suffix}`,
          sublabel: CLI_BOOT_SUBLABEL,
        }
      : { tone: 'booting', label: `Starting the turn…${suffix}` }
  }
  const running = input.runningToolNames
  if (running.length === 1) return { tone: 'working', label: `Running ${running[0]}…${suffix}` }
  if (running.length > 1) {
    return {
      tone: 'working',
      label: `Running ${running[0]} +${running.length - 1} more…${suffix}`,
    }
  }
  return { tone: 'working', label: `Working…${suffix}` }
}
