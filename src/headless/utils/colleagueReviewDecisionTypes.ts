import type { ProcessStatusTone } from './processView'

/** One thing the person may choose on the review decision card. */
export interface ReviewDecisionAction {
  /** `send-reply`, `approve-and-merge`, `request-changes`, `abandon`, or another gate action's id. */
  id: string
  label: string
  /** What choosing it does, in a line, when the gate says. */
  detail?: string
  primary: boolean
  /** It carries the reply as the person edited it. */
  editsText: boolean
  /** It needs the person's note: what to look at next. */
  noteRequired: boolean
}

/** The round the card decides on, as its head reads it. */
export interface ReviewDecisionVerdict {
  round: number
  /** "Round 2 of 2". */
  title: string
  verdictLabel?: string
  tone?: ProcessStatusTone
  /** What the round came to: "2 fixed · 1 still open". */
  summary: string
}

/** What a review chat's decision card answers the agent with: the person's choice and edits. */
export interface ReviewDecisionArgs {
  choice: string
  reply?: string
  note?: string
}

/** How a review run's actions gate is answered. */
export type ReviewGateAnswer =
  | { choice: 'approve'; gateAction: { id: string; text?: string } }
  | { choice: 'request-changes'; note: string }
  | { choice: 'abandon' }
