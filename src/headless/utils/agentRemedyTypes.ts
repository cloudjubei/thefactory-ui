// Shapes behind a mid-run remedy: the parsed payload the remedy card renders,
// and the decision body sent back to the CLI action broker.

/** One way the user can unblock a remedy — mirrors the SDK `RemedyOption`. */
export type AgentRemedyOption = {
  id: string
  kind: 'hint' | 'agent' | 'manual'
  label: string
  /** For `kind:'hint'` — the tool arg the hint fills (dot path) + suggested values. */
  param?: string
  suggestions?: string[]
}

/**
 * A remedy a remediable tool raised, parsed defensively out of the broker
 * action's `unknown` payload.
 */
export type AgentRemedy = {
  /** The blocked tool. */
  tool: string
  /** One-sentence description of what is blocking. */
  summary: string
  /** Optional longer detail. */
  detail?: string
  /** What the tool already tried before asking. */
  attempted?: string[]
  /** The ways forward offered to the user. */
  remedies: AgentRemedyOption[]
  /** The raw payload, kept only when it could not be parsed — so the card can show it. */
  raw?: unknown
}

/**
 * Body for `decideCliAgentAction` when resolving a remedy. The chosen option id
 * (and, for a hint, the value) ride in `metadata`, which the broker hands back
 * to the waiting run so it can retry.
 */
export type AgentRemedyDecision = {
  outcome: 'approved' | 'denied'
  metadata: { remedyId: string; value?: string }
}
