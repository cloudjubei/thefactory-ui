import {
  NATIVE_VIDEO_FORMAT_ERROR,
  VIDEO_FORMAT_ERROR_CODES,
  VIDEO_PLAYER_MAX_HEIGHT,
  VIDEO_PLAYER_MAX_WIDTH,
} from './videoPlaybackConstants'
import type {
  VideoFailure,
  VideoFrame,
  VideoPlaybackAction,
  VideoPlaybackState,
  VideoSource,
} from './videoPlaybackTypes'

export const INITIAL_VIDEO_PLAYBACK: VideoPlaybackState = {
  stage: 'poster',
  fullscreenPending: false,
}

const backToPoster = ({ frame }: VideoPlaybackState): VideoPlaybackState => ({
  ...INITIAL_VIDEO_PLAYBACK,
  ...(frame ? { frame } : {}),
})

const unplayable = (state: VideoPlaybackState, failure: VideoFailure): VideoPlaybackState => ({
  ...backToPoster(state),
  stage: 'unplayable',
  failure,
})

/** Where a video's card stands, from the poster through playing and back. */
export function videoPlaybackReducer(
  state: VideoPlaybackState,
  action: VideoPlaybackAction,
): VideoPlaybackState {
  switch (action.type) {
    case 'open':
      if (state.failure === 'format') return state
      return { ...backToPoster(state), stage: 'opening', fullscreenPending: action.fullscreen }
    case 'source':
      if (state.stage !== 'opening') return state
      return { ...state, stage: 'playing', source: action.source }
    case 'metadata':
      if (state.stage !== 'playing') return state
      if (!action.frame.width || !action.frame.height) return unplayable(state, 'format')
      return { ...state, frame: action.frame }
    case 'failed':
      if (state.stage !== 'playing' && state.stage !== 'opening') return state
      return unplayable(state, action.failure)
    case 'resume':
      if (state.stage !== 'playing') return state
      return { ...state, source: action.source, startAtSec: action.atSec }
    case 'fullscreen-taken':
      return { ...state, fullscreenPending: false }
    case 'collapse':
      return backToPoster(state)
  }
}

/** Whether a URL has run out, so a player's failure on it says nothing about the video. */
export function isVideoSourceSpent({ expiresAt }: VideoSource, now: number): boolean {
  const end = Date.parse(expiresAt)
  return Number.isNaN(end) || now >= end
}

/** What a `<video>`'s `MediaError` code means for the person. */
export function videoFailureKind(code: number | undefined): VideoFailure {
  return code !== undefined && VIDEO_FORMAT_ERROR_CODES.includes(code) ? 'format' : 'load'
}

/** What a device player's error means for the person: it gives words, not a code. */
export function nativeVideoFailureKind(message: string): VideoFailure {
  return NATIVE_VIDEO_FORMAT_ERROR.test(message) ? 'format' : 'load'
}

/** The size a playing video takes on a device, keeping its shape in the room there is. */
export function videoPlayerSize({ width, height }: VideoFrame, room: number): VideoFrame {
  const ratio = width / height
  const fitted = Math.min(room, VIDEO_PLAYER_MAX_WIDTH, VIDEO_PLAYER_MAX_HEIGHT * ratio)
  return { width: Math.round(fitted), height: Math.round(fitted / ratio) }
}

/** The same in CSS: the card's `max-width` holds it to the room, which only the browser knows. */
export function videoPlayerWidthCss({ width, height }: VideoFrame): string {
  const ratio = Number((width / height).toFixed(4))
  return `min(${VIDEO_PLAYER_MAX_WIDTH}px, calc(min(60vh, ${VIDEO_PLAYER_MAX_HEIGHT}px) * ${ratio}))`
}
