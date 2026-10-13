import { brand, purple } from '../../tokens/colors'
import { lightTheme } from '../../tokens/semantic'
import type { BadgeColor, BadgeMode, BadgeMotion, BadgeStyle } from '../types/settings'
import type { InkChannel, InkColor, InkMotion, InkPart } from './inkBadgeTypes'

/** The order channels are listed in: what broke first, then runs, chat, git, the rest. */
export const INK_CHANNEL_ORDER: readonly InkChannel[] = [
  'failed',
  'processes',
  'chat',
  'git',
  'activity',
  'tests',
  'cross-project',
  'storage',
]

/** Every badge colour the person can pick, as ink. Badges keep these in both themes. */
export const INK_BADGE_COLORS: Readonly<Record<BadgeColor, InkColor>> = {
  green: { bg: lightTheme.status.done.bg, fg: lightTheme.status.done.fg },
  blue: { bg: brand[600], fg: lightTheme.text.inverted },
  orange: { bg: lightTheme.status.working.bg, fg: lightTheme.status.working.fg },
  red: { bg: lightTheme.status.stuck.bg, fg: lightTheme.status.stuck.fg },
  purple: { bg: purple[600], fg: lightTheme.text.inverted },
}

/** Something broke: always red, whatever the person picked for the channels. */
export const INK_FAILED_COLOR: InkColor = INK_BADGE_COLORS.red

/** The number on mixed ink is white with a slight shadow, whatever the colours under it. */
export const INK_MIXED_TEXT_COLOR = lightTheme.text.inverted
export const INK_MIXED_TEXT_SHADOW = 'rgba(0,0,0,.55)'

/** The blue of the "new to read" dot. */
export const INK_FRESH_DOT_COLOR = brand[600]

/** A failed share is drawn at least this big, so red always shows. */
export const INK_FAILED_MIN_SHARE = 0.4

/** Badge sizes in px at scale 1. */
export const INK_BADGE_METRICS = {
  height: 20,
  minWidth: 20,
  padX: 6,
  fontSize: 11,
  blob: 10,
  ringPad: 2.5,
  ringInner: 15,
  ringInnerPadX: 4,
  tailDot: 7,
  tailGap: 3,
  spinner: 14,
  spinnerStroke: 2,
  gap: 4,
  marginY: 4,
  marginX: 5,
  minDrop: 2.6,
} as const

/** Where mixed ink blobs sit inside the pill, in percent, largest share first. */
export const INK_BLOB_SPOTS: readonly (readonly [number, number])[] = [
  [30, 38],
  [74, 34],
  [48, 80],
  [84, 82],
]

/** Splatter blob radius = √share × height × this. */
export const INK_SPLATTER_RADIUS = 0.85

/** Watercolour blob radius = √share × height × this. */
export const INK_WATERCOLOUR_RADIUS = 1.25

/** The droplets around a badge: x %, y %, size px, travel direction x, travel direction y. */
export const INK_DROP_SPOTS: readonly (readonly [number, number, number, number, number])[] = [
  [-8, 14, 3.6, -1, -0.7],
  [104, 0, 2.8, 1, -0.9],
  [108, 76, 3.2, 1, 0.7],
  [-10, 84, 2.6, -1, 0.8],
  [52, -22, 2.2, 0, -1],
]

/** How far a droplet travels, in px, per unit of its direction. */
export const INK_DROP_TRAVEL = 4.5

/** The comet: a head and a fading tail, each this many degrees behind the last. */
export const INK_COMET_DROPS = 4
export const INK_COMET_STEP_DEGREES = 16
export const INK_COMET_RADIUS_X = 62
export const INK_COMET_RADIUS_Y = 80

/** Seconds per cycle of each motion. */
export const INK_MOTION_SECONDS: Readonly<Record<InkMotion, number>> = {
  orbit: 2.6,
  splash: 1.6,
  float: 1.8,
  comet: 1.4,
  pulse: 1.5,
  still: 1,
}

