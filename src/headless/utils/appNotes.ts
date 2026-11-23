import type { AppDeepLink } from './appDeepLink'
import { APP_NOTE_ID_PREFIX, APP_NOTE_TEXT } from './appNotesConstants'
import type { AppElementPick, AppNote, AppNoteElementTarget } from './appNotesTypes'
import { keptAttachmentPath } from './screenshotAnnotation'

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/** Ignore malformed notifications rather than forwarding app-controlled HTML to a renderer. */
export function parseAppElementPick(raw: unknown): AppElementPick | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (
    typeof value.selector !== 'string' ||
    !value.selector.trim() ||
    value.selector.length > 4096 ||
    typeof value.outerHtml !== 'string' ||
    !value.outerHtml.trim()
  )
    return null
  const pick: AppElementPick = {
    selector: value.selector,
    outerHtml: value.outerHtml.slice(0, 20_000),
  }
  if (value.rect && typeof value.rect === 'object') {
    const r = value.rect as Record<string, unknown>
    if (
      finite(r.x) &&
      finite(r.y) &&
      finite(r.width) &&
      r.width > 0 &&
      finite(r.height) &&
      r.height > 0
    )
      pick.rect = { x: r.x, y: r.y, width: r.width, height: r.height }
  }
  return pick
}

/**
 * The next `app-note-N` that is not already on this composer. Chips edit and
 * remove by id, so a new note that reuses one changes the other.
 */
export function nextAppNoteId(taken: Iterable<string>): string {
  const used = new Set(taken)
  let n = 0
  let id = ''
  do {
    n += 1
    id = `${APP_NOTE_ID_PREFIX}${n}`
  } while (used.has(id))
  return id
}

/** A picked element as one note with one element target, on the App view it was picked in. */
export function appNoteOfPick(
  id: string,
  projectId: string,
  pick: AppElementPick,
  deepLink?: AppDeepLink | null,
): AppNote {
  const target: AppNoteElementTarget = {
    kind: 'element',
    selector: pick.selector,
    outerHtml: pick.outerHtml,
    ...(pick.rect ? { rect: { ...pick.rect, space: 'app-viewport' as const } } : {}),
  }
  return {
    id,
    projectId,
    ...(deepLink ? { view: deepLink.view, params: deepLink.params } : {}),
    comment: '',
    targets: [target],
  }
}

/** A note's line: each element's selector and each area's size, in order. */
export function appNoteLabel(note: AppNote): string {
  return note.targets
    .map((target) =>
      target.kind === 'element'
        ? target.selector
        : APP_NOTE_TEXT.area(Math.round(target.rect.width), Math.round(target.rect.height)),
    )
    .join(', ')
}

/** The captured markup of a note's elements, shown as text only. */
export function appNoteMarkup(note: AppNote): string {
  return note.targets
    .flatMap((target) => (target.kind === 'element' ? [target.outerHtml] : []))
    .join('\n')
}

const plain = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const strings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined

const stringRecord = (value: unknown): Record<string, string> | undefined => {
  const record = plain(value)
  if (!record) return undefined
  const entries = Object.entries(record)
  if (!entries.every(([, item]) => typeof item === 'string')) return undefined
  return Object.fromEntries(entries) as Record<string, string>
}

function viewportRect(value: unknown): AppNoteElementTarget['rect'] | null {
  const rect = plain(value)
  if (!rect || rect.space !== 'app-viewport') return null
  if (!finite(rect.x) || !finite(rect.y) || !finite(rect.width) || !finite(rect.height)) return null
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    space: 'app-viewport',
  }
}

function detailsOf(value: unknown): AppNoteElementTarget['details'] | undefined {
  const record = plain(value)
  if (!record) return undefined
  const details: NonNullable<AppNoteElementTarget['details']> = {}
  if (typeof record.tag === 'string') details.tag = record.tag
  if (typeof record.id === 'string') details.id = record.id
  if (typeof record.text === 'string') details.text = record.text
  const classes = strings(record.classes)
  if (classes) details.classes = classes
  const styles = stringRecord(record.styles)
  if (styles && Object.keys(styles).length > 0) details.styles = styles
  const component = plain(record.component)
  if (component && typeof component.name === 'string' && component.name) {
    const stack = strings(component.stack)
    details.component = stack ? { name: component.name, stack } : { name: component.name }
  }
  return Object.keys(details).length > 0 ? details : undefined
}

function targetOf(value: unknown): AppNote['targets'][number] | null {
  const record = plain(value)
  if (!record) return null
  if (record.kind === 'area') {
    const rect = viewportRect(record.rect)
    return rect ? { kind: 'area', rect } : null
  }
  if (
    record.kind !== 'element' ||
    typeof record.selector !== 'string' ||
    !record.selector.trim() ||
    typeof record.outerHtml !== 'string'
  )
    return null
  if (record.rect !== undefined && !viewportRect(record.rect)) return null
  const rect = record.rect === undefined ? undefined : viewportRect(record.rect)
  const details = record.details === undefined ? undefined : detailsOf(record.details)
  const target: AppNoteElementTarget = {
    kind: 'element',
    selector: record.selector,
    outerHtml: record.outerHtml,
    ...(rect ? { rect } : {}),
    ...(details ? { details } : {}),
  }
  return target
}

function appNoteOfStored(value: unknown): AppNote | null {
  const record = plain(value)
  if (!record) return null
  if (typeof record.id !== 'string' || !record.id) return null
  if (typeof record.projectId !== 'string' || !record.projectId) return null
  if (typeof record.comment !== 'string') return null
  if (!Array.isArray(record.targets) || record.targets.length === 0) return null
  const targets: AppNote['targets'] = []
  for (const target of record.targets) {
    const parsed = targetOf(target)
    if (!parsed) return null
    targets.push(parsed)
  }
  const note: AppNote = {
    id: record.id,
    projectId: record.projectId,
    comment: record.comment,
    targets,
  }
  if (typeof record.view === 'string') note.view = record.view
  if (record.params !== undefined) {
    const params = stringRecord(record.params)
    if (!params) return null
    note.params = params
  }
  if (record.screenshotFile !== undefined) {
    if (typeof record.screenshotFile !== 'string') return null
    const kept = keptAttachmentPath(record.screenshotFile)
    if (!kept) return null
    note.screenshotFile = kept
  }
  return note
}

/** Notes read back from a stored draft. A note that is not one is dropped, and so is a data URL. */
export function appNotesOf(value: unknown): AppNote[] {
  if (!Array.isArray(value)) return []
  const notes: AppNote[] = []
  for (const entry of value) {
    const note = appNoteOfStored(entry)
    if (note) notes.push(note)
  }
  return notes
}

/**
 * Notes as a message carries them. A screenshot that is not a kept attachment path is left off
 * the note, so a local URI or a data URL never rides on the send.
 */
export function appNotesToSend(notes: readonly AppNote[]): AppNote[] {
  return notes.map((note) => {
    if (!note.screenshotFile || keptAttachmentPath(note.screenshotFile)) return note
    const rest = { ...note }
    delete rest.screenshotFile
    return rest
  })
}

/** Two lists of notes as one: the first's, then notes of the second whose ids it does not hold. */
export function mergeAppNotes(
  first: readonly AppNote[] | undefined,
  second: readonly AppNote[] | undefined,
): AppNote[] {
  const kept = [...(first ?? [])]
  const ids = new Set(kept.map((note) => note.id))
  for (const note of second ?? []) {
    if (!ids.has(note.id)) kept.push(note)
  }
  return kept
}
