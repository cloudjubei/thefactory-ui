/**
 * The delete affordance for one rendered chat row. A CLI turn is a whole agent
 * run behind a SINGLE stored assistant message — its tool rows and interim
 * replies are derived from the run record and have no message of their own — so
 * the control has to say that the whole turn goes, and must only ever be offered
 * on the row that owns the stored message.
 */
export type MessageDeleteControl = {
  /** Tooltip + accessible label. Names exactly what the click removes. */
  label: string
  /**
   * True while a turn is still streaming into the chat. The control still
   * renders — hiding it reads as "deleting is impossible" — but it refuses,
   * because removing the message a live run is about to write back into would
   * orphan that run.
   */
  disabled: boolean
  /** Set when the row owns a CLI run: deleting removes that entire turn. */
  cliRunId?: string
}

/** Everything the control is derived from. Pure input — no React, no I/O. */
export type MessageDeleteInput = {
  /** False when the host wired no delete action at all. */
  hasDeleteAction: boolean
  /**
   * True only for the chat's last message. The only delete the API offers is
   * `deleteLastChatMessage`, so the control is last-only on every runner.
   */
  isLast: boolean
  /** The CLI run this message owns, when it is a CLI turn rather than a plain message. */
  runId?: string
  /**
   * True while a turn is streaming into this chat, as the CLIENT knows it.
   * Deliberately session-local (`isSending` / a pending bubble): the chat's
   * live `cliRunId` is kept set after a run terminates so the run view stays
   * mounted, so it says "a run happened here", not "a run is happening".
   */
  turnInFlight: boolean
}
