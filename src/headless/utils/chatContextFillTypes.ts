/** How full a chat's window reads. */
export type ChatContextFillLevel = 'roomy' | 'filling' | 'nearly-full'

/** The context chip's face and details, the same on every client and every model. */
export type ChatContextFillChipView = {
  /** The chip's words: `42%`, `~42%`, or the plain word when the window is unknown. */
  label: string
  /** The share of the window a meter fills, from 0 to 100. Absent when the window is unknown. */
  percent?: number
  level: ChatContextFillLevel
  /** `84k of 200k tokens`. */
  tokens: string
  /** Why the share is not exact, when it is not. */
  note?: string
}

/** What a finished Compact now says, and how it reads. */
export type ChatCompactLineView = { text: string; tone: 'done' | 'neutral' | 'failed' }

/** A chat's Compact now, as the chip's details show it. */
export type ChatCompactView = {
  running: boolean
  /** What the last one said, until the next one starts. */
  line?: ChatCompactLineView
  run: () => void
  stop: () => void
}

/** The context chip with what its details act on, for a chat that can be compacted. */
export type ChatContextFillView = ChatContextFillChipView & { compact?: ChatCompactView }

/** A chat message as its boundary line is placed against it. */
export type ChatBoundaryMessage = {
  id?: string
  role: string
  content?: unknown
  startedAt?: string
  openChangesCard?: unknown
}

/** Where a row of a chat's list sits against a line drawn above a message. */
export type ChatRowLineInput = {
  /** The message the line is drawn above. */
  line: number | null | undefined
  rowStart: number
  /** Past the last message a folded row holds. */
  rowEnd?: number
  /** The first message of the window on screen. */
  windowStart: number
}
