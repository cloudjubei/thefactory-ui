import type { VideoMarkedMoment } from 'thefactory-tools/types'
import type {
  ChatVideoMarkDraft,
  ChatVideoTimeline,
  ChatVideoTimelineEntry,
  ChatVideoTimelineStill,
} from 'thefactory-ui/headless'

/** The checkout bug the video showcase plays: the same path, name and length as its other states. */
export const TIMELINE_VIDEO = '.factory/attachments/3f2a9c1d0b7e4a51/8c1d2e3f4a5b-checkout-bug.mov'
export const TIMELINE_VIDEO_NAME = 'checkout-bug.mov'
/** Played for the 16 s checkout: the four screens its stills show, a clock in the corner. */
export const CHECKOUT_VIDEO_URL = new URL('./assets/timeline-checkout.webm', import.meta.url).href
/** Played for the two-minute timeline: one settings step every 12 s, a clock in the corner. */
export const LONG_VIDEO_URL = new URL('./assets/timeline-long.webm', import.meta.url).href
/** A second video sent earlier in the chat, marked from the next message. */
export const EARLIER_VIDEO =
  '.factory/attachments/3f2a9c1d0b7e4a51/1a2b3c4d5e6f-settings-walkthrough.mp4'

const svg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">${body}</svg>`)}`

const screen = (banner: string, total: string, alert = false) =>
  svg(
    `<rect width="160" height="90" fill="#eef2f7"/><rect x="18" y="6" width="124" height="78" rx="4" fill="#ffffff"/><rect x="26" y="14" width="44" height="6" rx="2" fill="#1f2937" opacity=".75"/><text x="134" y="20" font-size="7" text-anchor="end" fill="#111827" font-family="sans-serif">${total}</text><rect x="26" y="28" width="90" height="4" rx="2" fill="#d1d5db"/><rect x="26" y="37" width="70" height="4" rx="2" fill="#d1d5db"/><rect x="26" y="62" width="108" height="14" rx="3" fill="${alert ? '#fde8eb' : '#e6f4ea'}" stroke="${alert ? '#e4445a' : '#00a862'}"/><text x="30" y="72" font-size="6" fill="${alert ? '#c22f45' : '#00884f'}" font-family="sans-serif">${banner}</text>`,
  )

const crop = (text: string, alert = false) =>
  svg(
    `<rect width="160" height="90" fill="${alert ? '#fde8eb' : '#ffffff'}"/><text x="80" y="54" font-size="22" text-anchor="middle" fill="${alert ? '#c22f45' : '#111827'}" font-family="sans-serif">${text}</text>`,
  )

const STILL_ART: Record<number, string> = {
  0: screen('2 items', 'Total 38.40'),
  4: screen('Standard, Express', 'Total 38.40'),
  9: screen('Card ending 4242', 'Total 41.40'),
  13: screen('Card declined. Try another card.', 'Total 41.40', true),
}

const still = (
  timeSec: number,
  text: string[],
  closeUps: ChatVideoTimelineStill['closeUps'] = [],
): ChatVideoTimelineStill => ({
  kind: 'still',
  timeSec,
  file: `stills/t-00m${String(timeSec).padStart(2, '0')}.0s.jpg`,
  url: STILL_ART[timeSec] ?? screen('', ''),
  text,
  closeUps,
})

const TOTAL_CLOSE_UP = {
  file: 'stills/t-00m09.0s-c1.jpg',
  url: crop('Total 41.40'),
  place: 'top right' as const,
  box: { x: 560, y: 0, width: 160, height: 60 },
  text: ['Total 41.40'],
}

const DECLINED_CLOSE_UP = {
  file: 'stills/t-00m13.0s-c1.jpg',
  url: crop('Card declined', true),
  place: 'bottom' as const,
  box: { x: 0, y: 300, width: 720, height: 60 },
  text: ['Card declined.', 'Try another card.'],
}

/** The board's nine moments: stills with their text and close-ups, actions, speech and a sound. */
const CHECKOUT_ENTRIES: ChatVideoTimelineEntry[] = [
  still(0, ['Cart', '2 items', 'Total 38.40']),
  { kind: 'action', timeSec: 3, action: 'tap', target: 'Checkout', ok: true },
  still(4, ['Shipping', 'Standard, Express']),
  { kind: 'speech', timeSec: 6, endSec: 8.4, text: 'Now I pick express shipping.' },
  still(9, ['Payment', 'Card ending 4242'], [TOTAL_CLOSE_UP]),
  { kind: 'sound', timeSec: 11, endSec: 11.3, sound: 'sudden' },
  { kind: 'action', timeSec: 12, action: 'tap', target: 'Pay now', ok: true },
  still(13, ['Payment', 'error banner'], [DECLINED_CLOSE_UP]),
  { kind: 'speech', timeSec: 15, endSec: 16, text: 'And here it fails.' },
]

const done = (entries: ChatVideoTimelineEntry[], extra: Partial<ChatVideoTimeline> = {}) =>
  ({
    state: 'done',
    durationSec: 16,
    width: 720,
    height: 405,
    language: 'en',
    onEveryScreen: [],
    entries,
    ...extra,
  }) satisfies ChatVideoTimeline

