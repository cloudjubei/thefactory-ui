/** Where the device stands for a "Watch it live" stop. */
export type LiveCheckWatchState = 'ready' | 'problem' | 'unprepared'

/** The "Watch it live" stop of an ask-me live check, as its card shows it. */
export interface LiveCheckWatchView {
  title: string
  state: LiveCheckWatchState
  /** A short badge for the state: "Ready", "Not set up". */
  badge?: string
  /** The host's own line: ready, or the problem. */
  line: string
  /** What is walked: the change only, or the base first. */
  walk: string
  /** "Send to the developer" is offered: passes are left. */
  sendOffered: boolean
  /** Said when no pass is left to send it back. */
  noPassesLine?: string
}
