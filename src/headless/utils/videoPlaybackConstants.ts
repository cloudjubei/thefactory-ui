import type { VideoFailure } from './videoPlaybackTypes'

/** The widest a playing video's card grows. */
export const VIDEO_PLAYER_MAX_WIDTH = 420

/** The tallest it grows, so a portrait video never fills the chat. */
export const VIDEO_PLAYER_MAX_HEIGHT = 360

/** What a browser's `MediaError` says for a file it cannot decode or open. */
export const VIDEO_FORMAT_ERROR_CODES: readonly number[] = [3, 4]

/** What a device's player says of a file it cannot open. */
export const NATIVE_VIDEO_FORMAT_ERROR = /format|codec|decod|not supported|unsupported|cannot open/i

/** A URL this close to its end is not handed to a player, which needs it for a while yet. */
export const VIDEO_SOURCE_MARGIN_MS = 30_000

export const VIDEO_PLAYBACK_TEXT = {
  play: (name: string) => `Play ${name}`,
  fullScreen: (name: string) => `${name} full screen`,
  collapse: (name: string) => `Stop and close ${name}`,
  failure: {
    format: 'This format does not play here.',
    load: 'The video did not load. Try again.',
  } satisfies Record<VideoFailure, string>,
} as const
