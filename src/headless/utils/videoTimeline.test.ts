import { describe, expect, it } from 'vitest'
import {
  videoTimelineOnServer,
  videoTimelineRefreshInMs,
  videoTimelineRowAt,
  videoTimelineStillUrl,
  videoTimelineView,
} from './videoTimeline'
import type {
  ChatVideoTimeline,
  ChatVideoTimelineEntry,
  ChatVideoTimelineStill,
  VideoTimelineRow,
} from './videoTimelineTypes'

const still = (timeSec: number, text: string[], extra: Partial<ChatVideoTimelineStill> = {}) =>
  ({
    kind: 'still',
    timeSec,
    file: `stills/t-${timeSec}.jpg`,
    url: `/media/t-${timeSec}.jpg`,
    text,
    closeUps: [],
    ...extra,
  }) satisfies ChatVideoTimelineStill

const done = (entries: ChatVideoTimelineEntry[], extra: Partial<ChatVideoTimeline> = {}) =>
  ({ state: 'done', durationSec: 16, onEveryScreen: [], entries, ...extra }) as ChatVideoTimeline

const rowsOf = (timeline: ChatVideoTimeline): VideoTimelineRow[] => {
  const view = videoTimelineView(timeline)
  if (view.state !== 'rows') throw new Error(`no rows: ${view.state}`)
  return view.rows
}

describe('videoTimelineView', () => {
  it('is loading until the first answer', () => {
    expect(videoTimelineView(undefined)).toEqual({ state: 'loading' })
  })

  it('says how the digest is getting on while it is made', () => {
    const timeline = {
      state: 'in-progress',
      stage: 'picking-frames',
      percent: 42.4,
      onEveryScreen: [],
      entries: [],
    } as ChatVideoTimeline
    expect(videoTimelineView(timeline)).toEqual({ state: 'preparing', line: 'Picking frames 42%' })
  })

  it('reads as checking when the stage is not said yet', () => {
    const timeline = { state: 'in-progress', onEveryScreen: [], entries: [] } as ChatVideoTimeline
    expect(videoTimelineView(timeline)).toEqual({ state: 'preparing', line: 'Checking' })
  })

  it('says when none is begun', () => {
    const timeline = { state: 'not-started', onEveryScreen: [], entries: [] } as ChatVideoTimeline
    expect(videoTimelineView(timeline)).toEqual({ state: 'preparing', line: 'Not read yet' })
  })

  it('gives a failure its reason', () => {
    const timeline = {
      state: 'failed',
      reason: 'Reading this video took too long.',
      onEveryScreen: [],
      entries: [],
    } as ChatVideoTimeline
    expect(videoTimelineView(timeline)).toEqual({
      state: 'failed',
      line: 'Reading this video took too long.',
    })
  })

  it('still says it failed when no reason came', () => {
    const timeline = { state: 'failed', onEveryScreen: [], entries: [] } as ChatVideoTimeline
    expect(videoTimelineView(timeline)).toEqual({
      state: 'failed',
      line: 'The timeline could not be made.',
    })
  })

  it('says so when a finished timeline holds nothing', () => {
    expect(videoTimelineView(done([]))).toEqual({
      state: 'empty',
      line: 'Nothing on the timeline yet',
    })
  })

  it('counts the moments', () => {
    const one = videoTimelineView(done([still(0, ['Cart'])]))
    const two = videoTimelineView(done([still(0, ['Cart']), still(4, ['Shipping'])]))
    expect(one).toMatchObject({ count: '1 moment' })
    expect(two).toMatchObject({ count: '2 moments' })
  })

  it('shows a still by its picture and its text lines joined', () => {
    const [row] = rowsOf(done([still(9, ['Payment', 'Card ending 4242'])]))
    expect(row).toEqual({
      key: 'still-0-9',
      timeSec: 9,
      time: '00:09',
      glyph: { kind: 'still', url: '/media/t-9.jpg' },
      text: 'Payment · Card ending 4242',
      closeUps: [],
    })
  })

  it('says a still shows no text', () => {
    expect(rowsOf(done([still(0, [])]))[0]?.text).toBe('No text on screen')
  })

  it('gives each close-up a line of its own, with its place and text', () => {
    const closeUps = [
      {
        file: 'stills/t-13-c1.jpg',
        url: '/media/t-13-c1.jpg',
        place: 'bottom' as const,
        box: { x: 0, y: 300, width: 640, height: 60 },
        text: ['Card declined.', 'Try another card.'],
      },
      {
        file: 'stills/t-13-c2.jpg',
        url: '/media/t-13-c2.jpg',
        place: 'top right' as const,
        box: { x: 500, y: 0, width: 140, height: 40 },
      },
    ]
    const [row] = rowsOf(done([still(13, ['Payment'], { closeUps })]))
    expect(row?.closeUps).toEqual([
      {
        key: 'stills/t-13-c1.jpg',
        url: '/media/t-13-c1.jpg',
        text: 'Close-up, bottom: Card declined. · Try another card.',
      },
      { key: 'stills/t-13-c2.jpg', url: '/media/t-13-c2.jpg', text: 'Close-up, top right' },
    ])
  })

  it('quotes what was said', () => {
    const [row] = rowsOf(
      done([{ kind: 'speech', timeSec: 6, endSec: 8, text: 'Now I pick express shipping.' }]),
    )
    expect(row).toMatchObject({ glyph: { kind: 'speech' }, text: '"Now I pick express shipping."' })
  })

  it.each([
    [{ sound: 'silence', timeSec: 2, endSec: 7 }, 'Silence until 00:07'],
    [{ sound: 'sudden', timeSec: 11, endSec: 11.4 }, 'Sudden sound'],
    [{ sound: 'music', timeSec: 3, endSec: 17 }, 'Music until 00:17'],
  ] as const)('says a sound, and how long it lasts: %j', (sound, text) => {
    const [row] = rowsOf(done([{ kind: 'sound', ...sound }]))
    expect(row).toMatchObject({ glyph: { kind: 'sound' }, text })
  })

  it('keeps the timeline’s order and gives moments at one time keys of their own', () => {
    const rows = rowsOf(
      done([{ kind: 'speech', timeSec: 3, endSec: 4, text: 'Checkout.' }, still(3, ['Shipping'])]),
    )
    expect(rows.map((row) => row.key)).toEqual(['speech-0-3', 'still-1-3'])
  })

  it('says once what is on every screen', () => {
    const view = videoTimelineView(
      done([still(0, ['Cart'])], { onEveryScreen: ['09:41', 'Wi-Fi'] }),
    )
    expect(view).toMatchObject({ onEveryScreen: 'On every screen: 09:41 · Wi-Fi' })
  })

  it('leaves that out when nothing is', () => {
    expect(videoTimelineView(done([still(0, ['Cart'])]))).not.toHaveProperty('onEveryScreen')
  })
})

