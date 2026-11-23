import type { VideoMarkedMoment } from 'thefactory-tools/types'
import { formatVideoTime, videoMarkStillOf } from 'thefactory-tools/utils'
import { VIDEO_MARK_TEXT, VIDEO_MARK_STEPS_PER_SEC } from './videoMarksConstants'
import type {
  ChatVideoMarkDraft,
  ComposerVideoMarkRow,
  SentVideoMarkRow,
  VideoMarkInput,
} from './videoMarksTypes'
import { videoTimelineStillUrl } from './videoTimeline'
import type { ChatVideoTimeline } from './videoTimelineTypes'

/** A player's time as a mark keeps it: to a tenth of a second, never before the start. */
export function videoMarkTimeOf(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return Math.round(seconds * VIDEO_MARK_STEPS_PER_SEC) / VIDEO_MARK_STEPS_PER_SEC
}

/** One moment of one video: two marks with the same key are the same mark. */
export function videoMarkKey({ video, timeSec }: { video: string; timeSec: number }): string {
  return `${video}#${timeSec}`
}

const timeOrder = (a: { timeSec: number }, b: { timeSec: number }) => a.timeSec - b.timeSec

/**
 * A mark added; one at a moment already marked takes its place. A note given, empty too, is its
 * note now; with none given it keeps the one it had.
 */
export function addVideoMark(
  marks: readonly ChatVideoMarkDraft[],
  { video, timeSec, note }: VideoMarkInput,
): ChatVideoMarkDraft[] {
  const added: ChatVideoMarkDraft = { video, timeSec: videoMarkTimeOf(timeSec), note: '' }
  const key = videoMarkKey(added)
  const given = note?.trim() ?? ''
  const existing = marks.find((one) => videoMarkKey(one) === key)
  if (!existing) return [...marks, { ...added, note: given }]
  return marks.map((one) =>
    one === existing ? { ...added, note: note === undefined ? existing.note : given } : one,
  )
}

/** The note of the mark waiting at that moment of a video, or nothing when none waits there. */
export function videoMarkNoteAt(
  marks: readonly ChatVideoMarkDraft[],
  video: string,
  timeSec: number,
): string | undefined {
  const key = videoMarkKey({ video, timeSec: videoMarkTimeOf(timeSec) })
  return marks.find((one) => videoMarkKey(one) === key)?.note
}

export function setVideoMarkNote(
  marks: ChatVideoMarkDraft[],
  key: string,
  note: string,
): ChatVideoMarkDraft[] {
  if (!marks.some((one) => videoMarkKey(one) === key)) return marks
  return marks.map((one) =>
    videoMarkKey(one) === key ? { video: one.video, timeSec: one.timeSec, note } : one,
  )
}

export function removeVideoMark(
  marks: readonly ChatVideoMarkDraft[],
  key: string,
): ChatVideoMarkDraft[] {
  return marks.filter((one) => videoMarkKey(one) !== key)
}

/** Two lists of marks as one: the first's, then the moments of the second it does not hold. */
export function mergeVideoMarks(
  first: readonly ChatVideoMarkDraft[] | undefined,
  second: readonly ChatVideoMarkDraft[] | undefined,
): ChatVideoMarkDraft[] {
  const kept = [...(first ?? [])]
  const keys = new Set(kept.map(videoMarkKey))
  for (const one of second ?? []) {
    if (!keys.has(videoMarkKey(one))) kept.push(one)
  }
  return kept
}

/** The marks as a message carries them to the backend. */
export function videoMarksToSend(marks: readonly ChatVideoMarkDraft[]): VideoMarkedMoment[] {
  return marks.map(({ video, timeSec, note }) => {
    const written = note.trim()
    return { video, timeSec, ...(written ? { note: written } : {}) }
  })
}

/** Marks read back from a stored draft; anything that is not one is dropped, refusals too. */
export function videoMarksOf(value: unknown): ChatVideoMarkDraft[] {
  if (!Array.isArray(value)) return []
  const marks: ChatVideoMarkDraft[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const { video, timeSec, note } = entry as Record<string, unknown>
    if (typeof video !== 'string' || video.length === 0) continue
    if (typeof timeSec !== 'number' || !Number.isFinite(timeSec) || timeSec < 0) continue
    marks.push({ video, timeSec, note: typeof note === 'string' ? note : '' })
  }
  return marks
}

