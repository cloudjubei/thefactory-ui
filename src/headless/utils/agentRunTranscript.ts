import type { ProcessLedgerEntry } from 'thefactory-tools/types'
import { getChatContext, isAgentRunChatContext } from 'thefactory-tools/utils'

import { AGENT_NEVER_STARTED } from './agentRunTranscriptConstants'

/**
 * What a step's panel shows in place of its agent's chat when the host stopped
 * the attempt before the agent's first turn (`agentNotStarted`): there is no
 * transcript to open, only why it never began. Absent for an attempt whose
 * agent started. Pure.
 */
export function agentNeverStartedNote(
  entry: Pick<ProcessLedgerEntry, 'agentNotStarted'> | undefined,
): string | undefined {
  const reason = entry?.agentNotStarted
  if (reason === undefined) return undefined
  return AGENT_NEVER_STARTED(reason.trim())
}

/**
 * Whether a chat key (`getChatContextKey`) is an agent run's chat — a story's
 * or a feature's — whose view is the run's transcript rather than a
 * conversation a person starts. Pure.
 */
export function isAgentRunChatKey(chatKey: string | undefined): boolean {
  if (!chatKey) return false
  const context = getChatContext(chatKey)
  return context !== undefined && isAgentRunChatContext(context)
}
