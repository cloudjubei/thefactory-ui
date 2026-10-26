/**
 * ROOT process runs for a scope: `running` = pending, running or merging, or
 * stopped with its agent manager on it (the moving droplets), `waiting` =
 * waiting on the user — at the sign-off gate or any other stop that is theirs,
 * approved work not brought in yet, or an ask in the run's own chat — `failed`
 * = approved work whose merge failed (something broke: red), and `unread` =
 * runs whose own chat holds a reply the user has not read, nothing waiting.
 */
export type ProcessTally = { running: number; waiting: number; failed: number; unread: number }

export type BadgeState = {
  /** `unread` = chats with news (an ask counts as news), `waiting` = chats with an ask waiting on the person. */
  chat_messages: { unread: number; waiting: number; thinking: boolean }
  git: { incoming: number; uncommitted: number }
  tests: { failing: number }
  /**
   * Background activities for the scope: `running` = live (spinner), `paused` =
   * a `running` run that isn't live in the server process (resumable; paused icon),
   * `unseen` = runs that finished since the user last opened this project's app tab,
   * `unread` = what the project's app holds unread — work it started that came
   * into the project, until the person opens what it made.
   */
  activity: { running: number; paused: number; unseen: number; unread: number }
  process: ProcessTally
  /** The expired sign-ins the scope's live agent work uses, by name — something broke: red. */
  signIn: { expired: readonly string[] }
}
