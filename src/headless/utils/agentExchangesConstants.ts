/** The pill on an exchange the agents settled between them. */
export const AGENT_EXCHANGE_HANDLED = 'Handled'

/** How each agent that hands a turn over heads its quiet line. */
export const AGENT_EXCHANGE_HEADS: Readonly<Record<string, string>> = {
  manager: 'Manager briefed the agent',
  verifier: 'Verifier sent it back',
  'code reviewer': 'Code review sent it back',
  checks: 'Checks sent it back',
  proof: 'Proof check sent it back',
  'base branch': 'Base branch sent it back',
}

/** The quiet line's head for an agent with none of its own. */
export const AGENT_EXCHANGE_HEAD = (label: string): string => `${label} handed it back`

/** The quiet line's head when the agents' turn opened with no hand-off kept. */
export const AGENT_EXCHANGE_HEAD_UNOPENED = 'The agents worked on it'

export const AGENT_EXCHANGE_TO_AGENT = (label: string): string => `${label} → agent`
export const AGENT_EXCHANGE_FROM_AGENT = (label: string): string => `Agent → ${label.toLowerCase()}`

/** How long a one-liner of what an agent said may run. */
export const AGENT_EXCHANGE_LINE_MAX_CHARS = 140

/** How long the expanded line's summary of what an agent said may run. */
export const AGENT_EXCHANGE_SUMMARY_MAX_CHARS = 320
