/** Emphasis for the live activity line. Copy is carried on the line itself. */
export type CliRunActivityTone = 'booting' | 'working' | 'blocked'

/**
 * One thing a run is parked on — a gated tool awaiting approval, or an
 * `askUser` question awaiting text. Derived from the unified grant feed so the
 * transcript and the approval surface can never disagree about what is blocking.
 */
export type CliRunBlockedOn = {
  /** The tool the agent is blocked on, when the action names one. */
  toolName?: string
  /** Human label for the action — used when the action names no tool. */
  label: string
  /** True for an `askUser` question: answered with text, not approved. */
  isQuestion?: boolean
}

/** Everything the activity line is derived from. Pure input — no React, no I/O. */
export type CliRunActivityInput = {
  /** Tools called but not yet resolved, in call order. */
  runningToolNames: readonly string[]
  /** True while the run has produced no transcript yet (sandbox boot / first byte). */
  booting: boolean
  /** True only for the chat's FIRST CLI run — gates the cold-start reassurance. */
  coldStart: boolean
  /** Human CLI name ("Claude Code") for the cold-start line. */
  agentLabel?: string
  /** Wall-clock ms since the agent's last transcript event (the run start while booting). */
  sinceLastActionMs: number
  /** What the run is waiting on the human for, if anything. */
  blocked: readonly CliRunBlockedOn[]
}

/** The line rendered next to the spinner: what the agent is doing right now. */
export type CliRunActivity = {
  tone: CliRunActivityTone
  label: string
  sublabel?: string
}

/**
 * What the host answered a call with when it did NOT run the tool — waiting
 * for approval, refused by a latch, declined or expired. The JSON body the
 * agent received.
 */
export type CliHostCallOutcome = Record<string, unknown> & {
  outcome: string
  actionId?: string
}

/** An undecided ask a transcript row can be tied to. */
export type CliPendingAsk = {
  id: string
  toolName?: string
  args?: unknown
  /**
   * Decided on the row itself — an ordinary tool ask. Otherwise it is answered
   * in a panel of its own (a question, a launch) and the row only waits.
   */
  decidedOnRow: boolean
  /** Decided here a moment ago; what came of it has not arrived yet. */
  awaitingOutcome?: boolean
}

/** An ask that has been decided — what a transcript row that once waited on it shows now. */
export type CliDecidedAsk = {
  id: string
  /** The run that raised it. */
  runId: string
  status: 'approved' | 'denied' | 'expired'
  toolName?: string
  args?: unknown
  /** Why it expired — `cancelled` when its run was stopped. */
  decisionReason?: string
  /** What the user answered, for a question. */
  answer?: string
  /** When the approval was carried out — set with or without a kept result. */
  executedAt?: number
  /** The run whose call carried the approval out, once one has. */
  executedInRun?: string
  /** What that call returned. */
  execution?: { ok: boolean; result: string; durationMs?: number }
}
