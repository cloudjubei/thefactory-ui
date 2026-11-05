import { describe, expect, it } from 'vitest'
import {
  INITIAL_VIDEO_PLAYBACK,
  isVideoSourceSpent,
  nativeVideoFailureKind,
  videoFailureKind,
  videoPlaybackReducer,
  videoPlayerSize,
  videoPlayerWidthCss,
} from './videoPlayback'
import {
  VIDEO_PLAYBACK_TEXT,
  VIDEO_PLAYER_MAX_HEIGHT,
  VIDEO_PLAYER_MAX_WIDTH,
} from './videoPlaybackConstants'
import type { VideoPlaybackAction, VideoPlaybackState } from './videoPlaybackTypes'

const SOURCE = { url: 'http://host/a', expiresAt: '2026-11-05T12:15:00.000Z' }
const LATER = { url: 'http://host/b', expiresAt: '2026-11-05T12:30:00.000Z' }

const after = (...actions: VideoPlaybackAction[]): VideoPlaybackState =>
  actions.reduce(videoPlaybackReducer, INITIAL_VIDEO_PLAYBACK)

const playing = (): VideoPlaybackAction[] => [
  { type: 'open', fullscreen: false },
  { type: 'source', source: SOURCE },
]

describe('videoPlaybackReducer', () => {
  it('starts on the poster', () => {
    expect(INITIAL_VIDEO_PLAYBACK.stage).toBe('poster')
  })

  it('waits for a source, then plays it', () => {
    expect(after({ type: 'open', fullscreen: false }).stage).toBe('opening')
    expect(after(...playing())).toMatchObject({ stage: 'playing', source: SOURCE })
  })

  it('remembers that full screen was asked for until it is taken up', () => {
    const asked = [
      { type: 'open', fullscreen: true },
      { type: 'source', source: SOURCE },
    ] as const
    expect(after(...asked).fullscreenPending).toBe(true)
    expect(after(...asked, { type: 'fullscreen-taken' }).fullscreenPending).toBe(false)
  })

  it('takes the size the player reads', () => {
    const frame = { width: 1080, height: 1920 }
    expect(after(...playing(), { type: 'metadata', frame }).frame).toEqual(frame)
  })

  it('calls a video with no picture unplayable, as a browser plays its sound alone', () => {
    const state = after(...playing(), { type: 'metadata', frame: { width: 0, height: 0 } })
    expect(state).toMatchObject({ stage: 'unplayable', failure: 'format' })
  })

  it('goes back to the poster on collapse, keeping the size', () => {
    const frame = { width: 1920, height: 1080 }
    const state = after(...playing(), { type: 'metadata', frame }, { type: 'collapse' })
    expect(state.stage).toBe('poster')
    expect(state.source).toBeUndefined()
    expect(state.frame).toEqual(frame)
  })

  it('drops a source that comes after the person collapsed', () => {
    const state = after(
      { type: 'open', fullscreen: false },
      { type: 'collapse' },
      { type: 'source', source: SOURCE },
    )
    expect(state.stage).toBe('poster')
    expect(state.source).toBeUndefined()
  })

  it('says why it could not play, and forgets the source', () => {
    const state = after(...playing(), { type: 'failed', failure: 'format' })
    expect(state).toMatchObject({ stage: 'unplayable', failure: 'format' })
    expect(state.source).toBeUndefined()
  })

  it('ignores a failure once the poster is back', () => {
    const state = after(...playing(), { type: 'collapse' }, { type: 'failed', failure: 'load' })
    expect(state.stage).toBe('poster')
  })

  it('says it did not load when no source could be had', () => {
    const state = after({ type: 'open', fullscreen: false }, { type: 'failed', failure: 'load' })
    expect(state).toMatchObject({ stage: 'unplayable', failure: 'load' })
  })

  it('can be tried again after failing to load', () => {
    const state = after(
      ...playing(),
      { type: 'failed', failure: 'load' },
      { type: 'open', fullscreen: false },
    )
    expect(state.stage).toBe('opening')
    expect(state.failure).toBeUndefined()
  })

  it('stays unplayable for a format no retry will fix', () => {
    const state = after(
      ...playing(),
      { type: 'failed', failure: 'format' },
      { type: 'open', fullscreen: false },
    )
    expect(state.stage).toBe('unplayable')
  })

  it('carries on from where it was on a new source', () => {
    const state = after(...playing(), { type: 'resume', source: LATER, atSec: 42 })
    expect(state).toMatchObject({ stage: 'playing', source: LATER, startAtSec: 42 })
  })

  it('does not take a new source once collapsed', () => {
    const state = after(
      ...playing(),
      { type: 'collapse' },
      { type: 'resume', source: LATER, atSec: 1 },
    )
    expect(state.stage).toBe('poster')
  })
})