const LONG_ENTRIES: ChatVideoTimelineEntry[] = Array.from({ length: 40 }, (_, index) => {
  const timeSec = index * 3
  switch (index % 4) {
    case 0:
      return still(timeSec, [`Step ${index / 4 + 1}`, 'Settings', 'Notifications on'])
    case 1:
      return { kind: 'action', timeSec, action: 'scroll', target: `Row ${index}`, ok: true }
    case 2:
      return { kind: 'speech', timeSec, endSec: timeSec + 2, text: `Moving on to part ${index}.` }
    default:
      return { kind: 'sound', timeSec, endSec: timeSec + 2, sound: 'silence' }
  }
})

const SOUND_AND_ACTION_ENTRIES: ChatVideoTimelineEntry[] = [
  { kind: 'sound', timeSec: 0, endSec: 7, sound: 'silence' },
  { kind: 'action', timeSec: 1, action: 'open', target: 'Shop', ok: true },
  { kind: 'action', timeSec: 2.5, action: 'swipe', target: 'up', ok: true },
  { kind: 'sound', timeSec: 3, endSec: 17, sound: 'music' },
  { kind: 'action', timeSec: 5, action: 'type', target: 'Promo code', ok: true },
  { kind: 'action', timeSec: 7, action: 'key', target: 'Enter', ok: true },
  { kind: 'action', timeSec: 9, action: 'long-press', target: 'Express', ok: true },
  { kind: 'sound', timeSec: 11, endSec: 11.3, sound: 'sudden' },
  { kind: 'action', timeSec: 12, action: 'tap', target: 'Pay now', ok: false },
  { kind: 'action', timeSec: 14, action: 'back', ok: true },
]

const CLOSE_UP_ENTRIES: ChatVideoTimelineEntry[] = [
  still(9, ['Payment', 'Card ending 4242'], [TOTAL_CLOSE_UP]),
  still(
    13,
    ['Payment', 'error banner'],
    [
      DECLINED_CLOSE_UP,
      { ...TOTAL_CLOSE_UP, file: 'stills/t-00m13.0s-c2.jpg' },
      {
        file: 'stills/t-00m13.0s-c3.jpg',
        url: crop('4242'),
        place: 'middle',
        box: { x: 200, y: 160, width: 320, height: 80 },
      },
    ],
  ),
]

export const TIMELINES = {
  checkout: done(CHECKOUT_ENTRIES),
  everyScreen: done(CHECKOUT_ENTRIES, { onEveryScreen: ['09:41', 'Wi-Fi', '82%'] }),
  long: done(LONG_ENTRIES, { durationSec: 120 }),
  soundsAndActions: done(SOUND_AND_ACTION_ENTRIES),
  closeUps: done(CLOSE_UP_ENTRIES),
  empty: done([]),
  preparing: {
    state: 'in-progress',
    stage: 'picking-frames',
    percent: 42,
    durationSec: 16,
    onEveryScreen: [],
    entries: [],
  },
  notStarted: { state: 'not-started', onEveryScreen: [], entries: [] },
  failed: {
    state: 'failed',
    reason: 'Reading this video took too long.',
    durationSec: 16,
    onEveryScreen: [],
    entries: [],
  },
} satisfies Record<string, ChatVideoTimeline>

/** The video a timeline was read from: as long as the timeline says it is. */
export const videoUrlOf = (timeline: ChatVideoTimeline | undefined) =>
  timeline === TIMELINES.long ? LONG_VIDEO_URL : CHECKOUT_VIDEO_URL

/** Marks waiting in the composer: none, one, three, and one the backend refused. */
export const COMPOSER_MARKS = {
  none: [],
  one: [{ video: TIMELINE_VIDEO, timeSec: 13, note: 'card declined, but the card is fine' }],
  three: [
    { video: TIMELINE_VIDEO, timeSec: 6, note: '' },
    { video: TIMELINE_VIDEO, timeSec: 13, note: 'card declined, but the card is fine' },
    { video: TIMELINE_VIDEO, timeSec: 15.2, note: 'and it says nothing else' },
  ],
  refused: [
    { video: TIMELINE_VIDEO, timeSec: 6, note: '' },
    {
      video: TIMELINE_VIDEO,
      timeSec: 21,
      note: 'after the retry',
      refusal: 'This video is 00:16 long (16 s), so there is nothing at 21 s to mark.',
    },
  ],
} satisfies Record<string, ChatVideoMarkDraft[]>

/** A sent message's marks, each with the still the backend chose for it. */
export const SENT_MARKS: VideoMarkedMoment[] = [
  {
    video: TIMELINE_VIDEO,
    timeSec: 6,
    still: { timeSec: 4, file: 'stills/t-00m04.0s.jpg' },
  },
  {
    video: TIMELINE_VIDEO,
    timeSec: 13,
    note: 'card declined, but the card is fine',
    still: { timeSec: 13, file: 'stills/t-00m13.0s.jpg' },
  },
]
