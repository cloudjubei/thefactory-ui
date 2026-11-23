import { createTextRecoveryPatch } from 'thefactory-tools/utils'
import type { FilesChangedData } from '../api/generated'

/** The generated `FilesChangedData.origin`. Older sockets may omit it. */
export type FileChangeOrigin = FilesChangedData['origin']

export type PendingFileChange = (
  | { kind: 'clean' | 'conflict'; remote: string; hunks: number | null; conflicts: number | null }
  | { kind: 'deleted'; remote: null }
) & { origin?: FileChangeOrigin; renamedTo?: string }

export type PendingFileChangeActions = {
  onReviewAndMerge?: () => void
  onKeepMine?: () => void
  onTakeRemote?: () => void
  disabled?: boolean
}

export const FILE_CHANGE_ACTIONS = [
  { key: 'onReviewAndMerge', label: 'Review and merge', primary: true },
  { key: 'onKeepMine', label: 'Keep mine', detail: 'Discard remote changes' },
  { key: 'onTakeRemote', label: 'Take remote', detail: 'Discard your unsaved edits' },
] as const

export const DELETED_FILE_CHANGE_ACTIONS = [
  {
    key: 'onKeepMine',
    label: 'Recreate on save',
    detail: 'Keep mine and recreate the file when saving',
    primary: true,
  },
  {
    key: 'onTakeRemote',
    label: 'Discard mine',
    detail: 'Discard your unsaved edits',
  },
] as const

export function pendingFileChangeActions(change: PendingFileChange) {
  return change.kind === 'deleted' ? DELETED_FILE_CHANGE_ACTIONS : FILE_CHANGE_ACTIONS
}

function trimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

/** Read the socket payload at the boundary; older servers do not send origin. */
export function fileChangeOriginOf(data: unknown): FileChangeOrigin | undefined {
  if (!data || typeof data !== 'object' || !('origin' in data)) return
  const origin = data.origin
  if (!origin || typeof origin !== 'object' || !('kind' in origin)) return
  switch (origin.kind) {
    case 'agent': {
      const runId = 'runId' in origin ? trimmedString(origin.runId) : undefined
      if (!runId) return
      const chatContextId =
        'chatContextId' in origin ? trimmedString(origin.chatContextId) : undefined
      return chatContextId ? { kind: 'agent', runId, chatContextId } : { kind: 'agent', runId }
    }
    case 'chat': {
      const chatContextId =
        'chatContextId' in origin ? trimmedString(origin.chatContextId) : undefined
      return chatContextId ? { kind: 'chat', chatContextId } : undefined
    }
    case 'person':
    case 'git':
    case 'external':
      return { kind: origin.kind }
  }
}

export function pendingFileChangeSummary(change: PendingFileChange) {
  const { origin } = change
  const source = origin ? `Source: ${fileChangeOriginSource(origin)}` : undefined
  if (change.kind === 'deleted') {
    return {
      headline: change.renamedTo
        ? 'File renamed or moved remotely'
        : PENDING_FILE_CHANGE_LABEL.deleted,
      overlap: change.renamedTo
        ? `Moved to ${change.renamedTo}. Treated as a delete here and a new file at the new path.`
        : 'If it was renamed or moved, it is treated as a delete here and a new file at the new path.',
      source,
    }
  }
  const { hunks, conflicts } = change
  const overlap =
    conflicts === null
      ? 'Review required to check for conflicts'
      : `${conflicts} ${conflicts === 1 ? 'conflict' : 'conflicts'} with your edits`
  return {
    headline:
      hunks === null
        ? 'Changed remotely'
        : `${hunks} ${hunks === 1 ? 'hunk' : 'hunks'} changed remotely`,
    overlap: change.renamedTo ? `${overlap}. Moved to ${change.renamedTo}.` : overlap,
    source,
  }
}

