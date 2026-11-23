import type {
  VideoCloseUp,
  VideoMarkedMoment,
  VideoTimeline,
  VideoTimelineAction,
  VideoTimelineSound,
  VideoTimelineSpeech,
  VideoTimelineStill,
} from 'thefactory-tools/types'

/** A close-up of a still, with where to show it from. */
export type ChatVideoCloseUp = VideoCloseUp & {
  /** Relative to the server, needing no bearer; runs out at the timeline's `expiresAt`. */
  url: string
}

/** A still of a chat video's timeline, its picture and its close-ups' by signed URL. */
export type ChatVideoTimelineStill = Omit<VideoTimelineStill, 'closeUps'> & {
  url: string
  closeUps: ChatVideoCloseUp[]
}

export type ChatVideoTimelineEntry =
  | ChatVideoTimelineStill
  | VideoTimelineSpeech
  | VideoTimelineAction
  | VideoTimelineSound

/** A chat video's timeline, as `GET /chat-attachments/timeline` answers. */
export type ChatVideoTimeline = Omit<VideoTimeline, 'entries'> & {
  entries: ChatVideoTimelineEntry[]
  /** When the first picture URL stops working: the timeline is read again then. */
  expiresAt?: string
}

/** What stands left of a timeline row's text. */
export type VideoTimelineGlyph =
  | { kind: 'still'; url: string }
  | { kind: 'action' }
  | { kind: 'speech' }
  | { kind: 'sound' }

export type VideoTimelineCloseUpRow = {
  key: string
  url: string
  /** "Close-up, top right: Total 41.40". */
  text: string
  /** The time of the still it was cut from. */
  timeSec: number
  /** "00:13". */
  time: string
  /** "Bottom of the screen". */
  place: string
  /** The text read on it, joined; empty for none. */
  words: string
  /** Its real size in pixels. */
  width: number
  height: number
}

/** Where a mark on a timeline was made: sent with a message, or waiting in the composer. */
export type VideoTimelineMarkSource = 'sent' | 'composer'

/** A mark as a timeline shows it, under the row it falls in. */
export type VideoTimelineMarkLine = {
  key: string
  timeSec: number
  /** "00:13". */
  time: string
  /** The note, or that there is none. */
  note: string
  hasNote: boolean
  source: VideoTimelineMarkSource
  /** "Sent", "In your message". */
  tag: string
}

/** A mark of one video, as the timeline takes it. */
export type VideoTimelineMarkInput = Pick<VideoMarkedMoment, 'timeSec' | 'note'>

/** One video's marks: those its chat's messages sent, and those waiting in the composer. */
export type VideoTimelineMarks = {
  sent: readonly VideoTimelineMarkInput[]
  composer: readonly VideoTimelineMarkInput[]
}

/** One moment as a timeline row shows it. */
export type VideoTimelineRow = {
  key: string
  timeSec: number
  /** "00:13". */
  time: string
  glyph: VideoTimelineGlyph
  text: string
  /** An action that did not go through. */
  failed: boolean
  closeUps: VideoTimelineCloseUpRow[]
  /** The person's marks from this row's time until the next row's. */
  marks: VideoTimelineMarkLine[]
}

/** A video's timeline as the fold, or the screen, draws it. */
export type VideoTimelineView =
  | { state: 'loading' }
  | { state: 'preparing'; line: string }
  | { state: 'failed'; line: string }
  | { state: 'empty'; line: string }
  | {
      state: 'rows'
      /** "9 moments". */
      count: string
      rows: VideoTimelineRow[]
      /** What is on most stills, said once: "On every screen: 09:41 · Wi-Fi". */
      onEveryScreen?: string
    }
