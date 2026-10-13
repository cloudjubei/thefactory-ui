/**
 * Live ROOT process runs for a scope: `running` = pending, running or merging
 * (the moving droplets), `waiting` = parked on the user — at the sign-off gate
 * or any other park, or approved work not brought in yet — and `failed` =
 * approved work whose merge failed (something broke: red).
 */
export type ProcessTally = { running: number; waiting: number; failed: number }

export type BadgeState = {
  /** `unread` = chats with news (an ask counts as news), `waiting` = chats with an ask waiting on the person. */
  chat_messages: { unread: number; waiting: number; thinking: boolean }
  git: { incoming: number; uncommitted: number }
  tests: { failing: number }
  /**
   * Background activities for the scope: `running` = live (spinner), `paused` =
   * a `running` run that isn't live in the server process (resumable; paused icon),
   * `unseen` = runs that finished since the user last opened this project's app tab.
   */
  activity: { running: number; paused: number; unseen: number }
  process: ProcessTally
  /** The expired sign-ins the scope's live agent work uses, by name — something broke: red. */
  signIn: { expired: readonly string[] }
}