function fileChangeOriginSource(origin: FileChangeOrigin): string {
  switch (origin.kind) {
    case 'agent':
      return origin.chatContextId
        ? `Agent run ${origin.runId} · chat ${origin.chatContextId}`
        : `Agent run ${origin.runId}`
    case 'chat':
      return 'Agent chat'
    case 'person':
      return 'A person'
    case 'git':
      return 'Git operation'
    case 'external':
      return 'External edit'
  }
}

export const PENDING_FILE_CHANGE_LABEL = {
  clean: 'Incoming edits can merge cleanly',
  conflict: 'Incoming edits overlap your changes',
  deleted: 'File deleted remotely',
} satisfies Record<PendingFileChange['kind'], string>

export const INCOMING_FILE_EDITS = 'Incoming edits from remote'

type Change = { start: number; end: number; added: string[] }

// Keep terminators with their lines, including CRLF and an unterminated EOF.
function lines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? []
}

/** Read only the changed runs of a unified diff (context is not an edit). */
function changes(base: string, text: string): Change[] {
  let line = -1
  let nextLine = 0
  const incoming = lines(text)
  let change: Change | undefined
  const out: Change[] = []
  for (const row of createTextRecoveryPatch('file', base, text).split('\n')) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(row)
    if (header) {
      line = Number(header[1]) - (header[2] === '0' ? 0 : 1)
      nextLine = Number(header[3]) - (header[4] === '0' ? 0 : 1)
      change = undefined
    } else if (line >= 0 && (row[0] === '+' || row[0] === '-')) {
      if (!change) {
        change = { start: line, end: line, added: [] }
        out.push(change)
      }
      if (row[0] === '-') change.end = ++line
      else change.added.push(incoming[nextLine++]!)
    } else if (line >= 0 && row[0] === ' ') {
      line++
      nextLine++
      change = undefined
    }
  }
  return out
}

function overlaps(a: Change, b: Change): boolean {
  if (a.start === b.start && a.end === b.end && a.added.join('') === b.added.join('')) {
    return false
  }
  if (a.start === b.start) return true
  if (joinsUnterminatedLine(a, b) || joinsUnterminatedLine(b, a)) return true
  return (
    Math.max(a.start, b.start) < Math.min(a.end, b.end) ||
    (a.start === a.end && b.start < a.start && a.start < b.end) ||
    (b.start === b.end && a.start < b.start && b.start < a.end)
  )
}

// Removing the final newline and appending after it are not independent edits.
function joinsUnterminatedLine(left: Change, right: Change): boolean {
  const last = left.added.at(-1)
  return right.start === left.end && right.start === right.end && !!last && !last.endsWith('\n')
}

function exceedsDiffBudget(...texts: string[]): boolean {
  return texts.some((text) => text.length > 200_000 || text.split('\n', 2_001).length > 2_000)
}

export type FileMergeSegment =
  | { type: 'text'; text: string }
  | { type: 'conflict'; ours: string; theirs: string }

/** Merge against the last accepted disk base, never against the currently displayed draft.
 * Keep conflicts structured so literal marker lines and exact file bytes survive. */
