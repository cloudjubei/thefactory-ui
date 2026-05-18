// Domain types + label tables for the five story / feature statuses recognised
// across the `thefactory-*` apps. Pure TS — no React, no DOM, no RN. Shared
// between web's `StatusControl` and native's `StatusControl` so consumers see
// the same vocabulary and ordering everywhere.

export type StoryStatus = '+' | '-' | '~' | '?' | '='

export type StatusSemanticKey = 'queued' | 'working' | 'done' | 'stuck' | 'onhold'

export const STATUS_LABELS: Record<StoryStatus, string> = {
  '+': 'Done',
  '~': 'Crunching',
  '-': 'Pending',
  '?': 'Blocked',
  '=': 'Deferred',
}

export const STATUS_ORDER: StoryStatus[] = ['-', '~', '+', '=', '?']

const SEMANTIC: Record<StoryStatus, StatusSemanticKey> = {
  '-': 'queued',
  '~': 'working',
  '+': 'done',
  '?': 'stuck',
  '=': 'onhold',
}

export function statusKey(status: StoryStatus): StatusSemanticKey {
  return SEMANTIC[status]
}

export function statusLabel(status: StoryStatus | string): string {
  return (STATUS_LABELS as Record<string, string | undefined>)[status] ?? String(status || '')
}

/** Sentinels the picker can emit when the host opts in to extra filter rows. */
export type StatusPickerValue = StoryStatus | 'all' | 'not-done'
