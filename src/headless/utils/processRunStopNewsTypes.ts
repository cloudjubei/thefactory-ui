import type { ChatNotifyLevel } from './chatNotifyTypes'

/** A run that came to need the person: the run to open, in its home project. */
export type ProcessRunStopNews = { runId: string; projectId: string; title: string }

/** What each run needed the person for when last looked at (`processRunStopKey`), by run id. */
export type ProcessRunStopMarks = ReadonlyMap<string, string>

/** The runs that came to need the person since the marks, and the marks to look against next. */
export type ProcessRunStopCheck = { arrived: ProcessRunStopNews[]; marks: ProcessRunStopMarks }

/** What telling a run's stop reads of its own chat: the asks waiting there, and its notification level. */
export type ProcessRunStopRead<T> = {
  asksOf: (run: T) => number
  levelOf: (run: T) => ChatNotifyLevel
}

/** The OS notification of a run's stop, with the run it points at. */
export type ProcessRunStopNotification = { title: string; tag: string; run: ProcessRunStopNews }
