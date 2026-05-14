import type { StoryStatus } from './StoryCard'
import { STATUS_LABELS, STATUS_ORDER } from './StatusControl'

/**
 * Shared sort / filter option constants for story and feature lists. Both
 * web and desktop drive their `<Select>` controls off the same source so the
 * label strings and value identifiers stay in lock-step.
 */

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

/**
 * Status options for filter / picker / column controls. Derived from
 * `STATUS_ORDER` + `STATUS_LABELS` so there's a single source of truth for
 * status names across the entire app — a `<select>` and the `StatusControl`
 * pill render the same wording for the same value.
 */
export const STATUS_OPTIONS: ReadonlyArray<{ value: StoryStatus; label: string }> =
  STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] }))
