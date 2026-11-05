/** The stuck card's words. The answers' own are the tools', which read them back. */
export const STUCK_CARD_COPY = {
  evidence: 'What it kept doing',
  hintPlaceholder: 'What should it try instead?',
  hintSend: 'Send hint',
  hintOpen: 'Write',
  go: 'Send',
  stopOpen: 'Stop…',
  stopAsk: 'End this turn?',
  keep: 'Keep it waiting',
} as const

/** How often the same thing happened, as an evidence line. */
export const STUCK_EVIDENCE_TIMES = (toolName: string, count: number): string =>
  `${toolName}, ${count} ${count === 1 ? 'time' : 'times in a row'}`

/** The chip and notice on a step the host stopped repeating itself. */
export const STUCK_RUN_LABEL = 'Stuck'