/** Seconds between two pulsing droplets. */
export const INK_PULSE_STAGGER = 0.2

/** Seconds per fade when the person asks for reduced motion. */
export const INK_FADE_SECONDS = 1.8

export const BADGE_SETTINGS_TITLE = 'Badges'
export const BADGE_SETTINGS_INTRO =
  'How project and group rows in the sidebar show what is waiting on you and what is running.'
export const BADGE_MODE_LEGEND = 'How a row adds things up'
export const BADGE_STYLE_LEGEND = 'Total badge style'
export const BADGE_MOTION_LEGEND = 'When something is running'
export const BADGE_CHANNEL_COLOURS_LABEL = 'Channel colours'
export const BADGE_CHANGE_COLOURS_LABEL = 'Change in Notifications ›'
export const BADGE_RESET_LABEL = 'Back to the default'
export const BADGE_PREVIEW_LABEL = 'Preview'
export const BADGE_DEFAULT_LABEL = 'Default'

export const BADGE_MODE_OPTIONS: readonly { id: BadgeMode; label: string }[] = [
  { id: 'total', label: 'One total' },
  { id: 'stacked', label: 'Stacked pill' },
  { id: 'top', label: 'Top number + dots' },
  { id: 'dots', label: 'Dots only' },
]

export const BADGE_STYLE_OPTIONS: readonly { id: BadgeStyle; label: string }[] = [
  { id: 'splatter', label: 'Ink splatter' },
  { id: 'watercolour', label: 'Watercolour' },
  { id: 'ring', label: 'Colour ring' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'pie', label: 'Pie' },
]

export const BADGE_MOTION_OPTIONS: readonly { id: BadgeMotion; label: string }[] = [
  { id: 'orbit', label: 'Orbit' },
  { id: 'splash', label: 'Splash' },
  { id: 'float', label: 'Float' },
  { id: 'comet', label: 'Comet' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'spinner', label: 'Spinner' },
]

/** The channels whose colour the settings section shows, with the red that always means broke. */
export const BADGE_CHANNEL_SWATCHES: readonly { channel: InkChannel; label: string }[] = [
  { channel: 'processes', label: 'Processes' },
  { channel: 'chat', label: 'Chat' },
  { channel: 'git', label: 'Git' },
  { channel: 'failed', label: 'Something broke' },
]

const SAMPLE_WAITING: readonly InkPart[] = [
  { channel: 'processes', count: 3 },
  { channel: 'chat', count: 1 },
  { channel: 'git', count: 4 },
]

/** What every option card draws: three channels waiting, nothing running. */
export const BADGE_SAMPLE_IDLE = { parts: SAMPLE_WAITING, rollup: true } as const

/** What every motion card draws: three channels waiting and a run working. */
export const BADGE_SAMPLE_RUNNING = {
  parts: SAMPLE_WAITING,
  running: 'processes',
  rollup: true,
} as const

/** The rows of the live preview — every state a row can be in. */
export const BADGE_PREVIEW_ROWS: readonly {
  label: string
  parts: readonly InkPart[]
  running?: InkChannel
  fresh?: number
}[] = [
  { label: 'A chat needs you', parts: [{ channel: 'chat', count: 1 }] },
  { label: 'Nothing going on', parts: [] },
  { label: 'Everything at once', parts: SAMPLE_WAITING, running: 'processes' },
  { label: 'Runs waiting', parts: [{ channel: 'processes', count: 2 }] },
  { label: 'Only a run working', parts: [], running: 'processes' },
  {
    label: 'An agent replying',
    parts: [
      { channel: 'chat', count: 1 },
      { channel: 'git', count: 5 },
    ],
    running: 'chat',
  },
  { label: 'New results to read', parts: [], fresh: 2 },
  {
    label: 'Something broke',
    parts: [
      { channel: 'failed', count: 1 },
      { channel: 'processes', count: 1 },
      { channel: 'chat', count: 2 },
    ],
    running: 'processes',
  },
]
