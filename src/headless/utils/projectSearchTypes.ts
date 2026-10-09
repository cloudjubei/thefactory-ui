import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import type { FileSearchSnippet, SearchRecord, Status } from '../api'

/** A kind of result a project search lists under its own heading. */
export type ProjectSearchGroupKey = 'file' | SearchRecord['kind']

/** Where a result opens: a story, feature or note by its link; a file at a line. */
export type ProjectSearchTarget =
  | { type: 'resource'; link: ResourceLink }
  | { type: 'file'; path: string; line?: number }

/** A file the search found, as its row shows it. */
export type ProjectSearchFileRow = {
  kind: 'file'
  key: string
  path: string
  /** Where in the file it matched — "Line 3", "Lines 40–58" — when the search said. */
  lines?: string
  snippet?: FileSearchSnippet
  target: ProjectSearchTarget
}

/** A story, feature or note the search found, as its row shows it. */
export type ProjectSearchRecordRow = {
  kind: 'record'
  key: string
  record: SearchRecord
  /** The link its reference chip is described by and opens. */
  link: ResourceLink
  status?: Status
  /** The part of its text around the first word of the query. */
  excerpt?: string
  target: ProjectSearchTarget
}

export type ProjectSearchRow = ProjectSearchFileRow | ProjectSearchRecordRow

/** One heading of the results: its rows in the order the search ranked them. */
export type ProjectSearchGroup = {
  key: ProjectSearchGroupKey
  label: string
  rows: ProjectSearchRow[]
}

/** A run of text that does or does not match a word of the query, for highlighting. */
export type SearchTextSegment = { text: string; match: boolean }

/**
 * Where a project search stands: `idle` with nothing typed, `short` with too little to search,
 * `searching` while a search is out (the last results stay shown), then `done` or `error`.
 */
export type ProjectSearchStatus = 'idle' | 'short' | 'searching' | 'done' | 'error'

/** A record row's reference chip, and its title when the chip does not already name it. */
export type SearchRecordChip = { description: ReferenceDescription; title?: string }
