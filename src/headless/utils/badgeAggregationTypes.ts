/**
 * Live ROOT process runs for a scope: `running` = pending or running (the
 * spinner), `waiting` = parked on the user — at the sign-off gate or any other
 * park (the count).
 */
export type ProcessTally = { running: number; waiting: number }

export type BadgeState = {
  chat_messages: { unread: number; thinking: boolean }
  git: { incoming: number; uncommitted: number }
  tests: { failing: number }
  /**
   * Background activities for the scope: `running` = live (spinner), `paused` =
   * a `running` run that isn't live in the server process (resumable; paused icon),
   * `unseen` = runs that finished since the user last opened this project's app tab.
   */
  activity: { running: number; paused: number; unseen: number }
  process: ProcessTally
}
