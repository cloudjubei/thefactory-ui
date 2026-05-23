/**
 * Pure timeline / Gantt math — shared between web's `ProjectTimelineView`
 * and native's `TimelineGantt` compound. No DOM, no React, no platform APIs
 * so it's safe in any consumer (web, RN, Node tests).
 *
 * The module covers four families of helpers:
 *  - {@link Bucket} type + bucket helpers (`bucketStart`, `bucketKey`,
 *    `bucketLabel`, `bucketStep`).
 *  - Story / feature event extraction ({@link storyEvents}, the cross-project
 *    flavour {@link storyEventsAcrossProjects}).
 *  - Column-index math: given an event's `ts`, the active bucket and the
 *    timeline's `originDate`, return the integer column index
 *    ({@link columnIndex}).
 *  - Label-event grouping ({@link groupLabelsByKey}).
 */

import type { GetStoryResponse } from '../api'
import type { StoryStatus } from './status'

// -----------------------------------------------------------------------------
// Bucket model
// -----------------------------------------------------------------------------

/**
 * The horizontal zoom level of the Gantt grid. Each value is a unit step on
 * the x-axis (one column per unit). Web's "Day / Week / Month" controller
 * lives at the smaller end of this set; the larger units leave room for
 * quarter / year zooms once the UI exposes them.
 */
export type Bucket = 'day' | 'week' | 'month' | 'quarter' | 'year'

/** Mutable copy with the time-of-day zeroed out. */
function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** ISO-style week start (Monday). */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = (day + 6) % 7 // 0 for Monday
  x.setDate(x.getDate() - diff)
  return x
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

function startOfQuarter(d: Date): Date {
  const x = startOfMonth(d)
  const m = x.getMonth()
  x.setMonth(m - (m % 3))
  return x
}

function startOfYear(d: Date): Date {
  const x = startOfDay(d)
  x.setMonth(0, 1)
  return x
}

/** Floor `d` to the start of its bucket. Pure — never mutates `d`. */
export function bucketStart(d: Date, bucket: Bucket): Date {
  switch (bucket) {
    case 'day':
      return startOfDay(d)
    case 'week':
      return startOfWeek(d)
    case 'month':
      return startOfMonth(d)
    case 'quarter':
      return startOfQuarter(d)
    case 'year':
      return startOfYear(d)
  }
}

/**
 * Step `d` forward by `n` buckets (negative `n` walks backwards). Always
 * returns a fresh `Date`.
 */
export function bucketStep(d: Date, bucket: Bucket, n: number): Date {
  const x = new Date(d)
  switch (bucket) {
    case 'day':
      x.setDate(x.getDate() + n)
      return x
    case 'week':
      x.setDate(x.getDate() + n * 7)
      return x
    case 'month':
      x.setMonth(x.getMonth() + n)
      return x
    case 'quarter':
      x.setMonth(x.getMonth() + n * 3)
      return x
    case 'year':
      x.setFullYear(x.getFullYear() + n)
      return x
  }
}

/**
 * Stable key for the bucket a timestamp falls into. Two timestamps in the
 * same bucket return the same key. Cheap to use as a Map / object key.
 */
export function bucketKey(d: Date, bucket: Bucket): string {
  const s = bucketStart(d, bucket)
  switch (bucket) {
    case 'day':
      return `d-${s.toISOString().slice(0, 10)}`
    case 'week':
      return `w-${s.toISOString().slice(0, 10)}`
    case 'month':
      return `m-${s.getFullYear()}-${s.getMonth()}`
    case 'quarter':
      return `q-${s.getFullYear()}-${Math.floor(s.getMonth() / 3)}`
    case 'year':
      return `y-${s.getFullYear()}`
  }
}

/** Short user-facing label for the bucket starting at `d`. */
export function bucketLabel(d: Date, bucket: Bucket): string {
  const s = bucketStart(d, bucket)
  switch (bucket) {
    case 'day':
      return s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    case 'week':
      return s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    case 'month':
      return s.toLocaleDateString(undefined, { month: 'short' })
    case 'quarter':
      return `Q${Math.floor(s.getMonth() / 3) + 1}`
    case 'year':
      return String(s.getFullYear())
  }
}

/** The year row label for the bucket starting at `d`. */
export function bucketYearLabel(d: Date, bucket: Bucket): string {
  const s = bucketStart(d, bucket)
  return bucket === 'year' ? '' : String(s.getFullYear())
}

// -----------------------------------------------------------------------------
// Column-index math
// -----------------------------------------------------------------------------

