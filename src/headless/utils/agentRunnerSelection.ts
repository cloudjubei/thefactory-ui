import type {
  AgentRunnerPicksSinceRead,
  AgentRunnerSelectionReply,
  AgentRunnerSelectionUpdate,
} from './agentRunnerSelectionTypes'

/**
 * What a read of the server's agent-run choice changes on this device: the
 * runner and the API config the server names — the config agent runs use —
 * except a half the person picked while the read was out. A failed read
 * changes nothing. Pure.
 */
export function agentRunnerSelectionUpdate(
  reply: AgentRunnerSelectionReply | undefined,
  pickedSinceRead: AgentRunnerPicksSinceRead,
): AgentRunnerSelectionUpdate {
  if (!reply) return {}
  return {
    ...(!pickedSinceRead.runnerKind && reply.activeRunnerKind
      ? { runnerKind: reply.activeRunnerKind }
      : {}),
    ...(!pickedSinceRead.llmConfig ? { llmConfigId: reply.activeLlmConfigId ?? null } : {}),
  }
}
