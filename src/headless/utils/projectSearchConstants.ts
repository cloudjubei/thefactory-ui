import type { ProjectSearchGroupKey } from './projectSearchTypes'

/** How long typing must pause before the search runs. */
export const PROJECT_SEARCH_DEBOUNCE_MS = 250

/** The fewest characters a query is searched with. */
export const PROJECT_SEARCH_MIN_QUERY_CHARS = 2

/** The most of a story's, feature's or note's text a result shows. */
export const PROJECT_SEARCH_EXCERPT_MAX_CHARS = 180

/** The query parameter the Search tab keeps its query in, so a link (or Back) reopens it. */
export const PROJECT_SEARCH_QUERY_PARAM = 'q'

/** The headings results are listed under, in this order. */
export const PROJECT_SEARCH_GROUP_LABELS: Record<ProjectSearchGroupKey, string> = {
  file: 'Files',
  story: 'Stories',
  feature: 'Features',
  note: 'Notes',
  groupNote: 'Group notes',
}

/** The words the Search tab shows, the same on every client. */
export const PROJECT_SEARCH_TEXT = {
  title: 'Search',
  placeholder: 'Search files, stories, features and notes',
  idle: 'Find anything in this project — a file and the lines that match, a story, a feature or a note.',
  short: `Type at least ${PROJECT_SEARCH_MIN_QUERY_CHARS} characters to search.`,
  searching: 'Searching…',
  failed: 'The search failed.',
  retry: 'Try again',
  clear: 'Clear search',
  noProject: 'Pick a project to search it.',
} as const