function diffInBuckets(a: Date, b: Date, bucket: Bucket): number {
  const sa = bucketStart(a, bucket)
  const sb = bucketStart(b, bucket)
  switch (bucket) {
    case 'day': {
      const ms = sb.getTime() - sa.getTime()
      return Math.floor(ms / 86_400_000)
    }
    case 'week': {
      const ms = sb.getTime() - sa.getTime()
      return Math.floor(ms / (86_400_000 * 7))
    }
    case 'month':
      return (sb.getFullYear() - sa.getFullYear()) * 12 + (sb.getMonth() - sa.getMonth())
    case 'quarter':
      return (
        (sb.getFullYear() - sa.getFullYear()) * 4 +
        (Math.floor(sb.getMonth() / 3) - Math.floor(sa.getMonth() / 3))
      )
    case 'year':
      return sb.getFullYear() - sa.getFullYear()
  }
}

/**
 * Integer column index for `ts` inside a Gantt whose leftmost column starts
 * at `originDate` (already snapped to a bucket start by the caller). Returns
 * `0` for timestamps in or before the origin's bucket.
 */
export function columnIndex(ts: string | Date, bucket: Bucket, originDate: Date): number {
  const d = typeof ts === 'string' ? new Date(ts) : ts
  if (isNaN(d.getTime())) return 0
  return Math.max(0, diffInBuckets(originDate, d, bucket))
}

/**
 * Build the column descriptors that fill `originDate .. originDate + count`.
 * The descriptors are stable across renders for the same inputs and carry
 * everything the date-strip / year-strip need.
 */
export interface TimelineColumn {
  index: number
  start: Date
  key: string
  label: string
  yearLabel: string
}

export function buildColumns(originDate: Date, bucket: Bucket, count: number): TimelineColumn[] {
  const out: TimelineColumn[] = []
  for (let i = 0; i < count; i++) {
    const start = bucketStep(originDate, bucket, i)
    out.push({
      index: i,
      start,
      key: bucketKey(start, bucket),
      label: bucketLabel(start, bucket),
      yearLabel: bucketYearLabel(start, bucket),
    })
  }
  return out
}

/** Contiguous spans of columns that share a year label — for the top strip. */
export interface TimelineYearGroup {
  label: string
  startIdx: number
  len: number
}

export function buildYearGroups(columns: TimelineColumn[]): TimelineYearGroup[] {
  const groups: TimelineYearGroup[] = []
  let current = ''
  let startIdx = 0
  for (let i = 0; i < columns.length; i++) {
    const g = columns[i].yearLabel
    if (i === 0) {
      current = g
      startIdx = 0
    } else if (g !== current) {
      groups.push({ label: current, startIdx, len: i - startIdx })
      current = g
      startIdx = i
    }
  }
  if (columns.length > 0) {
    groups.push({ label: current, startIdx, len: columns.length - startIdx })
  }
  return groups
}

// -----------------------------------------------------------------------------
// Story / feature events
// -----------------------------------------------------------------------------

/**
 * A single timeline event — a story landing, a feature landing, or a
 * milestone label. Native + web consumers both render this shape; the
 * `projectId` is optional in single-project mode and populated in
 * all-projects mode.
 */
export type TimelineEvent =
  | {
      kind: 'story'
      storyId: string
      ts: string
      title: string
      status?: StoryStatus
      projectId?: string
    }
  | {
      kind: 'feature'
      storyId: string
      featureId: string
      ts: string
      title: string
      status?: StoryStatus
      projectId?: string
    }
  | {
      kind: 'label'
      entityId: string
      ts: string
      title: string
      description?: string
      projectId?: string
    }

/** Story / feature subset of {@link TimelineEvent} — everything except labels. */
export type StoryFeatureEvent = Extract<TimelineEvent, { kind: 'story' | 'feature' }>

/**
 * Flatten a story list into story + feature timeline events. Stories without
 * a `completedAt` fall back to `createdAt` so in-progress stories still
 * surface in the timeline.
 */
export function storyEvents(stories: ReadonlyArray<GetStoryResponse>): StoryFeatureEvent[] {
  const events: StoryFeatureEvent[] = []
  for (const s of stories) {
    const ts = s.completedAt ?? s.createdAt
    if (ts) {
      events.push({
        kind: 'story',
        storyId: s.id,
        ts,
        title: s.title ?? '',
        status: s.status as StoryStatus | undefined,
      })
    }
    for (const f of s.features ?? []) {
      const fts = f.completedAt ?? f.createdAt
      if (!fts) continue
      events.push({
        kind: 'feature',
        storyId: s.id,
        featureId: f.id,
        ts: fts,
        title: f.title ?? '',
        status: f.status as StoryStatus | undefined,
      })
    }
  }
  return events
}

