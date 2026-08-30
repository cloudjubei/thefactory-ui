// Shapes behind a mid-run `askUser` question: the parsed payload the question
// card renders, and the decision body sent back to the CLI action broker.

/**
 * A question a sandboxed CLI agent raised mid-run through `askUser`, parsed
 * defensively out of the broker action's `unknown` payload.
 */
export type AgentQuestion = {
  /** The question to put to the user. Falls back to a generic prompt when the payload carries none. */
  question: string
  /** Extra background the agent supplied to make the question answerable. */
  context?: string
  /** Suggested answers. The user may pick one and still edit it before sending. */
  options?: string[]
  /**
   * The payload exactly as received, kept only when it could not be parsed into
   * a question — so the card can show what the agent actually sent instead of
   * hiding it behind the fallback prompt.
   */
  raw?: unknown
}

/**
 * Body for `decideCliAgentAction` when resolving a question action. The answer
 * rides in `metadata`, which the broker hands back to the waiting agent.
 */
export type AgentQuestionDecision = {
  outcome: 'approved' | 'denied'
  metadata: { answer: string }
}
