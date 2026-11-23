import {
  VIDEO_ACTION_UNQUOTED_TARGETS,
  VIDEO_ACTION_VERBS,
  VIDEO_SOUND_CUE_WORDS,
  VIDEO_SOUND_UNTIL,
} from 'thefactory-tools/constants'
import type {
  VideoMarkedMoment,
  VideoTimelineAction,
  VideoTimelineSound,
} from 'thefactory-tools/types'
import { formatVideoTime } from 'thefactory-tools/utils'
import { videoStageLine } from './videoAttachment'
import type { ChatVideoMarkDraft } from './videoMarksTypes'
import {
  VIDEO_TIMELINE_PLACE,
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
  VideoTimelineMarkInput,
  VideoTimelineMarkLine,
  VideoTimelineMarks,
  VideoTimelineMarkSource,
  VideoTimelineRow,
  VideoTimelineView,
} from './videoTimelineTypes'

const capitalized = (words: string): string => words.charAt(0).toUpperCase() + words.slice(1)

const joined = (lines: readonly string[]): string => lines.join(VIDEO_TIMELINE_TEXT_SEPARATOR)

function actionText({ action, target, ok }: VideoTimelineAction): string {
  const aimed =
    target === undefined
      ? undefined
      : VIDEO_ACTION_UNQUOTED_TARGETS.includes(action)
        ? target
        : `"${target}"`
  const said = [capitalized(VIDEO_ACTION_VERBS[action]), aimed].filter(Boolean).join(' ')
  return ok ? said : VIDEO_TIMELINE_TEXT.failedAction(said)
}

function soundText({ sound, endSec }: VideoTimelineSound): string {
  const words = VIDEO_SOUND_CUE_WORDS[sound]
  return capitalized(sound === 'sudden' ? words : VIDEO_SOUND_UNTIL(words, formatVideoTime(endSec)))
}

function closeUpRows({ timeSec, closeUps }: ChatVideoTimelineStill): VideoTimelineCloseUpRow[] {
  return closeUps.map(({ file, url, place, box, text }) => {
    const words = joined(text ?? [])
    return {
      key: file,
      url,
      text: VIDEO_TIMELINE_TEXT.closeUp(place, words),
      timeSec,
      time: formatVideoTime(timeSec),
      place: VIDEO_TIMELINE_PLACE[place],
      words,
      width: box.width,
      height: box.height,
    }
  })
}

function rowOf(entry: ChatVideoTimelineEntry, index: number): VideoTimelineRow {
  const base = {
    key: `${entry.kind}-${index}-${entry.timeSec}`,
    timeSec: entry.timeSec,
    time: formatVideoTime(entry.timeSec),
  }
  const row = (glyph: VideoTimelineGlyph, text: string, failed = false) => ({
    ...base,
    glyph,
    text,
    failed,
    closeUps: entry.kind === 'still' ? closeUpRows(entry) : [],
    marks: [],
  })
  switch (entry.kind) {
    case 'still':
      return row(
        { kind: 'still', url: entry.url },
        entry.text.length ? joined(entry.text) : VIDEO_TIMELINE_TEXT.noText,
      )
    case 'speech':
      return row({ kind: 'speech' }, `"${entry.text}"`)
    case 'action':
      return row({ kind: 'action' }, actionText(entry), !entry.ok)
    case 'sound':
      return row({ kind: 'sound' }, soundText(entry))
  }
}

const MARK_TAGS: Record<VideoTimelineMarkSource, string> = {
  sent: VIDEO_TIMELINE_TEXT.markSent,
  composer: VIDEO_TIMELINE_TEXT.markWaiting,
}

function markLines(
  source: VideoTimelineMarkSource,
  marks: readonly VideoTimelineMarkInput[],
): VideoTimelineMarkLine[] {
  const byTime = new Map<number, VideoTimelineMarkInput>()
  for (const one of marks) byTime.set(one.timeSec, one)
  return [...byTime.values()].map(({ timeSec, note }) => {
    const written = note?.trim() ?? ''
    return {
      key: `${source}-${timeSec}`,
      timeSec,
      time: formatVideoTime(timeSec),
      note: written || VIDEO_TIMELINE_TEXT.noNote,
      hasNote: !!written,
      source,
      tag: MARK_TAGS[source],
    }
  })
}

function withMarks(rows: VideoTimelineRow[], marks: VideoTimelineMarks): VideoTimelineRow[] {
  const lines = [...markLines('sent', marks.sent), ...markLines('composer', marks.composer)].sort(
    (a, b) => a.timeSec - b.timeSec,
  )
  if (lines.length === 0) return rows
  const under = rows.map((): VideoTimelineMarkLine[] => [])
  for (const line of lines) {
    let at = 0
    rows.forEach((row, index) => {
      if (row.timeSec <= line.timeSec) at = index
    })
    under[at]?.push(line)
  }
  return rows.map((row, index) => ({ ...row, marks: under[index] ?? [] }))
}

/** One video's marks out of a chat's sent ones and the composer's, for its timeline. */
export function videoTimelineMarksOf(
  video: string,
  sent: readonly VideoMarkedMoment[] | undefined,
  composer: readonly ChatVideoMarkDraft[] | undefined,
): VideoTimelineMarks {
  const of = (marks: readonly { video: string; timeSec: number; note?: string }[] | undefined) =>
    (marks ?? [])
      .filter((one) => one.video === video)
      .map(({ timeSec, note }) => ({ timeSec, ...(note !== undefined ? { note } : {}) }))
  return { sent: of(sent), composer: of(composer) }
}

/** Every close-up of a timeline, in the order its rows show them, for the viewer to step through. */
export function videoTimelineCloseUps(view: VideoTimelineView): VideoTimelineCloseUpRow[] {
  return view.state === 'rows' ? view.rows.flatMap((row) => row.closeUps) : []
}

/**
 * A video's timeline as the fold and the screen draw it, from what the route last said, with the
 * person's marks of it under the rows they fall in: the last at or before each, the first for one
 * before them all.
 */
export function videoTimelineView(
  timeline: ChatVideoTimeline | undefined,
  marks?: VideoTimelineMarks,
): VideoTimelineView {
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
    rows: marks ? withMarks(timeline.entries.map(rowOf), marks) : timeline.entries.map(rowOf),
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
