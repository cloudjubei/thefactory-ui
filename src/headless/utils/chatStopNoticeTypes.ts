import type { ProcessStatusTone } from './processView'

/** Whose problem a stop was: Overseer's own fault, the model provider, the agent's work, or the turn limit. */
export type ChatStopCause = 'overseer' | 'provider' | 'agent' | 'turns'

/**
 * Why a turn or a story run stopped, as the host wrote it on the message. Mirrors the tools'
 * `CompletionStopNotice` by hand, field for field.
 */
export type ChatStopNotice = {
  cause: ChatStopCause
  /** The feature a story run stopped on; absent for a chat's own turn. */
  featureTitle?: string
  /** One or two plain sentences: what happened, and that the work so far is kept. */
  reason: string
  /** The raw error text, shown only under "Show details". */
  raw?: string
  /** The turn limit that ran out, for cause `turns`. */
  turnLimit?: number
  /** How many times in a row this same failure has now happened. */
  repeats?: number
}

/** The stop card as drawn from a notice. */
export type ChatStopCardView = {
  title: string
  /** Whose problem it was; absent for a cause this build does not know. */
  pill?: { label: string; tone: ProcessStatusTone }
  /** The card's edge, in the pill's tone. */
  tone: ProcessStatusTone
  reason: string
  /** Said when the same failure happened again. */
  repeatLine?: string
  /** What the card's restart button says. */
  primaryLabel: string
  /** For the agent's own failure: the message "Ask the agent to fix it" drafts. */
  askAgentDraft?: string
  /** The raw error under "Show details", when there is one. */
  details?: string
}

/** Which of the row's restarts the card's primary button runs. */
export type ChatStopRestartInput = {
  /** The row's restart control, when the list offers one (`describeLastUserMessageRestart`). */
  restart?: { label: string; disabled: boolean }
  /** The host wired a retry of the last action. */
  hasRetry: boolean
  /** The row is the chat's last — only there is a retry offered. */
  isLast: boolean
  /** A turn is being answered. */
  isThinking: boolean
}

/** The card's primary button: which restart it runs, or none where the row offers none. */
export type ChatStopRestart = { via: 'restart' | 'retry'; title: string; disabled: boolean }
