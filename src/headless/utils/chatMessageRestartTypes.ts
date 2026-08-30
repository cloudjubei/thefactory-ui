/**
 * The restart affordance for one rendered chat row. It exists for the case
 * where a turn ended without the agent answering — the request errored, or the
 * user removed the failed reply — so the conversation's last message is the
 * user's own. Activating it re-triggers the agent on the conversation exactly
 * as it stands; no copy of the message is appended.
 */
export type MessageRestartControl = {
  /** Tooltip + accessible label. Says what the click re-runs, or why it refuses. */
  label: string
  /**
   * True while a turn is streaming into this chat. The control still renders —
   * hiding it would read as "this turn can never be re-run" — but it refuses,
   * because a second turn started on top of a live one races it for the chat.
   */
  disabled: boolean
}

/** Everything the control is derived from. Pure input — no React, no I/O. */
export type MessageRestartInput = {
  /** False when the host wired no restart action at all (e.g. an agent-run chat). */
  hasRestartAction: boolean
  /** True only for the chat's last message: only the tail turn can be re-run. */
  isLast: boolean
  /**
   * The row's role. Only a `user` row qualifies — every other tail means the
   * turn produced something, and re-running it would either duplicate that work
   * or run against the wrong prompt. The user trims such a tail with the delete
   * control first, which is what makes the restart appear.
   */
  role: string
  /**
   * True while a turn is streaming into this chat, as the CLIENT knows it.
   * Deliberately the same session-local signal the delete control uses
   * (`isSending` / a pending bubble) — the chat's live `cliRunId` is kept set
   * after a run terminates, so it says "a run happened here", not "a run is
   * happening".
   */
  turnInFlight: boolean
}