export function mergeFileText(base: string, ours: string, theirs: string): FileMergeSegment[] {
  if (ours === theirs || theirs === base) return [{ type: 'text', text: ours }]
  if (ours === base) return [{ type: 'text', text: theirs }]
  // For large buffers show both complete versions as one unresolved choice.
  if (exceedsDiffBudget(base, ours, theirs)) return [{ type: 'conflict', ours, theirs }]

  const original = lines(base)
  const edits = [
    ...changes(base, ours).map((edit) => ({ ...edit, side: 'ours' as const })),
    ...changes(base, theirs).map((edit) => ({ ...edit, side: 'theirs' as const })),
  ].sort((a, b) => a.start - b.start)
  const result: FileMergeSegment[] = []
  const append = (text: string) => {
    if (!text) return
    const last = result.at(-1)
    if (last?.type === 'text') last.text += text
    else result.push({ type: 'text', text })
  }
  let cursor = 0
  for (let i = 0; i < edits.length; ) {
    const first = edits[i]!
    const { start } = first
    let end = first.end
    let j = i + 1
    // Group transitive overlaps. An insertion at the end of a changed
    // range is adjacent unless the replacement removed its line break.
    while (j < edits.length) {
      const edit = edits[j]!
      if (
        edit.start !== start &&
        edit.start >= end &&
        !edits.slice(i, j).some((prior) => joinsUnterminatedLine(prior, edit))
      ) {
        break
      }
      end = Math.max(end, edit.end)
      j++
    }
    const group = edits.slice(i, j)
    const project = (side: 'ours' | 'theirs') => {
      const output: string[] = []
      let pos = start
      for (const edit of group) {
        if (edit.side !== side) continue
        output.push(...original.slice(pos, edit.start), ...edit.added)
        pos = edit.end
      }
      return output.concat(original.slice(pos, end)).join('')
    }
    const current = project('ours')
    const incoming = project('theirs')
    append(original.slice(cursor, start).join(''))
    if (!group.some((edit) => edit.side === 'ours')) append(incoming)
    else if (!group.some((edit) => edit.side === 'theirs') || current === incoming) append(current)
    else result.push({ type: 'conflict', ours: current, theirs: incoming })
    cursor = end
    i = j
  }
  append(original.slice(cursor).join(''))
  return result
}

export function classifyPendingFileChange(
  base: string,
  draft: string,
  remote: string | null,
): PendingFileChange {
  if (remote === null) return { kind: 'deleted', remote }
  // Bound synchronous diff work on large editor buffers. Unclassified edits
  // require review rather than claiming they can be merged safely.
  if (exceedsDiffBudget(base, draft, remote)) {
    return { kind: draft === remote ? 'clean' : 'conflict', remote, hunks: null, conflicts: null }
  }
  const remoteChanges = changes(base, remote)
  const localChanges = draft === remote ? [] : changes(base, draft)
  const conflicts = remoteChanges.filter((r) => localChanges.some((l) => overlaps(l, r))).length
  return {
    kind: conflicts ? 'conflict' : 'clean',
    remote,
    hunks: remoteChanges.length,
    conflicts,
  }
}

/** Missing path information means a legacy, project-wide invalidation. */
export function fileChangeConcernsPath(data: unknown, path: string): boolean {
  if (!data || typeof data !== 'object') return true
  const event = data as {
    path?: string
    paths?: string[]
    moves?: { src: string; dst: string }[]
    queries?: { path: string }[]
  }
  const paths = [
    ...(event.path ? [event.path] : []),
    ...(Array.isArray(event.paths) ? event.paths : []),
    ...(Array.isArray(event.moves) ? event.moves.flatMap(({ src, dst }) => [src, dst]) : []),
    ...(Array.isArray(event.queries) ? event.queries.map((query) => query.path) : []),
  ]
  return paths.length === 0 || paths.includes(path)
}

/** Extract a remote rename/move destination for `path` when `files:changed` names moves. */
export function fileChangeRenamedTo(data: unknown, path: string): string | undefined {
  if (!data || typeof data !== 'object' || !('moves' in data) || !Array.isArray(data.moves)) {
    return undefined
  }
  for (const move of data.moves) {
    if (
      move &&
      typeof move === 'object' &&
      'src' in move &&
      'dst' in move &&
      move.src === path &&
      typeof move.dst === 'string' &&
      move.dst.trim() &&
      move.dst !== path
    ) {
      return move.dst
    }
  }
  return undefined
}

export function fileChangeDeletedPath(data: unknown, path: string): boolean {
  if (!data || typeof data !== 'object') return false
  const event = data as { action?: unknown; paths?: unknown }
  return event.action === 'deleted' && Array.isArray(event.paths) && event.paths.includes(path)
}
