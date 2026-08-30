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
  /** Wall-clock ms the run has been watched for. */
  elapsedMs: number
  /** Rough streamed-output token estimate; `0` hides the readout. */
  approxTokens: number
  /** What the run is waiting on the human for, if anything. */
  blocked: readonly CliRunBlockedOn[]
}

/** The line rendered next to the spinner: what the agent is doing right now. */
export type CliRunActivity = {
  tone: CliRunActivityTone
  label: string
  sublabel?: string
}
