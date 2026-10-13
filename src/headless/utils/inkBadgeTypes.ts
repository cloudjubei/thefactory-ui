import type { BadgeColorCategory, BadgeMode, BadgeMotion, BadgeStyle } from '../types/settings'

/** What part of a badge counts: a notification category, or `failed` — something broke, always red. */
export type InkChannel = BadgeColorCategory | 'failed'

/** One channel's share of what waits on the person. */
export type InkPart = { channel: InkChannel; count: number }

/** What a badge stands for, before the person's look is applied. */
export type InkBadgeState = {
  /** What waits on the person, by channel. Zero counts are left out. */
  parts: readonly InkPart[]
  /** The channel of what is running, when something is. */
  running?: InkChannel
  /** A project or group row, whose parts the person's badge mode adds up. A tab keeps its one channel. */
  rollup: boolean
}

/** How the person likes badges drawn (Settings › Visual › Badges). */
export type InkBadgeLook = { mode: BadgeMode; style: BadgeStyle; motion: BadgeMotion }

/** A badge colour and the text colour that reads on it. */
export type InkColor = { bg: string; fg: string }

/** A channel's share of a mixed badge, 0–1. */
export type InkShare = { channel: InkChannel; share: number }

/** One round blob of ink inside the pill: centre in percent of the pill, radius in px. */
export type InkBlob = { channel: InkChannel; x: number; y: number; radius: number }

/** A band of a stripe or pie fill, from and to as fractions of the whole. */
export type InkStop = { channel: InkChannel; from: number; to: number }

/** How the pill behind the number is painted. Blobs are listed bottom to top. */
export type InkFill =
  | { kind: 'solid'; channel: InkChannel }
  | { kind: 'blobs'; style: 'splatter' | 'watercolour'; base: InkChannel; blobs: InkBlob[] }
  | { kind: 'bands'; style: 'stripes' | 'pie'; stops: InkStop[] }

/** The body of a badge. */
export type InkCore =
  | { kind: 'number'; text: string; fill: InkFill; mixed: boolean }
  | { kind: 'ring'; text: string; stops: InkStop[] }
  | { kind: 'segments'; segments: { channel: InkChannel; text: string }[] }
  | { kind: 'blob'; channel: InkChannel }
  | { kind: 'none' }

/** How the droplets move. `still` = nothing is running. */
export type InkMotion = 'orbit' | 'splash' | 'float' | 'comet' | 'pulse' | 'still'

/**
 * A droplet around the badge: centre in percent of the badge, size in px, the
 * offset it travels in px, and its delay (zero or negative) in seconds.
 */
export type InkDrop = {
  channel: InkChannel
  x: number
  y: number
  size: number
  opacity: number
  dx: number
  dy: number
  delay: number
}

/** Everything a renderer needs to draw a badge — web and native draw the same layout. */
export type InkBadgeLayout = {
  core: InkCore
  /** Dots after the body, one per channel. */
  tail: InkChannel[]
  /** A spinner before the body, in the colour of what runs (the Spinner motion). */
  spinner?: InkChannel
  drops: InkDrop[]
  motion: InkMotion
  /** Seconds per cycle of the motion. */
  duration: number
  /** True when the droplet layer turns as a whole (orbit, comet). */
  rotates: boolean
}