/**
 * Same as {@link storyEvents} but consumes the `{ projectId, stories }` shape
 * the all-projects loader produces and tags every event with its owning
 * `projectId`.
 */
export function storyEventsAcrossProjects(
  byProject: ReadonlyArray<{ projectId: string; stories: ReadonlyArray<GetStoryResponse> }>,
): StoryFeatureEvent[] {
  const out: StoryFeatureEvent[] = []
  for (const { projectId, stories } of byProject) {
    for (const ev of storyEvents(stories)) out.push({ ...ev, projectId })
  }
  return out
}

/**
 * Reduce a flat list of story+feature+label events into one row per story,
 * the way the Gantt renders them. Stories appear in the order they're first
 * seen. Labels (milestones) are surfaced as their own pseudo-row keyed
 * `__labels__` so callers can render the timeline-wide markers above or
 * below the story rows.
 */
export interface TimelineStoryRow {
  storyId: string
  title: string
  events: StoryFeatureEvent[]
}

export function groupEventsByStory(events: ReadonlyArray<TimelineEvent>): TimelineStoryRow[] {
  const byStory = new Map<string, TimelineStoryRow>()
  for (const ev of events) {
    if (ev.kind === 'label') continue
    const existing = byStory.get(ev.storyId)
    if (existing) {
      existing.events.push(ev)
    } else {
      byStory.set(ev.storyId, {
        storyId: ev.storyId,
        title: ev.kind === 'story' ? ev.title : '',
        events: [ev],
      })
    }
  }
  // Title resolution: prefer a story event's title; otherwise keep whatever
  // feature title was first.
  for (const row of byStory.values()) {
    if (!row.title) {
      const storyEv = row.events.find((e) => e.kind === 'story')
      if (storyEv) row.title = storyEv.title
      else row.title = row.events[0]?.title ?? row.storyId
    }
    row.events.sort((a, b) => a.ts.localeCompare(b.ts))
  }
  return Array.from(byStory.values())
}

// -----------------------------------------------------------------------------
// Label grouping
// -----------------------------------------------------------------------------

/** Group label-only events by their bucket key — for the milestone strip. */
export function groupLabelsByBucket(
  labels: ReadonlyArray<{ id: string; ts: string; label?: string; description?: string }>,
  bucket: Bucket,
): Map<string, ReadonlyArray<{ id: string; ts: string; label?: string; description?: string }>> {
  const out = new Map<
    string,
    Array<{ id: string; ts: string; label?: string; description?: string }>
  >()
  for (const l of labels) {
    const key = bucketKey(new Date(l.ts), bucket)
    const list = out.get(key) ?? []
    list.push(l)
    out.set(key, list)
  }
  return out
}

// -----------------------------------------------------------------------------
// Bucket geometry helpers — share the window math between web + native
// -----------------------------------------------------------------------------

/**
 * Compute the `[originDate, count]` pair that covers the full event window
 * with `padding` columns either side. The origin is snapped to the bucket
 * start so column 0 always aligns with the strip labels.
 */
export function computeWindow(
  events: ReadonlyArray<{ ts: string }>,
  bucket: Bucket,
  options: { padding?: number; defaultDays?: number; includeToday?: boolean } = {},
): { originDate: Date; count: number } {
  const padding = options.padding ?? 2
  const defaultDays = options.defaultDays ?? 30
  const includeToday = options.includeToday ?? true

  const now = new Date()
  const today = startOfDay(now)
  const defaultStart = startOfDay(new Date(now.getTime() - defaultDays * 86_400_000))

  let minDate: Date
  let maxDate: Date
  if (events.length === 0) {
    minDate = defaultStart
    maxDate = today
  } else {
    let min = new Date(events[0].ts).getTime()
    let max = min
    for (const e of events) {
      const t = new Date(e.ts).getTime()
      if (t < min) min = t
      if (t > max) max = t
    }
    minDate = new Date(min)
    maxDate = new Date(max)
    if (minDate > defaultStart) minDate = defaultStart
    if (includeToday && maxDate < today) maxDate = today
  }

  const origin = bucketStep(bucketStart(minDate, bucket), bucket, -padding)
  const end = bucketStep(bucketStart(maxDate, bucket), bucket, padding)
  const count = Math.max(1, diffInBuckets(origin, end, bucket) + 1)
  return { originDate: origin, count }
}