describe('isVideoSourceSpent', () => {
  const at = (time: string) => new Date(time).getTime()

  it('is not before its time', () => {
    expect(isVideoSourceSpent(SOURCE, at('2026-11-05T12:14:59.000Z'))).toBe(false)
  })

  it('is from its time on', () => {
    expect(isVideoSourceSpent(SOURCE, at('2026-11-05T12:15:00.000Z'))).toBe(true)
  })

  it('counts a source with no readable time as spent', () => {
    expect(isVideoSourceSpent({ url: 'a', expiresAt: 'nonsense' }, 0)).toBe(true)
  })
})

describe('videoFailureKind', () => {
  it.each([
    [3, 'format'],
    [4, 'format'],
    [2, 'load'],
    [1, 'load'],
    [undefined, 'load'],
  ] as const)('reads media error %s as %s', (code, kind) => {
    expect(videoFailureKind(code)).toBe(kind)
  })
})

describe('nativeVideoFailureKind', () => {
  it.each([
    ['Cannot Open', 'format'],
    ['This media format is not supported.', 'format'],
    ['Decoder init failed', 'format'],
    ['unsupported codec', 'format'],
    ['The network connection was lost.', 'load'],
    ['', 'load'],
  ] as const)('reads %j as %s', (message, kind) => {
    expect(nativeVideoFailureKind(message)).toBe(kind)
  })
})

describe('videoPlayerSize', () => {
  it('lets a landscape video take the most width', () => {
    expect(videoPlayerSize({ width: 1920, height: 1080 }, 1000)).toEqual({
      width: VIDEO_PLAYER_MAX_WIDTH,
      height: Math.round((VIDEO_PLAYER_MAX_WIDTH * 1080) / 1920),
    })
  })

  it('narrows to the room there is', () => {
    expect(videoPlayerSize({ width: 1600, height: 900 }, 320)).toEqual({ width: 320, height: 180 })
  })

  it('caps a portrait video’s height, and the width follows', () => {
    expect(videoPlayerSize({ width: 1080, height: 1920 }, 1000)).toEqual({
      width: Math.round((VIDEO_PLAYER_MAX_HEIGHT * 1080) / 1920),
      height: VIDEO_PLAYER_MAX_HEIGHT,
    })
  })

  it('keeps the aspect ratio in every case: no bars', () => {
    for (const frame of [
      { width: 1920, height: 1080 },
      { width: 1080, height: 1920 },
      { width: 500, height: 500 },
      { width: 2560, height: 1080 },
    ]) {
      const { width, height } = videoPlayerSize(frame, 300)
      expect(width / height).toBeCloseTo(frame.width / frame.height, 1)
      expect(height).toBeLessThanOrEqual(VIDEO_PLAYER_MAX_HEIGHT)
      expect(width).toBeLessThanOrEqual(300)
    }
  })
})

describe('videoPlayerWidthCss', () => {
  it('holds the card to the widest it goes and the tallest', () => {
    expect(videoPlayerWidthCss({ width: 1920, height: 1080 })).toBe(
      `min(${VIDEO_PLAYER_MAX_WIDTH}px, calc(min(60vh, ${VIDEO_PLAYER_MAX_HEIGHT}px) * 1.7778))`,
    )
  })

  it('names no percentage: a message column is as wide as what it holds', () => {
    expect(videoPlayerWidthCss({ width: 1920, height: 1080 })).not.toContain('%')
  })

  it('narrows with a portrait video', () => {
    expect(videoPlayerWidthCss({ width: 1080, height: 1920 })).toContain('* 0.5625')
  })
})

describe('the words', () => {
  it('says plainly what went wrong', () => {
    expect(VIDEO_PLAYBACK_TEXT.failure.format).toMatch(/format/i)
    expect(VIDEO_PLAYBACK_TEXT.failure.load).toMatch(/load/i)
  })
})
