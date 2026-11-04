import { VIDEO_REASON_NO_FFMPEG, VIDEO_REASON_TIMED_OUT } from 'thefactory-tools/constants'
import { describe, expect, it } from 'vitest'
import { videoAttachmentView, videoCostLabel } from './videoAttachment'
import type { ChatVideoDigest } from './videoAttachmentTypes'

const TOKENS = { overviewTokens: 6200, closerLookTokens: 1600 }

describe('videoAttachmentView', () => {
  it('reads as the first stage until the first answer comes', () => {
    expect(videoAttachmentView(undefined)).toMatchObject({
      state: 'preparing',
      line: 'Checking',
      canSetUp: false,
    })
  })

  it.each<[ChatVideoDigest, string]>([
    [{ stage: 'probing' }, 'Checking'],
    [{ stage: 'picking-frames', percent: 42 }, 'Picking frames 42%'],
    [{ stage: 'making-sheets', percent: 60.4 }, 'Making sheets 60%'],
    [{ stage: 'transcribing', percent: 0 }, 'Transcribing 0%'],
  ])('gives the stage and percent in one line: %j', (digest, line) => {
    expect(videoAttachmentView(digest).line).toBe(line)
  })

  it('marks the steps gone by, the one under way and those to come', () => {
    const { steps } = videoAttachmentView({ stage: 'making-sheets', percent: 10 })
    expect(steps).toEqual([
      { label: 'Uploaded', state: 'done' },
      { label: 'Checking', state: 'done' },
      { label: 'Picking frames', state: 'done' },
      { label: 'Making sheets 10%', state: 'active' },
      { label: 'Transcribing', state: 'todo' },
    ])
  })

  it('shows the figure as rough until the video is read', () => {
    const preparing = videoAttachmentView({ stage: 'picking-frames', tokens: TOKENS })
    expect(preparing.cost).toMatchObject({ rough: true })
    const ready = videoAttachmentView({ stage: 'ready', tokens: TOKENS })
    expect(ready.cost).toEqual({
      read: '≈ 6.2k tokens to read',
      closer: '≈ 1.6k per closer look',
      full: '≈ 6.2k tokens to read · ≈ 1.6k per closer look',
      rough: false,
    })
  })

  it('shows no cost before the backend has a figure', () => {
    expect(videoAttachmentView({ stage: 'probing' })).not.toHaveProperty('cost')
  })

  it('has no steps and no line once ready', () => {
    const view = videoAttachmentView({ stage: 'ready', tokens: TOKENS, transcript: 'done' })
    expect(view).toMatchObject({ state: 'ready', steps: [], canSetUp: false })
    expect(view).not.toHaveProperty('line')
    expect(view).not.toHaveProperty('transcript')
  })

  it.each([
    ['no-audio', 'No audio', false, false],
    ['no-speech', 'No speech heard', false, false],
    ['not-set-up', 'No transcript', true, true],
    ['failed', 'Transcript failed', true, false],
  ] as const)('says why there is no transcript: %s', (transcript, short, warn, canSetUp) => {
    const view = videoAttachmentView({ stage: 'ready', tokens: TOKENS, transcript })
    expect(view.transcript).toMatchObject({ short, warn })
    expect(view.transcript?.long).toContain('No transcript')
    expect(view.canSetUp).toBe(canSetUp)
  })

  it('links to setup only for a failure setup can fix', () => {
    expect(videoAttachmentView({ stage: 'failed', reason: VIDEO_REASON_NO_FFMPEG })).toMatchObject({
      state: 'failed',
      line: VIDEO_REASON_NO_FFMPEG,
      canSetUp: true,
    })
    expect(videoAttachmentView({ stage: 'failed', reason: VIDEO_REASON_TIMED_OUT })).toMatchObject({
      state: 'failed',
      line: VIDEO_REASON_TIMED_OUT,
      canSetUp: false,
    })
  })

  it('carries the poster at any stage it is known', () => {
    expect(videoAttachmentView({ stage: 'transcribing', poster: 'p.jpg' }).poster).toBe('p.jpg')
    expect(videoAttachmentView({ stage: 'ready', poster: 'p.jpg' }).poster).toBe('p.jpg')
  })

  it('states the length and size when known, and nothing otherwise', () => {
    const view = videoAttachmentView({
      stage: 'ready',
      durationSec: 252,
      sizeBytes: 186 * 1024 * 1024,
    })
    expect(view).toMatchObject({ length: '04:12', size: '186 MB', facts: '04:12 · 186 MB' })
    const bare = videoAttachmentView({ stage: 'ready' })
    expect(bare).not.toHaveProperty('length')
    expect(bare).not.toHaveProperty('facts')
  })
})

describe('videoCostLabel', () => {
  const cost = {
    read: '≈ 6.2k tokens to read',
    closer: '≈ 1.6k per closer look',
    full: '≈ 6.2k tokens to read · ≈ 1.6k per closer look',
    rough: false,
  }

  it('gives the whole notice, or the reading cost where room is short', () => {
    expect(videoCostLabel(cost)).toBe(cost.full)
    expect(videoCostLabel(cost, true)).toBe(cost.read)
  })

  it('says when the figure is rough', () => {
    expect(videoCostLabel({ ...cost, rough: true }, true)).toBe('Rough: ≈ 6.2k tokens to read')
  })
})
