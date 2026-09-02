// Domain types + label tables for the five story / feature statuses recognised
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

export type StatusSemanticKey = 'queued' | 'working' | 'done' | 'stuck' | 'onhold'

export const STATUS_LABELS: Record<StoryStatus, string> = {
  done: 'Done',
  in_progress: 'Crunching',
  pending: 'Pending',
  blocked: 'Blocked',
  deferred: 'Deferred',
}

export const STATUS_ORDER: StoryStatus[] = ['pending', 'in_progress', 'done', 'deferred', 'blocked']

const SEMANTIC: Record<StoryStatus, StatusSemanticKey> = {
  pending: 'queued',
  in_progress: 'working',
  done: 'done',
  blocked: 'stuck',
  deferred: 'onhold',
}

export function statusKey(status: StoryStatus): StatusSemanticKey {
  return SEMANTIC[status]
}

export function statusLabel(status: StoryStatus | string): string {
  return (STATUS_LABELS as Record<string, string | undefined>)[status] ?? String(status || '')
}

/** Sentinels the picker can emit when the host opts in to extra filter rows. */
export type StatusPickerValue = StoryStatus | 'all' | 'not-done'
