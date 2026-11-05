/** The answers a stuck card offers. */
export type StuckCardAnswerKind = 'continue' | 'hint' | 'stop'

/** One answer: its words, what it does, and what it sends. */
export type StuckCardAnswer = {
  kind: StuckCardAnswerKind
  label: string
  detail: string
}

/** A stuck question, as its card shows it. */
export type StuckCardView = {
  title: string
  question: string
  context?: string
  /** What the host saw, a line each. */
  evidence: string[]
  answers: StuckCardAnswer[]
}
