import { WORK_QUEUE_DEFAULT_RUN_CAP } from 'thefactory-tools/constants'
import type { WorkQueue, WorkQueueEntry, WorkQueueState } from 'thefactory-tools/types'
import { nextQueuedStart, workQueueEntryKey, workQueueSkipReason } from 'thefactory-tools/utils'

import {
  WORK_QUEUE_COPY,
  WORK_QUEUE_STATE_LABELS,
  WORK_QUEUE_STATE_TONES,
} from './workQueueConstants'
import type {
  WorkQueueEntryStates,
  WorkQueueRowState,
  WorkQueueRowView,
  WorkQueueSlots,
  WorkQueueTitles,
  WorkQueueView,
} from './workQueueTypes'

function entryWhere(entry: WorkQueueEntry): string {
  return entry.kind === 'story' ? entry.projectId : entry.groupId
}

function entryId(entry: WorkQueueEntry): string {
  return entry.kind === 'story' ? entry.storyId : entry.groupStoryId
}

/**
 * The queue panel of a scope: each entry with where it stands — done, running,
 * waiting on blockers, not ready with planning off, next to start, or waiting
 * for a slot — read by the same picker the supervisor starts work with, and
 * the cap in use. Pure.
 */
export function workQueueView(
  queue: WorkQueue,
  {
    slots,
    states = {},
    titles = {},
  }: { slots?: WorkQueueSlots; states?: WorkQueueEntryStates; titles?: WorkQueueTitles },
): WorkQueueView {
  const cap = slots?.cap ?? WORK_QUEUE_DEFAULT_RUN_CAP
  const liveRuns = slots ? slots.live + slots.waiting.length : 0
  const pickerState: WorkQueueState = { liveRuns, entries: { ...states } }
  const starts = new Set(nextQueuedStart(queue, pickerState, cap).map(workQueueEntryKey))
  const last = queue.entries.length - 1
  const rows = queue.entries.map((entry, index): WorkQueueRowView => {
    const key = workQueueEntryKey(entry)
    const reason = workQueueSkipReason(entry, pickerState)
    const state: WorkQueueRowState =
      reason === undefined
        ? starts.has(key)
          ? 'next'
          : 'slot'
        : reason === 'unknown'
          ? 'queued'
          : reason
    const waitingOn = states[key]?.waitingOn ?? []
    const detail =
      state === 'blocked'
        ? WORK_QUEUE_COPY.waitingOn(waitingOn)
        : state === 'not-ready'
          ? WORK_QUEUE_COPY.notReady
          : undefined
    return {
      key,
      entry,
      title: titles[key] ?? entryId(entry),
      where: entryWhere(entry),
      state,
      stateLabel: WORK_QUEUE_STATE_LABELS[state],
      tone: WORK_QUEUE_STATE_TONES[state],
      ...(detail ? { detail } : {}),
      skipsPlanning: entry.planning === false,
      index,
      canMoveUp: index > 0,
      canMoveDown: index < last,
    }
  })
  return {
    scope: queue.scope,
    rows,
    ...(slots ? { capLine: WORK_QUEUE_COPY.capLine(slots.live, slots.cap) } : {}),
    capReached: slots !== undefined && liveRuns >= cap,
    ...(slots && slots.waiting.length > 0
      ? { waitingLine: WORK_QUEUE_COPY.waitingLine(slots.waiting.length) }
      : {}),
  }
}

/**
 * Where moving `entry` one place up (`-1`) or down (`1`) puts it; `undefined`
 * past either end, or when its work is not queued. Pure.
 */
export function workQueueMoveIndex(
  entries: readonly WorkQueueEntry[],
  entry: WorkQueueEntry,
  by: 1 | -1,
): number | undefined {
  const key = workQueueEntryKey(entry)
  const from = entries.findIndex((queued) => workQueueEntryKey(queued) === key)
  if (from === -1) return undefined
  const to = from + by
  return to < 0 || to >= entries.length ? undefined : to
}
