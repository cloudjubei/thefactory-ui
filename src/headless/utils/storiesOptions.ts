import { STATUS_LABELS, STATUS_ORDER, type StatusPickerValue, type StoryStatus } from './status'

// Shared sort / filter option constants and operations for story and feature
// lists. Both web and native drive their pickers and list filtering off the
// same source so labels and behavior stay in lock-step.

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

// --- List filtering + sorting -------------------------------------------
// Pure operations shared by web's `StoriesListView` / `StoryDetailsView` and
// their native peers, so the two clients filter and sort identically.

/** Minimal shape `filterStories` / `sortStories` need from a story. */
interface StoryListItem {
  id: string
  title?: string | null
  description?: string | null
  status: string
  features?: ReadonlyArray<{ rejection?: string | null }> | null
}

/** Minimal shape `filterFeatures` / `sortFeatures` need from a feature. */
interface FeatureListItem {
  id: string
  title?: string | null
  description?: string | null
  status: string
  rejection?: string | null
}

/** True when any of the story's features carries a rejection reason. */
export function storyHasRejectedFeatures(story: {
  features?: ReadonlyArray<{ rejection?: string | null }> | null
}): boolean {
  return !!story.features?.some((f) => !!f.rejection)
}

function matchesQuery(
  index: number | undefined,
  title: string | null | undefined,
  description: string | null | undefined,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const idxStr = index != null ? String(index) : ''
  return (
    idxStr.includes(q) ||
    !!title?.toLowerCase().includes(q) ||
    !!description?.toLowerCase().includes(q)
  )
}

export interface StoryFilterOptions {
  /** Free-text search over display index, title and description. */
  query?: string
  /** `'all'`, `'not-done'`, or an exact `StoryStatus`. */
  statusFilter?: StatusPickerValue
  displayIndexOf?: (id: string) => number | undefined
}

/**
 * Filter stories by status + text query. `'not-done'` keeps anything that is
 * not Done, plus Done stories that still carry a rejected feature.
 */
export function filterStories<T extends StoryListItem>(
  stories: readonly T[],
  options: StoryFilterOptions = {},
): T[] {
  const { query = '', statusFilter = 'all', displayIndexOf } = options
  return stories.filter((s) => {
    const byStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'not-done'
          ? s.status !== 'done' || storyHasRejectedFeatures(s)
          : s.status === statusFilter
    return byStatus && matchesQuery(displayIndexOf?.(s.id), s.title, s.description, query)
  })
}

export interface StorySortOptions {
  sortBy?: StoryListSorting
  displayIndexOf?: (id: string) => number | undefined
}

/** Sort a copy of `stories`; status sorts tie-break on display index. */
export function sortStories<T extends StoryListItem>(
  stories: readonly T[],
  options: StorySortOptions = {},
): T[] {
  const { sortBy = 'index_asc', displayIndexOf } = options
  const idx = (s: T) => displayIndexOf?.(s.id) ?? 0
  const rank = (s: T) => STATUS_ORDER.indexOf(s.status as StoryStatus)
  const out = [...stories]
  switch (sortBy) {
    case 'index_desc':
      return out.sort((a, b) => idx(b) - idx(a))
    case 'status_asc':
      return out.sort((a, b) => rank(a) - rank(b) || idx(a) - idx(b))
    case 'status_desc':
      return out.sort((a, b) => rank(b) - rank(a) || idx(b) - idx(a))
    case 'index_asc':
    default:
      return out.sort((a, b) => idx(a) - idx(b))
  }
}

export interface FeatureFilterOptions {
  query?: string
  statusFilter?: StatusPickerValue
  displayIndexOf?: (id: string) => number | undefined
}

/**
 * Filter features by status + text query. `'not-done'` keeps anything that is
 * not Done, plus Done features that still carry a rejection reason.
 */
export function filterFeatures<T extends FeatureListItem>(
  features: readonly T[],
  options: FeatureFilterOptions = {},
): T[] {
  const { query = '', statusFilter = 'all', displayIndexOf } = options
  return features.filter((f) => {
    const byStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'not-done'
          ? f.status !== 'done' || !!f.rejection
          : f.status === statusFilter
    return byStatus && matchesQuery(displayIndexOf?.(f.id), f.title, f.description, query)
  })
}

export interface FeatureSortOptions {
  sortBy?: FeatureListSorting
  displayIndexOf?: (id: string) => number | undefined
}

/**
 * Sort a copy of `features`. Feature display index is positional, so
 * `index_asc` keeps input order and `index_desc` reverses it; status sorts
 * tie-break on display index.
 */
export function sortFeatures<T extends FeatureListItem>(
  features: readonly T[],
  options: FeatureSortOptions = {},
): T[] {
  const { sortBy = 'index_asc', displayIndexOf } = options
  const idx = (f: T) => displayIndexOf?.(f.id) ?? 0
  const rank = (f: T) => STATUS_ORDER.indexOf(f.status as StoryStatus)
  switch (sortBy) {
    case 'index_desc':
      return [...features].reverse()
    case 'status_asc':
      return [...features].sort((a, b) => rank(a) - rank(b) || idx(a) - idx(b))
    case 'status_desc':
      return [...features].sort((a, b) => rank(b) - rank(a) || idx(b) - idx(a))
    case 'index_asc':
    default:
      return [...features]
  }
}