describe('videoTimelineRowAt', () => {
  const rows = rowsOf(done([still(0, ['a']), still(4, ['b']), still(9, ['c'])]))

  it('is the last moment at or before the playhead', () => {
    expect(videoTimelineRowAt(rows, 5)).toBe(1)
    expect(videoTimelineRowAt(rows, 9)).toBe(2)
    expect(videoTimelineRowAt(rows, 30)).toBe(2)
  })

  it('takes a moment a hair ahead of the playhead as reached', () => {
    expect(videoTimelineRowAt(rows, 3.97)).toBe(1)
  })

  it('is none before the first moment', () => {
    const later = rowsOf(done([still(2, ['a'])]))
    expect(videoTimelineRowAt(later, 1)).toBe(-1)
    expect(videoTimelineRowAt([], 1)).toBe(-1)
  })
})

describe('videoTimelineRefreshInMs', () => {
  const now = Date.parse('2026-11-19T10:00:00.000Z')

  it('reads again shortly before the pictures run out', () => {
    expect(videoTimelineRefreshInMs('2026-11-19T10:15:00.000Z', now)).toBe(15 * 60_000 - 30_000)
  })

  it('reads again at once when they are nearly out', () => {
    expect(videoTimelineRefreshInMs('2026-11-19T10:00:10.000Z', now)).toBe(0)
  })

  it('has nothing to wait for without a time, or with one it cannot read', () => {
    expect(videoTimelineRefreshInMs(undefined, now)).toBeUndefined()
    expect(videoTimelineRefreshInMs('soon', now)).toBeUndefined()
  })
})

describe('videoTimelineStillUrl', () => {
  const timeline = done([still(0, ['a']), still(9, ['c'])])

  it('finds a still’s picture by its file', () => {
    expect(videoTimelineStillUrl(timeline, 'stills/t-9.jpg')).toBe('/media/t-9.jpg')
  })

  it('has none for a file it does not hold, or before it is read', () => {
    expect(videoTimelineStillUrl(timeline, 'stills/t-4.jpg')).toBeUndefined()
    expect(videoTimelineStillUrl(undefined, 'stills/t-9.jpg')).toBeUndefined()
  })
})

describe('videoTimelineOnServer', () => {
  const closeUp = {
    file: 'stills/t-9-c1.jpg',
    url: '/media/t-9-c1.jpg',
    place: 'top right' as const,
    box: { x: 0, y: 0, width: 10, height: 10 },
  }
  const timeline = done([
    still(9, ['c'], { closeUps: [closeUp] }),
    { kind: 'speech', timeSec: 10, endSec: 11, text: 'Hi' },
  ])

  it('puts every picture on the server the client talks to', () => {
    const shown = videoTimelineOnServer(timeline, 'http://127.0.0.1:7001/')
    expect(shown.entries[0]).toMatchObject({
      url: 'http://127.0.0.1:7001/media/t-9.jpg',
      closeUps: [{ url: 'http://127.0.0.1:7001/media/t-9-c1.jpg' }],
    })
    expect(shown.entries[1]).toEqual(timeline.entries[1])
  })

  it('leaves a full URL, and every URL when no server is known', () => {
    const full = done([still(1, [], { url: 'https://cdn/a.jpg' })])
    expect(videoTimelineOnServer(full, 'http://h')).toEqual(full)
    expect(videoTimelineOnServer(timeline, null)).toEqual(timeline)
  })
})
