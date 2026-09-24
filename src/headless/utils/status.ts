// Domain types + label tables for the six story / feature statuses recognised
// across the `thefactory-*` apps. Pure TS — no React, no DOM, no RN. Shared
// between web's `StatusControl` and native's `StatusControl` so consumers see
// the same vocabulary and ordering everywhere.
//
// The status VALUES come from the SDK (`thefactory-tools`), so this file can
// never drift from what the backend persists: plain words, migrated from the
// old `- ~ + ? =` symbols (a model forced to guess an undocumented symbol enum
// created brand-new features as Blocked).

import type { Status } from 'thefactory-tools/types'

export type StoryStatus = Status

// `review` is the blue palette of work that passed verification and waits for
// its sign-off: the stored `reviewable` status, and the story-level overlay of a
// pipeline parked at its sign-off gate (`processStatusOverlay`).
export type StatusSemanticKey = 'queued' | 'working' | 'done' | 'stuck' | 'onhold' | 'review'

export const STATUS_LABELS: Record<StoryStatus, string> = {
  done: 'Done',
  reviewable: 'Reviewable',
  in_progress: 'Crunching',
  pending: 'Pending',
  blocked: 'Blocked',
  deferred: 'Deferred',
}

export const STATUS_ORDER: StoryStatus[] = [
  'pending',
  'in_progress',
  'reviewable',
  'done',
  'deferred',
  'blocked',
]

// `in_progress` and `reviewable` belong to the process — its developer starting
// and its verification passing — so a person is never offered them.
export const SETTABLE_STATUS_ORDER: StoryStatus[] = STATUS_ORDER.filter(
  (s) => s !== 'in_progress' && s !== 'reviewable',
)

const SEMANTIC: Record<StoryStatus, StatusSemanticKey> = {
  pending: 'queued',
  in_progress: 'working',
  reviewable: 'review',
  done: 'done',
  blocked: 'stuck',
  deferred: 'onhold',
}

export function isStoryStatus(status: string): status is StoryStatus {
  return Object.prototype.hasOwnProperty.call(SEMANTIC, status)
}

export function statusKey(status: StoryStatus): StatusSemanticKey {
  return SEMANTIC[status]
}

export function statusLabel(status: StoryStatus | string): string {
  return (STATUS_LABELS as Record<string, string | undefined>)[status] ?? String(status || '')
}

/** Sentinels the picker can emit when the host opts in to extra filter rows. */
export type StatusPickerValue = StoryStatus | 'all' | 'not-done'
