import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  INITIAL_VIDEO_PLAYBACK,
  isVideoSourceSpent,
  videoPlaybackReducer,
} from '../utils/videoPlayback'
import { takeVideoTurn } from '../utils/videoPlaybackTurn'
import type {
  ChatVideoSource,
  VideoFailure,
  VideoFrame,
  VideoPlaybackState,
} from '../utils/videoPlaybackTypes'

export type UseVideoPlayback = {
  state: VideoPlaybackState
  /** The size to draw: what the player read, else what the digest did. */
  frame: VideoFrame | undefined
  /** The card is open: a video plays, or is about to. */
  isOpen: boolean
  /** A press can start it. False once a format is known not to play. */
  canPlay: boolean
  play: (options?: { fullscreen?: boolean }) => void
  collapse: () => void
  onMetadata: (frame: VideoFrame) => void
  /**
   * The player started. Any other open card closes rather than pauses: a browser keeps a
   * connection for each open video, and allows only six to a server.
   */
  onPlaying: () => void
  /** A player stopped on an error at `atSec`. A URL that ran out is replaced, and it carries on. */
  onFailed: (failure: VideoFailure, atSec: number) => void
  onFullscreenTaken: () => void
}

/** A video's card, from the poster through playing and back. */
export function useVideoPlayback(
  source: ChatVideoSource | undefined,
  digestFrame: VideoFrame | undefined,
): UseVideoPlayback {
  const [state, dispatch] = useReducer(videoPlaybackReducer, INITIAL_VIDEO_PLAYBACK)
  const current = state.source

  const play = useCallback(
    ({ fullscreen = false }: { fullscreen?: boolean } = {}) => {
      if (!source) return
      dispatch({ type: 'open', fullscreen })
      void source.video().then((next) => {
        dispatch(next ? { type: 'source', source: next } : { type: 'failed', failure: 'load' })
      })
    },
    [source],
  )

  const onFailed = useCallback(
    (failure: VideoFailure, atSec: number) => {
      if (!source || !current || !isVideoSourceSpent(current, Date.now())) {
        dispatch({ type: 'failed', failure })
        return
      }
      void source.video().then((next) => {
        dispatch(
          next ? { type: 'resume', source: next, atSec } : { type: 'failed', failure: 'load' },
        )
      })
    },
    [source, current],
  )

  const collapse = useCallback(() => dispatch({ type: 'collapse' }), [])
  const releaseTurn = useRef<(() => void) | null>(null)
  const onPlaying = useCallback(() => {
    releaseTurn.current = takeVideoTurn(collapse)
  }, [collapse])
  useEffect(() => () => releaseTurn.current?.(), [])
  const onMetadata = useCallback((frame: VideoFrame) => dispatch({ type: 'metadata', frame }), [])
  const onFullscreenTaken = useCallback(() => dispatch({ type: 'fullscreen-taken' }), [])

  return {
    state,
    frame: state.frame ?? digestFrame,
    isOpen: state.stage === 'opening' || state.stage === 'playing',
    canPlay: !!source && state.failure !== 'format',
    play,
    collapse,
    onMetadata,
    onPlaying,
    onFailed,
    onFullscreenTaken,
  }
}
