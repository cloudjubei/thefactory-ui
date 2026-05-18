import { STATUS_LABELS, STATUS_ORDER, type StoryStatus } from './status'

// Shared sort / filter option constants for story and feature lists. Both
// web and native drive their pickers off the same source so labels stay in
// lock-step.

export type StoryListSorting = 'index_asc' | 'index_desc' | 'status_asc' | 'status_desc'

export const STORY_SORT_OPTIONS: ReadonlyArray<{ value: StoryListSorting; label: string }> = [
  { value: 'index_desc', label: 'Newest first' },
  { value: 'index_asc', label: 'Oldest first' },
  { value: 'status_asc', label: 'Status (todo→done)' },
  { value: 'status_desc', label: 'Status (done→todo)' },
]

export type FeatureListSorting = 'index_asc' | 'index_desc' | 'status_asc' | 'status_desc'

export const FEATURE_SORT_OPTIONS: ReadonlyArray<{ value: FeatureListSorting; label: string }> = [
  { value: 'index_asc', label: 'Oldest first' },
  { value: 'index_desc', label: 'Newest first' },
  { value: 'status_asc', label: 'Status (todo→done)' },
  { value: 'status_desc', label: 'Status (done→todo)' },
]

// Status options for filter / picker / column controls. Derived from
// `STATUS_ORDER` + `STATUS_LABELS` so a `<select>` and `StatusControl` render
// the same wording for the same value.
export const STATUS_OPTIONS: ReadonlyArray<{ value: StoryStatus; label: string }> =
  STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] }))
