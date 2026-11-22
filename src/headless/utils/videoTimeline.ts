import { VIDEO_SOUND_CUE_WORDS, VIDEO_SOUND_UNTIL } from 'thefactory-tools/constants'
import type { VideoTimelineSound } from 'thefactory-tools/types'
import { formatVideoTime } from 'thefactory-tools/utils'
import { videoStageLine } from './videoAttachment'
import {
  VIDEO_TIMELINE_PLAYHEAD_SLACK_SEC,
  VIDEO_TIMELINE_REFRESH_MARGIN_MS,
  VIDEO_TIMELINE_TEXT,
  VIDEO_TIMELINE_TEXT_SEPARATOR,
} from './videoTimelineConstants'
import type {
  ChatVideoTimeline,
  ChatVideoTimelineEntry,
  ChatVideoTimelineStill,
  VideoTimelineCloseUpRow,
  VideoTimelineGlyph,
  VideoTimelineRow,
  VideoTimelineView,
} from './videoTimelineTypes'

const capitalized = (words: string): string => words.charAt(0).toUpperCase() + words.slice(1)

const joined = (lines: readonly string[]): string => lines.join(VIDEO_TIMELINE_TEXT_SEPARATOR)

function soundText({ sound, endSec }: VideoTimelineSound): string {
  const words = VIDEO_SOUND_CUE_WORDS[sound]
  return capitalized(sound === 'sudden' ? words : VIDEO_SOUND_UNTIL(words, formatVideoTime(endSec)))
}

function closeUpRows({ closeUps }: ChatVideoTimelineStill): VideoTimelineCloseUpRow[] {
  return closeUps.map(({ file, url, place, text }) => ({
    key: file,
    url,
    text: VIDEO_TIMELINE_TEXT.closeUp(place, joined(text ?? [])),
  }))
}

function rowOf(entry: ChatVideoTimelineEntry, index: number): VideoTimelineRow {
  const base = {
    key: `${entry.kind}-${index}-${entry.timeSec}`,
    timeSec: entry.timeSec,
    time: formatVideoTime(entry.timeSec),
  }
  const row = (glyph: VideoTimelineGlyph, text: string) => ({
    ...base,
    glyph,
    text,
    closeUps: entry.kind === 'still' ? closeUpRows(entry) : [],
  })
  switch (entry.kind) {
    case 'still':
      return row(
        { kind: 'still', url: entry.url },
        entry.text.length ? joined(entry.text) : VIDEO_TIMELINE_TEXT.noText,
      )
    case 'speech':
      return row({ kind: 'speech' }, `"${entry.text}"`)
    case 'sound':
      return row({ kind: 'sound' }, soundText(entry))
  }
}

/** A video's timeline as the fold and the screen draw it, from what the route last said. */
export function videoTimelineView(timeline: ChatVideoTimeline | undefined): VideoTimelineView {
  if (!timeline) return { state: 'loading' }
  switch (timeline.state) {
    case 'not-started':
      return { state: 'preparing', line: VIDEO_TIMELINE_TEXT.notStarted }
    case 'in-progress':
      return { state: 'preparing', line: videoStageLine(timeline.stage, timeline.percent) }
    case 'failed':
      return { state: 'failed', line: timeline.reason ?? VIDEO_TIMELINE_TEXT.failed }
    case 'done':
      break
  }
  if (timeline.entries.length === 0) return { state: 'empty', line: VIDEO_TIMELINE_TEXT.empty }
  return {
    state: 'rows',
    count: VIDEO_TIMELINE_TEXT.moments(timeline.entries.length),
    rows: timeline.entries.map(rowOf),
    ...(timeline.onEveryScreen.length
      ? { onEveryScreen: VIDEO_TIMELINE_TEXT.onEveryScreen(joined(timeline.onEveryScreen)) }
      : {}),
  }
}

/** The row the playhead is at: the last moment it has reached, or -1 before the first. */
export function videoTimelineRowAt(rows: readonly VideoTimelineRow[], atSec: number): number {
  let at = -1
  rows.forEach((row, index) => {
    if (row.timeSec <= atSec + VIDEO_TIMELINE_PLAYHEAD_SLACK_SEC) at = index
  })
  return at
}

/** How long until a timeline is read again for fresh picture URLs; none without a time to go by. */
export function videoTimelineRefreshInMs(
  expiresAt: string | undefined,
  now: number,
): number | undefined {
  const end = expiresAt === undefined ? NaN : Date.parse(expiresAt)
  if (Number.isNaN(end)) return undefined
  return Math.max(0, end - VIDEO_TIMELINE_REFRESH_MARGIN_MS - now)
}

/** A still's picture, by the file the digest names it by. */
export function videoTimelineStillUrl(
  timeline: ChatVideoTimeline | undefined,
  file: string,
): string | undefined {
  const entry = timeline?.entries.find(
    (one): one is ChatVideoTimelineStill => one.kind === 'still' && one.file === file,
  )
  return entry?.url
}

const onServer = (url: string, apiBaseUrl: string): string =>
  url.startsWith('/') ? `${apiBaseUrl.replace(/\/+$/, '')}${url}` : url

/** The timeline with its pictures' server-relative URLs on the server the client talks to. */
export function videoTimelineOnServer(
  timeline: ChatVideoTimeline,
  apiBaseUrl: string | null,
): ChatVideoTimeline {
  if (!apiBaseUrl) return timeline
  return {
    ...timeline,
    entries: timeline.entries.map((entry) =>
      entry.kind === 'still'
        ? {
            ...entry,
            url: onServer(entry.url, apiBaseUrl),
            closeUps: entry.closeUps.map((one) => ({ ...one, url: onServer(one.url, apiBaseUrl) })),
          }
        : entry,
    ),
  }
}
