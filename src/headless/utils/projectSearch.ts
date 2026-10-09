import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import type { FileSearchHit, RecordSearchHit, SearchHit, SearchRecord } from '../api'
import {
  PROJECT_SEARCH_EXCERPT_MAX_CHARS,
  PROJECT_SEARCH_GROUP_LABELS,
  PROJECT_SEARCH_MIN_QUERY_CHARS,
} from './projectSearchConstants'
import type {
  ProjectSearchFileRow,
  ProjectSearchGroup,
  ProjectSearchGroupKey,
  ProjectSearchRecordRow,
  ProjectSearchRow,
  ProjectSearchStatus,
  SearchRecordChip,
  SearchTextSegment,
} from './projectSearchTypes'

/** Whether a query has enough in it to search. */
export function isSearchableQuery(query: string): boolean {
  return query.trim().length >= PROJECT_SEARCH_MIN_QUERY_CHARS
}

/**
 * Where a search stands, from what is typed and the last search that answered (`undefined` while
 * none has) — see {@link ProjectSearchStatus}.
 */
export function projectSearchStatus(
  query: string,
  answered: { query: string; failed: boolean } | undefined,
): ProjectSearchStatus {
  const typed = query.trim()
  if (!typed) return 'idle'
  if (!isSearchableQuery(typed)) return 'short'
  if (answered?.query !== typed) return 'searching'
  return answered.failed ? 'error' : 'done'
}

/** The in-app link of the story, feature, note or group note a search hit names. */
export function searchRecordLink(record: SearchRecord): ResourceLink {
  switch (record.kind) {
    case 'story':
      return { kind: 'story', projectId: record.projectId, storyId: record.storyId }
    case 'feature':
      return {
        kind: 'feature',
        projectId: record.projectId,
        storyId: record.storyId,
        featureId: record.featureId,
      }
    case 'note':
      return { kind: 'note', projectId: record.projectId, noteId: record.noteId }
    case 'groupNote':
      return { kind: 'groupNote', groupId: record.groupId, noteId: record.noteId }
  }
}

/**
 * A record row's reference chip: as the project's references describe it, or — while they cannot
 * (not loaded yet, or behind the search) — by the title the search found it with.
 */
export function searchRecordChip(
  row: ProjectSearchRecordRow,
  described: ReferenceDescription | undefined,
): SearchRecordChip {
  const { title } = row.record
  const description =
    described && !described.missing
      ? described
      : { kind: row.record.kind, label: title, link: row.link }
  return description.label.includes(title) ? { description } : { description, title }
}

/** Where in a file a hit matched, as its row says it; undefined when the search did not say. */
export function fileHitLines(hit: FileSearchHit): string | undefined {
  if (hit.snippet) return `Line ${hit.snippet.line}`
  if (hit.startLine === undefined) return undefined
  if (hit.endLine === undefined || hit.endLine === hit.startLine) return `Line ${hit.startLine}`
  return `Lines ${hit.startLine}–${hit.endLine}`
}

/**
 * A project search's hits under their headings — files, stories, features, notes, group notes — each heading
 * in the order the search ranked its hits; a heading with none is left out.
 */
export function projectSearchGroups(
  hits: readonly SearchHit[],
  query: string,
): ProjectSearchGroup[] {
  const byKey = new Map<ProjectSearchGroupKey, ProjectSearchRow[]>()
  for (const hit of hits) {
    const row = 'path' in hit ? fileRow(hit) : recordRow(hit, query)
    const key: ProjectSearchGroupKey = row.kind === 'file' ? 'file' : row.record.kind
    byKey.set(key, [...(byKey.get(key) ?? []), row])
  }
  const order = Object.keys(PROJECT_SEARCH_GROUP_LABELS) as ProjectSearchGroupKey[]
  return order.flatMap((key) => {
    const rows = byKey.get(key)
    return rows ? [{ key, label: PROJECT_SEARCH_GROUP_LABELS[key], rows }] : []
  })
}

/** Every row of the results, top to bottom — what the keyboard moves through. */
export function projectSearchRows(groups: readonly ProjectSearchGroup[]): ProjectSearchRow[] {
  return groups.flatMap((g) => g.rows)
}

/** The row `delta` away from `cursor` among `count` rows, wrapping at either end; -1 with none. */
export function stepSearchCursor(cursor: number, count: number, delta: 1 | -1): number {
  if (count === 0) return -1
  if (cursor < 0 || cursor >= count) return delta > 0 ? 0 : count - 1
  return (cursor + delta + count) % count
}

/** The line above the results: how many matched, or that nothing did. */
export function projectSearchSummary(groups: readonly ProjectSearchGroup[], query: string): string {
  const shown = `“${query.trim()}”`
  const count = groups.reduce((n, g) => n + g.rows.length, 0)
  if (count === 0) return `Nothing in this project matches ${shown}.`
  return `${count} ${count === 1 ? 'result' : 'results'} for ${shown}`
}

/** A record's text as its row shows it: whitespace folded, a long text cut around the query. */
export function searchExcerpt(text: string, query: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const max = PROJECT_SEARCH_EXCERPT_MAX_CHARS
  if (flat.length <= max) return flat
  const at = firstMatch(flat, queryWords(query))
  const from = at > max / 3 ? Math.min(at - Math.floor(max / 3), flat.length - max) : 0
  const cut = flat.slice(from, from + max)
  return `${from > 0 ? '…' : ''}${cut}${from + max < flat.length ? '…' : ''}`
}

/** `text` in runs that do and do not match a word of the query, whatever its case. */
export function searchMatchSegments(text: string, query: string): SearchTextSegment[] {
  if (!text) return []
  const words = queryWords(query)
  const lower = text.toLowerCase()
  const marked = new Array<boolean>(text.length).fill(false)
  for (const word of words) {
    for (let at = lower.indexOf(word); at >= 0; at = lower.indexOf(word, at + 1)) {
      marked.fill(true, at, at + word.length)
    }
  }
  const segments: SearchTextSegment[] = []
  for (let i = 0; i < text.length; ) {
    let j = i
    while (j < text.length && marked[j] === marked[i]) j++
    segments.push({ text: text.slice(i, j), match: marked[i] })
    i = j
  }
  return segments
}

function fileRow(hit: FileSearchHit): ProjectSearchFileRow {
  const line = hit.snippet?.line ?? hit.startLine
  const lines = fileHitLines(hit)
  return {
    kind: 'file',
    key: `file:${hit.path}`,
    path: hit.path,
    ...(lines ? { lines } : {}),
    ...(hit.snippet ? { snippet: hit.snippet } : {}),
    target: { type: 'file', path: hit.path, ...(line !== undefined ? { line } : {}) },
  }
}

function recordRow(hit: RecordSearchHit, query: string): ProjectSearchRecordRow {
  const link = searchRecordLink(hit.record)
  const excerpt = hit.text ? searchExcerpt(hit.text, query) : ''
  return {
    kind: 'record',
    key: `record:${hit.reference}`,
    record: hit.record,
    link,
    ...('status' in hit.record ? { status: hit.record.status } : {}),
    ...(excerpt ? { excerpt } : {}),
    target: { type: 'resource', link },
  }
}

function queryWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

function firstMatch(text: string, words: readonly string[]): number {
  const lower = text.toLowerCase()
  const found = words.map((w) => lower.indexOf(w)).filter((i) => i >= 0)
  return found.length > 0 ? Math.min(...found) : -1
}