const namesTime = (reason: string, timeSec: number): boolean => {
  const said = String(Math.round(timeSec * 100) / 100).replace('.', '\\.')
  return new RegExp(`(?:^|[^\\d.])${said} s\\b`).test(reason)
}

/**
 * The marks with a refused send's reason by the one it is about: the first on the video the reason
 * names, else the first at the time it names, else the first mark.
 */
export function withVideoMarkRefusal(
  marks: readonly ChatVideoMarkDraft[],
  reason: string,
): ChatVideoMarkDraft[] {
  const byVideo = marks.findIndex((one) => reason.includes(one.video))
  const byTime = marks.findIndex((one) => namesTime(reason, one.timeSec))
  const at = byVideo >= 0 ? byVideo : Math.max(byTime, 0)
  return marks.map((one, index) => (index === at ? { ...one, refusal: reason } : one))
}

export function withoutVideoMarkRefusals(
  marks: readonly ChatVideoMarkDraft[],
): ChatVideoMarkDraft[] {
  return marks.map(({ video, timeSec, note }) => ({ video, timeSec, note }))
}

/** Each marked video once, in the order it was first marked. */
export function videoMarkVideos(marks: readonly { video: string }[]): string[] {
  return [...new Set(marks.map((one) => one.video))]
}

/** A message's files and then each video it marks that it does not carry, so every mark has its card. */
export function withMarkedVideos(
  paths: readonly string[] | undefined,
  marks: readonly { video: string }[] | undefined,
): string[] {
  const shown = [...(paths ?? [])]
  for (const video of videoMarkVideos(marks ?? [])) {
    if (!shown.includes(video)) shown.push(video)
  }
  return shown
}

const stillUrlAt = (timeline: ChatVideoTimeline | undefined, timeSec: number) => {
  const still = timeline ? videoMarkStillOf(timeline, timeSec) : undefined
  return still ? videoTimelineStillUrl(timeline, still.file) : undefined
}

/** One video's marks in the composer, in time order, each with the still that shows it. */
export function composerVideoMarkRows(
  marks: readonly ChatVideoMarkDraft[],
  video: string,
  timeline: ChatVideoTimeline | undefined,
): ComposerVideoMarkRow[] {
  return marks
    .filter((one) => one.video === video)
    .sort(timeOrder)
    .map((one) => {
      const stillUrl = stillUrlAt(timeline, one.timeSec)
      return {
        key: videoMarkKey(one),
        timeSec: one.timeSec,
        time: formatVideoTime(one.timeSec),
        note: one.note,
        ...(stillUrl ? { stillUrl } : {}),
        ...(one.refusal ? { refusal: one.refusal } : {}),
      }
    })
}

/** One video's marks on a sent message, in time order, each by the still it was sent with. */
export function sentVideoMarkRows(
  moments: readonly VideoMarkedMoment[] | undefined,
  video: string,
  timeline: ChatVideoTimeline | undefined,
): SentVideoMarkRow[] {
  return (moments ?? [])
    .filter((one) => one.video === video)
    .sort(timeOrder)
    .map((one) => {
      const stillUrl = one.still
        ? videoTimelineStillUrl(timeline, one.still.file)
        : stillUrlAt(timeline, one.timeSec)
      return {
        key: videoMarkKey(one),
        timeSec: one.timeSec,
        time: formatVideoTime(one.timeSec),
        note: one.note || VIDEO_MARK_TEXT.noNote,
        hasNote: !!one.note,
        ...(stillUrl ? { stillUrl } : {}),
      }
    })
}

/** Every mark a chat's messages carried, in message order, for the timelines that show them. */
export function chatSentVideoMarks(
  messages: readonly { videoMarks?: VideoMarkedMoment[] }[],
): VideoMarkedMoment[] {
  return messages.flatMap((message) => message.videoMarks ?? [])
}
