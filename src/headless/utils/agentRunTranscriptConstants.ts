/** An agent step whose agent the host stopped before its first turn: the reason, when it gave one. */
export const AGENT_NEVER_STARTED = (reason: string): string =>
  reason ? `The agent never started — ${reason}` : 'The agent never started.'

/** An agent run's transcript with nothing in it yet — never the person-chat "Start chatting" hint. */
export const AGENT_RUN_TRANSCRIPT_EMPTY = {
  title: 'No transcript yet',
  body: 'The agent’s messages show here once it writes any.',
} as const
