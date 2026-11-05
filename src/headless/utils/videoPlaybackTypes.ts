/** A video's size as shown, rotation applied. */
export type VideoFrame = {
  width: number
  height: number
}

/** A URL a player can read a video from, needing no bearer, until it runs out. */
export type VideoSource = {
  url: string
  expiresAt: string
}

/** Where a card gets the URL to play: its time is checked when it is asked for. */
export type ChatVideoSource = {
  video: () => Promise<VideoSource | null>
}

/** `format`: nothing here can play it. `load`: it could, but did not arrive. */
export type VideoFailure = 'format' | 'load'

export type VideoPlaybackStage = 'poster' | 'opening' | 'playing' | 'unplayable'

export type VideoPlaybackState = {
  stage: VideoPlaybackStage
  source?: VideoSource
  /** The size the player read, which outranks the digest's. */
  frame?: VideoFrame
  failure?: VideoFailure
  /** Full screen was asked for and the player has yet to take it up. */
  fullscreenPending: boolean
  /** Where to carry on from, after a URL ran out mid-way. */
  startAtSec?: number
}

export type VideoPlaybackAction =
  | { type: 'open'; fullscreen: boolean }
  | { type: 'source'; source: VideoSource }
  | { type: 'metadata'; frame: VideoFrame }
  | { type: 'failed'; failure: VideoFailure }
  | { type: 'resume'; source: VideoSource; atSec: number }
  | { type: 'fullscreen-taken' }
  | { type: 'collapse' }
