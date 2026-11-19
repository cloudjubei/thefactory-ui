/** A moment the person marked on a chat's video, waiting in the composer to go with the message. */
export type ChatVideoMarkDraft = {
  /** The video's path, as its upload returned it. */
  video: string
  timeSec: number
  /** What the person wrote for the agent; empty for none. */
  note: string
  /** Why the last send was refused over this mark. Gone once the mark is changed or sent again. */
  refusal?: string
}

/** A mark as the flag on a player makes it. */
export type VideoMarkInput = {
  video: string
  timeSec: number
  note?: string
}

/** The composer's marks, for the cards that show and add them. */
export type ChatVideoMarks = {
  items: ChatVideoMarkDraft[]
  /** A mark at a time already marked on that video takes its place. */
  add: (mark: VideoMarkInput) => void
  setNote: (key: string, note: string) => void
  remove: (key: string) => void
}

/** A mark waiting in the composer, as its row under the video shows it. */
export type ComposerVideoMarkRow = {
  key: string
  timeSec: number
  /** "00:13". */
  time: string
  note: string
  /** The still at or before it, once the timeline is read. */
  stillUrl?: string
  refusal?: string
}

/** A mark on a sent message, as its row under the video shows it. */
export type SentVideoMarkRow = {
  key: string
  timeSec: number
  time: string
  /** The note, or that there is none. */
  note: string
  hasNote: boolean
  stillUrl?: string
}
