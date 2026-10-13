import type { GetActiveRunnerKindResponse } from '../api/generated'

/** The agent-run choice as the server stores it: the runner and the API config runs use. */
export type AgentRunnerSelectionReply = GetActiveRunnerKindResponse

/** Which halves of the agent-run choice the person picked since a read of it began. */
export type AgentRunnerPicksSinceRead = {
  runnerKind: boolean
  llmConfig: boolean
}

/** What a read changes; an absent field is left as it is, and a `null` config means none is stored. */
export type AgentRunnerSelectionUpdate = {
  runnerKind?: 'api' | 'cli'
  llmConfigId?: string | null
}
